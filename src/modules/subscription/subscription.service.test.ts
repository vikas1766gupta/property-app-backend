import { describe, expect, it, vi } from "vitest";
import { SubscriptionService } from "./subscription.service";

const pro = {
  id: "pro",
  name: "PRO",
  price: 1999,
  billingInterval: "MONTHLY",
  isActive: true,
};

function setup(current: any = null) {
  const planService = { getById: vi.fn().mockResolvedValue(pro) };
  const repo = {
    findCurrentByBusiness: vi.fn().mockResolvedValue(current),
    create: vi
      .fn()
      .mockImplementation(async (input) => ({
        id: "sub",
        ...input,
        plan: pro,
      })),
    addEvent: vi.fn(),
    cancel: vi.fn().mockResolvedValue(current),
  };
  return {
    service: new SubscriptionService(planService as any, repo as any),
    repo,
  };
}

describe("SubscriptionService", () => {
  it("creates a paid plan as incomplete until payment confirms", async () => {
    const { service, repo } = setup();
    const result = await service.create("business", "pro");
    expect(result.status).toBe("INCOMPLETE");
    expect(repo.addEvent).toHaveBeenCalledWith("sub", "CHECKOUT_REQUIRED", {
      planId: "pro",
    });
  });

  it("rejects selecting the current plan again", async () => {
    const { service } = setup({ id: "existing", status: "ACTIVE", plan: pro });
    await expect(service.create("business", "pro")).rejects.toThrow(
      "already subscribed",
    );
  });

  it("retires the current plan before creating a replacement", async () => {
    const current = {
      id: "existing",
      status: "ACTIVE",
      plan: { ...pro, id: "free", name: "FREE", price: 0 },
    };
    const { service, repo } = setup(current);

    await service.create("business", "pro");

    expect(repo.cancel).toHaveBeenCalledWith("existing");
    expect(repo.addEvent).toHaveBeenCalledWith(
      "existing",
      "PLAN_CHANGE_REQUESTED",
      { toPlanId: "pro" },
    );
  });

  it("maps provider cancellation to a cancelled subscription", async () => {
    const { service } = setup();
    const repository = (service as any).subscriptionRepo;
    repository.findById = vi.fn().mockResolvedValue({ id: "local-sub" });
    repository.updateFromProvider = vi
      .fn()
      .mockResolvedValue({ id: "local-sub", status: "CANCELLED" });

    await service.syncFromProvider({
      subscriptionId: "local-sub",
      providerSubscriptionId: "stripe-sub",
      status: "canceled",
      cancelAtPeriodEnd: false,
    });

    expect(repository.updateFromProvider).toHaveBeenCalledWith(
      "local-sub",
      expect.objectContaining({
        status: "CANCELLED",
        providerSubscriptionId: "stripe-sub",
      }),
    );
    expect(repository.addEvent).toHaveBeenCalledWith(
      "local-sub",
      "PROVIDER_CANCELED",
      { providerSubscriptionId: "stripe-sub" },
    );
  });
});
