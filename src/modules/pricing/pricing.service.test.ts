import { describe, expect, it, vi } from "vitest";
import { IPricingRepository } from "./pricing.repository.interface";
import { PricingConfig } from "./pricing.entity";
import { PricingService } from "./pricing.service";

describe("PricingService", () => {
  it("uses defaults until an admin config is saved", async () => {
    const repository: IPricingRepository = {
      findCurrent: vi.fn().mockResolvedValue(null),
      save: vi.fn(),
    };
    const service = new PricingService(repository);

    await expect(service.getConfig()).resolves.toEqual({
      freeListingLimit: 5,
      pricePerListing: 499,
      currency: "INR",
    });
  });

  it("normalizes and saves a valid admin config", async () => {
    const savedConfig: PricingConfig = { freeListingLimit: 3, pricePerListing: 725.5, currency: "USD" };
    const repository: IPricingRepository = {
      findCurrent: vi.fn(),
      save: vi.fn().mockResolvedValue(savedConfig),
    };
    const service = new PricingService(repository);

    await expect(service.updateConfig({ ...savedConfig, currency: "usd" })).resolves.toEqual(savedConfig);
    expect(repository.save).toHaveBeenCalledWith(savedConfig);
  });

  it.each([
    [{ freeListingLimit: 0, pricePerListing: 499, currency: "INR" }],
    [{ freeListingLimit: 5, pricePerListing: -1, currency: "INR" }],
    [{ freeListingLimit: 5, pricePerListing: 499.999, currency: "INR" }],
    [{ freeListingLimit: 5, pricePerListing: 499, currency: "ZZZ" }],
  ])("rejects invalid pricing values: %o", async (input) => {
    const repository: IPricingRepository = { findCurrent: vi.fn(), save: vi.fn() };
    const service = new PricingService(repository);

    await expect(service.updateConfig(input)).rejects.toMatchObject({ statusCode: 400 });
    expect(repository.save).not.toHaveBeenCalled();
  });
});