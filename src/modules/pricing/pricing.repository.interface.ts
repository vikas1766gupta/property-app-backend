import { PricingConfig } from "./pricing.entity";

export interface IPricingRepository {
  findCurrent(): Promise<PricingConfig | null>;
  save(config: PricingConfig): Promise<PricingConfig>;
}
