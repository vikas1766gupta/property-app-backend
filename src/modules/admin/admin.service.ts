import { PricingService } from "@modules/pricing/pricing.service";
import { PricingConfig } from "@modules/pricing/pricing.entity";
import { IAdminRepository } from "./admin.repository.interface";
import { AdminBusinessStatus, AdminListingStatus } from "./admin.entity";

export class AdminService {
  constructor(
    private readonly adminRepo: IAdminRepository,
    private readonly pricingService: PricingService
  ) {}

  listBusinesses() {
    return this.adminRepo.listBusinesses();
  }

  verifyBusiness(id: string, status: AdminBusinessStatus) {
    return this.adminRepo.verifyBusiness(id, status);
  }

  listAllListings() {
    return this.adminRepo.listAllListings();
  }

  flagListing(id: string) {
    return this.adminRepo.updateListingStatus(id, "FLAGGED");
  }

  removeListing(id: string) {
    return this.adminRepo.updateListingStatus(id, "REMOVED");
  }

  revenueReport() {
    return this.adminRepo.revenueReport();
  }

  getPricing(): Promise<PricingConfig> {
    return this.pricingService.getConfig();
  }

  updatePricing(input: unknown): Promise<PricingConfig> {
    return this.pricingService.updateConfig(input);
  }
}