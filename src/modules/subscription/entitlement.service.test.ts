import { describe, expect, it, vi } from "vitest";
import { EntitlementService } from "./entitlement.service";

const freePlan = {
  id: "free",
  name: "FREE",
  price: 0,
  currency: "INR",
  billingInterval: "MONTHLY",
  maxActiveListings: 5,
  featuredCredits: 0,
  maxTeamMembers: 1,
  leadManagement: false,
  analytics: false,
  priorityVisibility: false,
  profileVisibility: true,
  projectListingAccess: false,
  isActive: true,
  accountType: null,
};
const proPlan = {
  ...freePlan,
  id: "pro",
  name: "PRO",
  price: 1999,
  maxActiveListings: 25,
  leadManagement: true,
  isActive: true,
};

function setup(subscription: any, count = 4, free = freePlan) {
  const planService = {
    getFreePlan: vi.fn().mockResolvedValue(free),
    getByName: vi.fn().mockResolvedValue(null),
  };
  const subscriptionRepo = {
    findCurrentByBusiness: vi.fn().mockResolvedValue(subscription),
  };
  const propertyRepo = { countByBusiness: vi.fn().mockResolvedValue(count) };
  const pricingService = {
    getConfig: vi
      .fn()
      .mockResolvedValue({
        freeListingLimit: free.maxActiveListings,
        pricePerListing: 499,
        currency: "INR",
      }),
  };
  return new EntitlementService(
    planService as any,
    subscriptionRepo as any,
    propertyRepo as any,
    pricingService as any,
  );
}

describe("EntitlementService", () => {
  it("grants active plan limits", async () => {
    const service = setup(
      {
        id: "sub",
        status: "ACTIVE",
        currentPeriodEnd: new Date(Date.now() + 86400000),
        plan: proPlan,
      },
      24,
    );
    const result = await service.canCreateListing("business");
    expect(result.allowed).toBe(true);
    expect(result.entitlements.name).toBe("PRO");
  });

  it("falls back to FREE for expired and cancelled subscriptions", async () => {
    for (const status of ["EXPIRED", "CANCELLED"]) {
      const service = setup(
        {
          id: "sub",
          status,
          currentPeriodEnd: new Date(Date.now() + 86400000),
          plan: proPlan,
        },
        5,
      );
      expect((await service.getEntitlements("business")).name).toBe("FREE");
    }
  });

  it("falls back when the subscribed plan is inactive", async () => {
    const service = setup(
      {
        id: "sub",
        status: "ACTIVE",
        currentPeriodEnd: new Date(Date.now() + 86400000),
        plan: { ...proPlan, isActive: false },
      },
      5,
    );
    expect((await service.getEntitlements("business")).name).toBe("FREE");
  });

  it("enforces the active listing limit", async () => {
    const service = setup(
      {
        id: "sub",
        status: "ACTIVE",
        currentPeriodEnd: new Date(Date.now() + 86400000),
        plan: proPlan,
      },
      25,
    );
    const result = await service.canCreateListing("business");
    expect(result.allowed).toBe(false);
    expect(result.requiresPayment).toBe(true);
  });

  it("exposes named feature checks through the resolved plan", async () => {
    const service = setup({
      id: "sub",
      status: "ACTIVE",
      currentPeriodEnd: new Date(Date.now() + 86400000),
      plan: { ...proPlan, featuredCredits: 2, analytics: true },
    });

    await expect(service.canUseFeaturedListing("business")).resolves.toBe(true);
    await expect(service.canUseLeadCRM("business")).resolves.toBe(true);
    await expect(service.canUseAnalytics("business")).resolves.toBe(true);
  });

  it("denies named paid features on the free fallback plan", async () => {
    const service = setup(null, 0);

    await expect(service.canUseFeaturedListing("business")).resolves.toBe(
      false,
    );
    await expect(service.canUseLeadCRM("business")).resolves.toBe(false);
    await expect(service.canUseAnalytics("business")).resolves.toBe(false);
  });
});
