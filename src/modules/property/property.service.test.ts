import { describe, expect, it, vi } from "vitest";
import { PaymentService } from "@modules/payment/payment.service";
import { PricingService } from "@modules/pricing/pricing.service";
import { IPropertyRepository } from "./property.repository.interface";
import { PropertyEntity } from "./property.entity";
import { PropertyService } from "./property.service";

describe("PropertyService pricing", () => {
  const pricingService = {
    getConfig: vi.fn().mockResolvedValue({ freeListingLimit: 3, pricePerListing: 499, currency: "INR" }),
  } as unknown as PricingService;

  it("requires payment when used listings reach the configured free limit", async () => {
    const property = { id: "property-1" };
    const repository = {
      countByBusiness: vi.fn().mockResolvedValue(3),
      create: vi.fn().mockResolvedValue(property),
      updateStatus: vi.fn().mockResolvedValue(property),
    } as unknown as IPropertyRepository;
    const service = new PropertyService(repository, {} as PaymentService, pricingService, { upload: vi.fn() });

    const result = await service.createListing({ businessId: "business-1" } as never);

    expect(result.requiresPayment).toBe(true);
    expect(repository.updateStatus).toHaveBeenCalledWith("property-1", "PENDING_PAYMENT");
  });

  it("publishes listings below the configured free limit", async () => {
    const property = { id: "property-1" };
    const repository = {
      countByBusiness: vi.fn().mockResolvedValue(2),
      create: vi.fn().mockResolvedValue(property),
      updateStatus: vi.fn().mockResolvedValue(property),
    } as unknown as IPropertyRepository;
    const service = new PropertyService(repository, {} as PaymentService, pricingService, { upload: vi.fn() });

    const result = await service.createListing({ businessId: "business-1" } as never);

    expect(result.requiresPayment).toBe(false);
    expect(repository.updateStatus).toHaveBeenCalledWith("property-1", "PUBLISHED");
  });
});

describe("PropertyService ownership", () => {
  const property = { id: "property-1", businessId: "owner-business" } as PropertyEntity;
  const pricing = { getConfig: vi.fn() } as unknown as PricingService;

  it("rejects updates from a different business without reaching the repository update", async () => {
    const repository = {
      findById: vi.fn().mockResolvedValue(property),
      update: vi.fn(),
    } as unknown as IPropertyRepository;
    const service = new PropertyService(repository, {} as PaymentService, pricing, { upload: vi.fn() });

    await expect(service.updateListing("property-1", "other-business", { title: "Changed title" }))
      .rejects.toMatchObject({ statusCode: 403 });
    expect(repository.update).not.toHaveBeenCalled();
  });

  it("rejects deletion from a different business without reaching the repository delete", async () => {
    const repository = {
      findById: vi.fn().mockResolvedValue(property),
      delete: vi.fn(),
    } as unknown as IPropertyRepository;
    const service = new PropertyService(repository, {} as PaymentService, pricing, { upload: vi.fn() });

    await expect(service.deleteListing("property-1", "other-business"))
      .rejects.toMatchObject({ statusCode: 403 });
    expect(repository.delete).not.toHaveBeenCalled();
  });

  it("allows the owning business to update and delete its listing", async () => {
    const repository = {
      findById: vi.fn().mockResolvedValue(property),
      update: vi.fn().mockResolvedValue(property),
      delete: vi.fn().mockResolvedValue(undefined),
    } as unknown as IPropertyRepository;
    const service = new PropertyService(repository, {} as PaymentService, pricing, { upload: vi.fn() });

    await service.updateListing("property-1", "owner-business", { title: "Changed title" });
    await service.deleteListing("property-1", "owner-business");

    expect(repository.update).toHaveBeenCalledWith("property-1", "owner-business", { title: "Changed title" });
    expect(repository.delete).toHaveBeenCalledWith("property-1");
  });
});