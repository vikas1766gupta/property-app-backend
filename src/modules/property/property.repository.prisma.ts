import { Prisma, PrismaClient, Property as PrismaProperty, PropertyImage } from "@prisma/client";
import { IPropertyRepository } from "./property.repository.interface";
import { PropertyEntity, CreatePropertyInput, PropertySearchFilters, ListingStatus, UpdatePropertyInput } from "./property.entity";
import { NotFoundError } from "@common/errors/AppError";

type PrismaPropertyWithImages = PrismaProperty & { images: PropertyImage[] };

/**
 * Postgres/Prisma implementation of IPropertyRepository.
 * This is the ONLY class in the property module allowed to import from
 * "@prisma/client" or write Prisma queries — everything above the repository
 * layer talks only to the interface + PropertyEntity.
 */
export class PropertyRepositoryPrisma implements IPropertyRepository {
  constructor(private readonly prisma: PrismaClient) {}

  private toEntity(row: PrismaPropertyWithImages): PropertyEntity {
    return new PropertyEntity(
      row.id,
      row.businessId,
      row.listingType,
      row.title,
      row.description,
      Number(row.price),
      row.currency,
      row.status,
      row.city,
      row.state,
      row.country,
      row.addressLine,
      row.bedrooms,
      row.bathrooms,
      row.areaSqft,
      row.furnishingStatus,
      row.amenities,
      row.images.sort((a, b) => a.sortOrder - b.sortOrder).map((i) => i.url),
      row.isFreeListing,
      row.createdAt,
      row.latitude,
      row.longitude
    );
  }

  async create(input: CreatePropertyInput): Promise<PropertyEntity> {
    const row = await this.prisma.property.create({
      data: {
        businessId: input.businessId,
        listingType: input.listingType,
        title: input.title,
        description: input.description,
        price: input.price,
        currency: input.currency ?? "INR",
        addressLine: input.addressLine,
        city: input.city,
        state: input.state,
        country: input.country,
        latitude: input.latitude,
        longitude: input.longitude,
        bedrooms: input.bedrooms,
        bathrooms: input.bathrooms,
        areaSqft: input.areaSqft,
        furnishingStatus: input.furnishingStatus,
        amenities: input.amenities ?? [],
        images: input.imageUrls
          ? { create: input.imageUrls.map((url, i) => ({ url, sortOrder: i })) }
          : undefined,
      },
      include: { images: true },
    });
    return this.toEntity(row);
  }

  async findById(id: string): Promise<PropertyEntity | null> {
    const row = await this.prisma.property.findUnique({ where: { id }, include: { images: true } });
    return row ? this.toEntity(row) : null;
  }

  async search(filters: PropertySearchFilters): Promise<{ items: PropertyEntity[]; total: number }> {
    const page = filters.page ?? 1;
    const pageSize = Math.min(filters.pageSize ?? 20, 50);

    const where = {
      status: "PUBLISHED" as const,
      ...(filters.city ? { city: { equals: filters.city, mode: "insensitive" as const } } : {}),
      ...(filters.listingType ? { listingType: filters.listingType } : {}),
      ...(filters.minBedrooms ? { bedrooms: { gte: filters.minBedrooms } } : {}),
      ...(filters.amenities?.length ? { amenities: { hasEvery: filters.amenities } } : {}),
      ...(filters.minPrice || filters.maxPrice
        ? {
            price: {
              ...(filters.minPrice ? { gte: filters.minPrice } : {}),
              ...(filters.maxPrice ? { lte: filters.maxPrice } : {}),
            },
          }
        : {}),
    };

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.property.findMany({
        where,
        include: { images: true },
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { publishedAt: "desc" },
      }),
      this.prisma.property.count({ where }),
    ]);

    return { items: rows.map((r) => this.toEntity(r)), total };
  }

  async update(id: string, patch: UpdatePropertyInput): Promise<PropertyEntity> {
    const { imageUrls, ...propertyData } = patch;
    try {
      const row = await this.prisma.$transaction(async (transaction) => {
        await transaction.property.update({ where: { id }, data: propertyData });

        if (imageUrls !== undefined) {
          await transaction.propertyImage.deleteMany({ where: { propertyId: id } });
          if (imageUrls.length > 0) {
            await transaction.propertyImage.createMany({
              data: imageUrls.map((url, sortOrder) => ({ propertyId: id, url, sortOrder })),
            });
          }
        }

        return transaction.property.findUniqueOrThrow({ where: { id }, include: { images: true } });
      });
      return this.toEntity(row);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
        throw new NotFoundError("Property not found");
      }
      throw error;
    }
  }

  async updateStatus(id: string, status: ListingStatus): Promise<PropertyEntity> {
    const row = await this.prisma.property.update({
      where: { id },
      data: { status, publishedAt: status === "PUBLISHED" ? new Date() : undefined },
      include: { images: true },
    });
    return this.toEntity(row);
  }

  async delete(id: string): Promise<void> {
    await this.prisma.property.delete({ where: { id } });
  }

  async countByBusiness(businessId: string): Promise<number> {
    return this.prisma.property.count({ where: { businessId, status: { not: "REMOVED" } } });
  }

  async listByBusiness(businessId: string): Promise<PropertyEntity[]> {
    const rows = await this.prisma.property.findMany({
      where: { businessId },
      include: { images: true },
      orderBy: { createdAt: "desc" },
    });
    return rows.map((r) => this.toEntity(r));
  }
}
