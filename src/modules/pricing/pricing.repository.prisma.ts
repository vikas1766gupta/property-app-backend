import { PrismaClient, PricingConfig as PrismaPricingConfig } from "@prisma/client";
import { IPricingRepository } from "./pricing.repository.interface";
import { PricingConfig } from "./pricing.entity";

export class PricingRepositoryPrisma implements IPricingRepository {
  constructor(private readonly prisma: PrismaClient) {}

  private toEntity(row: PrismaPricingConfig): PricingConfig {
    return {
      freeListingLimit: row.freeListingLimit,
      pricePerListing: Number(row.pricePerListing),
      currency: row.currency,
    };
  }

  async findCurrent(): Promise<PricingConfig | null> {
    const row = await this.prisma.pricingConfig.findFirst();
    return row ? this.toEntity(row) : null;
  }

  async save(config: PricingConfig): Promise<PricingConfig> {
    const existing = await this.prisma.pricingConfig.findFirst();
    const row = existing
      ? await this.prisma.pricingConfig.update({ where: { id: existing.id }, data: config })
      : await this.prisma.pricingConfig.create({ data: config });
    return this.toEntity(row);
  }
}