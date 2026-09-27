import { PricingService } from "@modules/pricing/pricing.service";
import { PricingConfig } from "@modules/pricing/pricing.entity";
import { IAdminRepository } from "./admin.repository.interface";
import { AdminBusinessStatus, AdminListingStatus } from "./admin.entity";
import { INotificationDeliveryRepository } from "@modules/notification/notification.entity";

export class AdminService {
  constructor(
    private readonly adminRepo: IAdminRepository,
    private readonly pricingService: PricingService,
    private readonly notificationDeliveryRepo?: INotificationDeliveryRepository,
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

  subscriptionReport() {
    return this.adminRepo.subscriptionReport();
  }

  notificationDeliveryFailures() {
    return this.notificationDeliveryRepo?.listFailures() ?? Promise.resolve([]);
  }

  listProjects() { return this.adminRepo.listProjects ? this.adminRepo.listProjects() : Promise.resolve([]); }

  updateProject(id: string, input: { status?: "DRAFT" | "PUBLISHED" | "SOLD_OUT" | "SUSPENDED" | "COMPLETED"; verificationStatus?: "PENDING" | "VERIFIED" | "REJECTED" }) { if (!this.adminRepo.updateProject) throw new Error("Project moderation unavailable"); return this.adminRepo.updateProject(id, input); }

  getPricing(): Promise<PricingConfig> {
    return this.pricingService.getConfig();
  }

  updatePricing(input: unknown): Promise<PricingConfig> {
    return this.pricingService.updateConfig(input);
  }
}