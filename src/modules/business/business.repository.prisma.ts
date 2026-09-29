import { Prisma, PrismaClient } from "@prisma/client";
import {
  BusinessProfile,
  BusinessProfileUpdate,
  BusinessPropertySummary,
  IBusinessRepository,
} from "./business.entity";

const profileInclude = {
  user: { select: { email: true } },
  properties: {
    where: { status: "PUBLISHED" as const },
    select: { listingType: true },
  },
} satisfies Prisma.BusinessInclude;

type ProfileRow = Prisma.BusinessGetPayload<{ include: typeof profileInclude }>;

export class BusinessRepositoryPrisma implements IBusinessRepository {
  constructor(private readonly prisma: PrismaClient) {}

  private toProfile(row: ProfileRow): BusinessProfile {
    const activeProperties = row.properties;
    return {
      id: row.id,
      accountType: row.accountType,
      displayName: row.displayName,
      companyName: row.companyName,
      profileImage: row.profileImage,
      bio: row.bio,
      yearsOfExperience: row.yearsOfExperience,
      phone: row.contactPhone,
      email: row.user.email,
      website: row.website,
      verificationStatus: row.verificationStatus,
      city: row.city,
      servedLocalities: row.servedLocalities,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      stats: {
        activePropertyCount: activeProperties.length,
        saleListingsCount: activeProperties.filter(
          (property) => property.listingType === "SALE",
        ).length,
        rentalListingsCount: activeProperties.filter(
          (property) => property.listingType === "RENT",
        ).length,
        commercialListingsCount: 0,
        projectsCount:
          row.accountType === "BUILDER" ? activeProperties.length : 0,
        activeProjectsCount:
          row.accountType === "BUILDER" ? activeProperties.length : 0,
      },
    };
  }

  async findById(id: string): Promise<BusinessProfile | null> {
    const row = await this.prisma.business.findUnique({
      where: { id },
      include: profileInclude,
    });
    return row ? this.toProfile(row) : null;
  }

  async findAll(): Promise<BusinessProfile[]> {
    const rows = await this.prisma.business.findMany({
      include: profileInclude,
      orderBy: { createdAt: "desc" },
    });
    return rows.map((row) => this.toProfile(row));
  }

  async update(
    id: string,
    input: BusinessProfileUpdate,
  ): Promise<BusinessProfile> {
    const { phone, ...profileData } = input;
    const row = await this.prisma.business.update({
      where: { id },
      data: {
        ...profileData,
        ...(phone !== undefined ? { contactPhone: phone } : {}),
      },
      include: profileInclude,
    });
    return this.toProfile(row);
  }

  async listPublishedProperties(
    id: string,
  ): Promise<BusinessPropertySummary[]> {
    const rows = await this.prisma.property.findMany({
      where: { businessId: id, status: "PUBLISHED" },
      select: {
        id: true,
        title: true,
        listingType: true,
        city: true,
        state: true,
        price: true,
        currency: true,
        images: { select: { url: true }, orderBy: { sortOrder: "asc" } },
      },
      orderBy: { publishedAt: "desc" },
    });
    return rows.map((row) => ({
      ...row,
      price: Number(row.price),
      images: row.images.map((image) => image.url),
    }));
  }
}
