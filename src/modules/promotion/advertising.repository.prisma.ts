import { PrismaClient } from "@prisma/client";
import {
  AdPlacement,
  AdvertisingRepository,
  CampaignEntity,
  CampaignStatus,
} from "./advertising.entity";

export class AdvertisingRepositoryPrisma implements AdvertisingRepository {
  constructor(private readonly prisma: PrismaClient) {}
  private entity(row: any): CampaignEntity {
    const impressions = row._count?.impressions ?? 0;
    const clicks = row._count?.clicks ?? 0;
    return {
      id: row.id,
      businessId: row.businessId,
      name: row.name,
      targetUrl: row.targetUrl,
      startAt: row.startAt,
      endAt: row.endAt,
      budget: Number(row.budget),
      status: row.status,
      impressions,
      clicks,
      ctr: impressions ? clicks / impressions : 0,
      placements: row.placements?.map((item: any) => item.placement) ?? [],
    };
  }
  async create(input: {
    businessId: string;
    name: string;
    targetUrl: string;
    startAt: Date;
    endAt: Date;
    budget: number;
    placements: AdPlacement[];
  }): Promise<CampaignEntity> {
    const row = await this.prisma.campaign.create({
      data: {
        businessId: input.businessId,
        name: input.name,
        targetUrl: input.targetUrl,
        startAt: input.startAt,
        endAt: input.endAt,
        budget: input.budget,
        placements: {
          create: input.placements.map((placement) => ({ placement })),
        },
      },
      include: {
        placements: true,
        _count: { select: { impressions: true, clicks: true } },
      },
    });
    return this.entity(row);
  }
  async findActive(
    placement: AdPlacement,
    now: Date,
  ): Promise<CampaignEntity[]> {
    const rows = await this.prisma.campaign.findMany({
      where: {
        status: "ACTIVE",
        startAt: { lte: now },
        endAt: { gt: now },
        placements: { some: { placement } },
      },
      include: {
        placements: true,
        _count: { select: { impressions: true, clicks: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    return rows.map((row) => this.entity(row));
  }
  async setStatus(id: string, status: CampaignStatus): Promise<CampaignEntity> {
    const row = await this.prisma.campaign.update({
      where: { id },
      data: { status },
      include: {
        placements: true,
        _count: { select: { impressions: true, clicks: true } },
      },
    });
    return this.entity(row);
  }
  async listByBusiness(businessId: string): Promise<CampaignEntity[]> {
    const rows = await this.prisma.campaign.findMany({
      where: { businessId },
      include: {
        placements: true,
        _count: { select: { impressions: true, clicks: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    return rows.map((row) => this.entity(row));
  }
  async listAll(): Promise<CampaignEntity[]> {
    const rows = await this.prisma.campaign.findMany({
      include: {
        placements: true,
        _count: { select: { impressions: true, clicks: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    return rows.map((row) => this.entity(row));
  }
  async recordImpression(id: string): Promise<void> {
    await this.prisma.adImpression.create({ data: { campaignId: id } });
  }
  async recordClick(id: string): Promise<void> {
    await this.prisma.adClick.create({ data: { campaignId: id } });
  }
}
