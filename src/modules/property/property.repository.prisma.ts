import { Prisma, PrismaClient, Property as PrismaProperty, PropertyImage } from "@prisma/client";
import { IPropertyRepository } from "./property.repository.interface";
import { PropertyEntity, CreatePropertyInput, PropertyImageReference, PropertySearchFilters, ListingStatus, UpdatePropertyInput } from "./property.entity";
import { ForbiddenError, NotFoundError } from "@common/errors/AppError";
import { matchesPropertySearch } from "./property-search.match";

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
    const images = row.images.sort((a, b) => a.sortOrder - b.sortOrder);
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
      images.map((image) => image.url),
      row.isFreeListing,
      row.createdAt,
      row.latitude,
      row.longitude,
      images.map((image) => ({ id: image.id, url: image.url, sortOrder: image.sortOrder, isCover: image.isCover }))
    );
  }

  async create(input: CreatePropertyInput): Promise<PropertyEntity> {
    const { imageRefs, ...propertyData } = input;
    const row = await this.prisma.$transaction(async (transaction) => {
      const property = await transaction.property.create({
        data: { ...propertyData, currency: input.currency ?? "INR", amenities: input.amenities ?? [] },
      });
      if (imageRefs?.length) await this.attachImages(transaction, property.id, input.businessId, imageRefs);
      return transaction.property.findUniqueOrThrow({ where: { id: property.id }, include: { images: true } });
    });
    return this.toEntity(row);
  }

  async createImageUpload(input: { businessId: string; publicId: string; url: string }): Promise<PropertyImageReference> {
    const image = await this.prisma.propertyImage.create({
      data: { ...input, propertyId: null, isCover: false, sortOrder: 0 },
    });
    return { id: image.id, url: image.url, sortOrder: image.sortOrder, isCover: image.isCover };
  }

  private async attachImages(
    transaction: Prisma.TransactionClient,
    propertyId: string,
    businessId: string,
    imageRefs: NonNullable<CreatePropertyInput["imageRefs"]>
  ): Promise<void> {
    for (const [sortOrder, image] of imageRefs.entries()) {
      const attached = await transaction.propertyImage.updateMany({
        where: { id: image.id, businessId, OR: [{ propertyId: null }, { propertyId }] },
        data: { propertyId, sortOrder, isCover: image.isCover },
      });
      if (attached.count !== 1) throw new ForbiddenError("An image reference does not belong to this business or listing");
    }
  }

  async findById(id: string): Promise<PropertyEntity | null> {
    const row = await this.prisma.property.findUnique({ where: { id }, include: { images: true } });
    return row ? this.toEntity(row) : null;
  }

  async search(filters: PropertySearchFilters): Promise<{ items: PropertyEntity[]; total: number }> {
    const page = filters.page ?? 1;
    const pageSize = Math.min(filters.pageSize ?? 20, 50);

    const where: Prisma.PropertyWhereInput = {
      status: "PUBLISHED" as const,
      ...(filters.city ? { city: { equals: filters.city, mode: "insensitive" as const } } : {}),
      ...(filters.listingType ? { listingType: filters.listingType } : {}),
      ...(filters.minBedrooms !== undefined ? { bedrooms: { gte: filters.minBedrooms } } : {}),
      ...(filters.amenities?.length ? { amenities: { hasEvery: filters.amenities } } : {}),
      ...(filters.minPrice !== undefined || filters.maxPrice !== undefined
        ? {
            price: {
              ...(filters.minPrice !== undefined ? { gte: filters.minPrice } : {}),
              ...(filters.maxPrice !== undefined ? { lte: filters.maxPrice } : {}),
            },
          }
        : {}),
    };

    if (filters.radiusKm !== undefined && filters.latitude !== undefined && filters.longitude !== undefined) {
      const latitudeDelta = filters.radiusKm / 110.574;
      const longitudeDelta = Math.min(180, filters.radiusKm / (111.32 * Math.max(Math.abs(Math.cos(filters.latitude * Math.PI / 180)), 0.01)));
      const minLongitude = filters.longitude - longitudeDelta;
      const maxLongitude = filters.longitude + longitudeDelta;
      where.latitude = { gte: Math.max(-90, filters.latitude - latitudeDelta), lte: Math.min(90, filters.latitude + latitudeDelta) };

      if (minLongitude < -180) {
        where.OR = [{ longitude: { gte: minLongitude + 360 } }, { longitude: { lte: maxLongitude } }];
      } else if (maxLongitude > 180) {
        where.OR = [{ longitude: { gte: minLongitude } }, { longitude: { lte: maxLongitude - 360 } }];
      } else {
        where.longitude = { gte: minLongitude, lte: maxLongitude };
      }
    }

    if (filters.radiusKm !== undefined) {
      const candidates = await this.prisma.property.findMany({
        where,
        include: { images: true },
        orderBy: { publishedAt: "desc" },
      });
      const matching = candidates.map((row) => this.toEntity(row)).filter((property) => matchesPropertySearch(property, filters));
      const offset = (page - 1) * pageSize;
      return { items: matching.slice(offset, offset + pageSize), total: matching.length };
    }

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

  async update(id: string, businessId: string, patch: UpdatePropertyInput): Promise<PropertyEntity> {
    const { imageRefs, ...propertyData } = patch;
    try {
      const row = await this.prisma.$transaction(async (transaction) => {
        await transaction.property.update({ where: { id }, data: propertyData });

        if (imageRefs !== undefined) {
          await transaction.propertyImage.updateMany({
            where: { propertyId: id },
            data: { propertyId: null, sortOrder: 0, isCover: false },
          });
          if (imageRefs.length > 0) {
            await this.attachImages(transaction, id, businessId, imageRefs);
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
