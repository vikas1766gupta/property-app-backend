import { Prisma, PrismaClient } from "@prisma/client";
import { NotFoundError } from "@common/errors/AppError";
import { PropertyEntity } from "@modules/property/property.entity";
import { IFavoriteRepository } from "./favorite.repository.interface";
import { FavoriteEntity } from "./favorite.entity";

type PrismaPropertyWithImages = Prisma.PropertyGetPayload<{ include: { images: true } }>;
type PrismaFavoriteWithProperty = Prisma.FavoriteGetPayload<{ include: { property: { include: { images: true } } } }>;

export class FavoriteRepositoryPrisma implements IFavoriteRepository {
  constructor(private readonly prisma: PrismaClient) {}

  private toProperty(row: PrismaPropertyWithImages): PropertyEntity {
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

  private toEntity(row: PrismaFavoriteWithProperty): FavoriteEntity {
    return new FavoriteEntity(row.id, row.userId, row.propertyId, row.createdAt, this.toProperty(row.property));
  }

  async addFavorite(userId: string, propertyId: string): Promise<FavoriteEntity> {
    const property = await this.prisma.property.findFirst({
      where: { id: propertyId, status: "PUBLISHED" },
      select: { id: true },
    });
    if (!property) throw new NotFoundError("Published listing not found");

    const favorite = await this.prisma.favorite.upsert({
      where: { userId_propertyId: { userId, propertyId } },
      create: { userId, propertyId },
      update: {},
      include: { property: { include: { images: true } } },
    });
    return this.toEntity(favorite);
  }

  async removeFavorite(userId: string, propertyId: string): Promise<void> {
    await this.prisma.favorite.deleteMany({ where: { userId, propertyId } });
  }

  async listByUser(userId: string): Promise<FavoriteEntity[]> {
    const favorites = await this.prisma.favorite.findMany({
      where: { userId, property: { status: "PUBLISHED" } },
      include: { property: { include: { images: true } } },
      orderBy: { createdAt: "desc" },
    });
    return favorites.map((favorite) => this.toEntity(favorite));
  }
}