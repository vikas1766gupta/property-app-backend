import { beforeEach, describe, expect, it, vi } from "vitest";
import { PricingConfig } from "@modules/pricing/pricing.entity";
import { PricingService } from "@modules/pricing/pricing.service";
import { IAdminRepository } from "./admin.repository.interface";
import { AdminService } from "./admin.service";

describe("AdminService", () => {
  const business = { id: "business-1", verificationStatus: "VERIFIED" };
  const listing = { id: "property-1", status: "PUBLISHED" };
  const revenue = [{ status: "SUCCEEDED", _sum: { amount: "499.00" }, _count: 2 }];
  const pricing: PricingConfig = { freeListingLimit: 3, pricePerListing: 725, currency: "INR" };
  let adminRepository: IAdminRepository;
  let pricingService: PricingService;
  let service: AdminService;

  beforeEach(() => {
    adminRepository = {
      listBusinesses: vi.fn(),
      verifyBusiness: vi.fn().mockResolvedValue(business),
      listAllListings: vi.fn(),
      updateListingStatus: vi.fn().mockResolvedValue(listing),
      revenueReport: vi.fn().mockResolvedValue(revenue),
      subscriptionReport: vi.fn().mockResolvedValue([]),
    };
    pricingService = {
      getConfig: vi.fn(),
      updateConfig: vi.fn().mockResolvedValue(pricing),
    } as unknown as PricingService;
    service = new AdminService(adminRepository, pricingService);
  });

  it("updates business verification status through the repository", async () => {
    await expect(service.verifyBusiness("business-1", "VERIFIED")).resolves.toBe(business);
    expect(adminRepository.verifyBusiness).toHaveBeenCalledWith("business-1", "VERIFIED");
  });

  it("flags and removes listings through the repository", async () => {
    await service.flagListing("property-1");
    await service.removeListing("property-2");

    expect(adminRepository.updateListingStatus).toHaveBeenNthCalledWith(1, "property-1", "FLAGGED");
    expect(adminRepository.updateListingStatus).toHaveBeenNthCalledWith(2, "property-2", "REMOVED");
  });

  it("returns the grouped revenue report from the repository", async () => {
    await expect(service.revenueReport()).resolves.toBe(revenue);
    expect(adminRepository.revenueReport).toHaveBeenCalledOnce();
  });

  it("updates pricing through the shared pricing service", async () => {
    const input = { freeListingLimit: 3, pricePerListing: 725, currency: "INR" };

    await expect(service.updatePricing(input)).resolves.toBe(pricing);
    expect(pricingService.updateConfig).toHaveBeenCalledWith(input);
  });
});
