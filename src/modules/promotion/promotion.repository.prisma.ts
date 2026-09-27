import { PrismaClient } from '@prisma/client';
import { PromotionConfig, PromotionEntity, PromotionRepository, PromotionTargetType, PromotionType } from './promotion.entity';

export class PromotionRepositoryPrisma implements PromotionRepository {
  constructor(private readonly prisma: PrismaClient) {}

  private config(row: any): PromotionConfig { return { ...row, price: Number(row.price) }; }
  private entity(row: any): PromotionEntity { return { ...row }; }

  async listConfigs(): Promise<PromotionConfig[]> { return (await this.prisma.promotionConfig.findMany({ orderBy: { type: 'asc' } })).map((row) => this.config(row)); }
  async findConfig(type: PromotionType): Promise<PromotionConfig | null> { const row = await this.prisma.promotionConfig.findUnique({ where: { type } }); return row ? this.config(row) : null; }
  async saveConfig(input: Omit<PromotionConfig, 'id'>): Promise<PromotionConfig> {
    const row = await this.prisma.promotionConfig.upsert({ where: { type: input.type }, create: input, update: input });
    return this.config(row);
  }
  async findById(id: string): Promise<PromotionEntity | null> { const row = await this.prisma.promotion.findUnique({ where: { id } }); return row ? this.entity(row) : null; }
  async findPendingOrActive(input: { businessId: string; propertyId?: string; projectId?: string; type: PromotionType }): Promise<PromotionEntity | null> {
    const row = await this.prisma.promotion.findFirst({ where: { ...input, status: { in: ['PENDING_PAYMENT', 'SCHEDULED', 'ACTIVE'] } }, orderBy: { createdAt: 'desc' } });
    return row ? this.entity(row) : null;
  }
  async create(input: Omit<PromotionEntity, 'id'>): Promise<PromotionEntity> { return this.entity(await this.prisma.promotion.create({ data: input })); }
  async attachPayment(id: string, paymentId: string): Promise<PromotionEntity> { return this.entity(await this.prisma.promotion.update({ where: { id }, data: { paymentId } })); }
  async activate(id: string, startAt: Date): Promise<PromotionEntity> {
    const row = await this.prisma.promotion.findUniqueOrThrow({ where: { id } });
    return this.entity(await this.prisma.promotion.update({ where: { id }, data: { status: startAt > new Date() ? 'SCHEDULED' : 'ACTIVE', startAt } }));
  }
  async activeWeights(targetType: PromotionTargetType, ids: string[], now: Date): Promise<Map<string, number>> {
    if (!ids.length) return new Map();
    const rows = await this.prisma.promotion.findMany({ where: { [targetType === 'PROPERTY' ? 'propertyId' : 'projectId']: { in: ids }, status: { in: ['SCHEDULED', 'ACTIVE'] }, startAt: { lte: now }, endAt: { gt: now } }, select: { propertyId: true, projectId: true, priorityWeight: true } });
    return new Map(rows.map((row) => [(targetType === 'PROPERTY' ? row.propertyId : row.projectId) as string, row.priorityWeight]));
  }
  async listByBusiness(businessId: string): Promise<PromotionEntity[]> { return (await this.prisma.promotion.findMany({ where: { businessId }, orderBy: { createdAt: 'desc' } })).map((row) => this.entity(row)); }
  async targetOwned(input: { targetType: PromotionTargetType; targetId: string; businessId: string }): Promise<boolean> {
    const where = input.targetType === 'PROPERTY' ? { id: input.targetId, businessId: input.businessId } : { id: input.targetId, builderId: input.businessId };
    return Boolean(await (input.targetType === 'PROPERTY' ? this.prisma.property.findFirst({ where }) : this.prisma.project.findFirst({ where })));
  }
}
