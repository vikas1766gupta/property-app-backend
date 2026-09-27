import { Prisma, PrismaClient } from "@prisma/client";
import { ForbiddenError, NotFoundError } from "@common/errors/AppError";
import { IProjectRepository, ProjectEntity, CreateProjectInput, ProjectSearchFilters, UpdateProjectInput } from "./project.entity";
import { PromotionRepository } from "@modules/promotion/promotion.entity";
import { prioritizeByPromotionWeight } from "@modules/promotion/promotion-order";

const include = {
  builder: { select: { id: true, displayName: true, companyName: true, profileImage: true, verificationStatus: true } },
  media: { orderBy: { sortOrder: "asc" as const } },
  _count: { select: { leads: true } },
} satisfies Prisma.ProjectInclude;

type ProjectRow = Prisma.ProjectGetPayload<{ include: typeof include }>;

export class ProjectRepositoryPrisma implements IProjectRepository {
  constructor(private readonly prisma: PrismaClient, private readonly promotionRepo?: PromotionRepository) {}

  private toEntity(row: ProjectRow): ProjectEntity {
    return {
      ...row,
      priceFrom: row.priceFrom === null ? null : Number(row.priceFrom),
      priceTo: row.priceTo === null ? null : Number(row.priceTo),
      media: row.media.map((media) => ({ id: media.id, url: media.url, mediaType: media.mediaType, sortOrder: media.sortOrder })),
      builder: row.builder ? { id: row.builder.id, name: row.builder.displayName || row.builder.companyName, profileImage: row.builder.profileImage, verificationStatus: row.builder.verificationStatus } : undefined,
      enquiriesCount: row._count.leads,
    };
  }

  private async attachMedia(transaction: Prisma.TransactionClient, projectId: string, builderId: string, refs: NonNullable<CreateProjectInput["mediaRefs"]>): Promise<void> {
    for (const [index, ref] of refs.entries()) {
      const result = await transaction.propertyImage.updateMany({
        where: { id: ref.id, businessId: builderId, propertyId: null, projectId: null },
        data: { projectId, mediaType: ref.mediaType, sortOrder: ref.sortOrder ?? index },
      });
      if (result.count !== 1) throw new ForbiddenError("A project media reference is invalid or belongs to another business");
    }
  }

  async create(input: CreateProjectInput & { slug: string }): Promise<ProjectEntity> {
    const { mediaRefs, ...data } = input;
    const row = await this.prisma.$transaction(async (transaction) => {
      const project = await transaction.project.create({ data: { ...data, status: data.status ?? "DRAFT", amenities: data.amenities ?? [] } });
      if (mediaRefs?.length) await this.attachMedia(transaction, project.id, input.builderId, mediaRefs);
      return transaction.project.findUniqueOrThrow({ where: { id: project.id }, include });
    });
    return this.toEntity(row);
  }

  async findById(id: string): Promise<ProjectEntity | null> {
    const row = await this.prisma.project.findUnique({ where: { id }, include });
    return row ? this.toEntity(row) : null;
  }

  async findBySlugOrId(value: string): Promise<ProjectEntity | null> {
    const row = await this.prisma.project.findFirst({ where: { OR: [{ slug: value }, { id: value }] }, include });
    return row ? this.toEntity(row) : null;
  }

  async findBySlug(slug: string): Promise<ProjectEntity | null> {
    const row = await this.prisma.project.findUnique({ where: { slug }, include });
    return row ? this.toEntity(row) : null;
  }

  async update(id: string, input: UpdateProjectInput): Promise<ProjectEntity> {
    const { mediaRefs, ...data } = input;
    try {
      const row = await this.prisma.$transaction(async (transaction) => {
        await transaction.project.update({ where: { id }, data });
        if (mediaRefs !== undefined) {
          await transaction.propertyImage.updateMany({ where: { projectId: id }, data: { projectId: null, mediaType: "GALLERY", sortOrder: 0 } });
          if (mediaRefs.length) await this.attachMedia(transaction, id, (await transaction.project.findUniqueOrThrow({ where: { id }, select: { builderId: true } })).builderId, mediaRefs);
        }
        return transaction.project.findUniqueOrThrow({ where: { id }, include });
      });
      return this.toEntity(row);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") throw new NotFoundError("Project not found");
      throw error;
    }
  }

  async delete(id: string): Promise<void> {
    await this.prisma.project.delete({ where: { id } });
  }

  async listForBuilder(builderId: string): Promise<ProjectEntity[]> {
    const rows = await this.prisma.project.findMany({ where: { builderId }, include, orderBy: { createdAt: "desc" } });
    return rows.map((row) => this.toEntity(row));
  }

  async listAllForAdmin(): Promise<ProjectEntity[]> {
    const rows = await this.prisma.project.findMany({ include, orderBy: { createdAt: "desc" } });
    return rows.map((row) => this.toEntity(row));
  }

  async search(filters: ProjectSearchFilters): Promise<{ items: ProjectEntity[]; total: number }> {
    const page = filters.page ?? 1;
    const pageSize = Math.min(filters.pageSize ?? 20, 50);
    const today = new Date();
    const where: Prisma.ProjectWhereInput = {
      status: { in: ["PUBLISHED", "SOLD_OUT", "COMPLETED"] },
      ...(filters.city ? { city: { equals: filters.city, mode: "insensitive" } } : {}),
      ...(filters.locality ? { locality: { contains: filters.locality, mode: "insensitive" } } : {}),
      ...(filters.propertyType ? { propertyType: { equals: filters.propertyType, mode: "insensitive" } } : {}),
      ...(filters.minPrice !== undefined || filters.maxPrice !== undefined ? { AND: [{ OR: [{ priceTo: null }, { priceTo: { gte: filters.minPrice ?? 0 } }] }, { OR: [{ priceFrom: null }, { priceFrom: { lte: filters.maxPrice ?? 999999999999 } }] }] } : {}),
      ...(filters.possessionStatus === "READY" ? { possessionDate: { lte: today } } : filters.possessionStatus === "UPCOMING" ? { possessionDate: { gt: today } } : {}),
      ...(filters.verified ? { verificationStatus: "VERIFIED" } : {}),
      ...(filters.reraStatus ? { reraStatus: filters.reraStatus } : {}),
    };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.project.findMany({ where, include, take: 500, orderBy: { createdAt: "desc" } }),
      this.prisma.project.count({ where }),
    ]);
    const items = rows.map((row) => this.toEntity(row));
    const weights = await this.promotionRepo?.activeWeights("PROJECT", items.map((item) => item.id), new Date()) ?? new Map<string, number>();
    const prioritized = prioritizeByPromotionWeight(items, weights).map((item) => ({ ...item, promoted: weights.has(item.id) }));
    return { items: prioritized.slice((page - 1) * pageSize, page * pageSize), total };
  }

  async incrementViews(id: string): Promise<void> {
    await this.prisma.project.update({ where: { id }, data: { viewCount: { increment: 1 } } });
  }

  async similar(project: ProjectEntity, limit: number): Promise<ProjectEntity[]> {
    const rows = await this.prisma.project.findMany({ where: { id: { not: project.id }, status: "PUBLISHED", city: project.city, propertyType: project.propertyType }, include, take: limit, orderBy: { createdAt: "desc" } });
    return rows.map((row) => this.toEntity(row));
  }

  async updateModeration(id: string, input: { status?: ProjectEntity["status"]; verificationStatus?: ProjectEntity["verificationStatus"] }): Promise<ProjectEntity> {
    const row = await this.prisma.project.update({ where: { id }, data: input, include });
    return this.toEntity(row);
  }
}