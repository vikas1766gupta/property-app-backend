import { describe, expect, it, vi } from "vitest";
import { BusinessController } from "./business.controller";

function response() {
  return { json: vi.fn() } as any;
}

describe("BusinessController", () => {
  it("rejects body ownership overrides instead of trusting them", async () => {
    const service = {
      updateOwnProfile: vi.fn().mockResolvedValue({ id: "business-1" }),
    };
    const controller = new BusinessController(service as any);
    const res = response();

    await expect(controller.updateMine(
      { auth: { userId: "user-1", role: "BUSINESS", businessId: "business-1" }, body: { businessId: "business-2", displayName: "Updated" } } as any,
      res,
    )).rejects.toMatchObject({ statusCode: 400 });

    expect(service.updateOwnProfile).not.toHaveBeenCalled();
  });

  it("rejects invalid account types and malformed URLs", async () => {
    const service = { updateOwnProfile: vi.fn() };
    const controller = new BusinessController(service as any);
    const res = response();

    await expect(controller.updateMine(
      { auth: { userId: "user-1", role: "BUSINESS", businessId: "business-1" }, body: { accountType: "AGENT", website: "not-a-url" } } as any,
      res,
    )).rejects.toMatchObject({ statusCode: 400 });
    expect(service.updateOwnProfile).not.toHaveBeenCalled();
  });
});
