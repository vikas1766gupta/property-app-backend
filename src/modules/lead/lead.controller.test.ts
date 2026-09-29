import { describe, expect, it, vi } from "vitest";
import { LeadController } from "./lead.controller";

const response = () =>
  ({ json: vi.fn(), status: vi.fn().mockReturnThis() }) as any;
const auth = {
  userId: "user-1",
  role: "BUSINESS" as const,
  businessId: "business-1",
};

describe("LeadController CRM endpoints", () => {
  it("passes filters and pagination while deriving business ownership from auth", async () => {
    const service = {
      listForBusiness: vi.fn().mockResolvedValue({ items: [], total: 0 }),
    };
    const controller = new LeadController(service as any);

    await controller.list(
      {
        auth,
        query: {
          status: "CONTACTED",
          source: "website",
          page: "2",
          pageSize: "10",
          followUpDue: "true",
        },
      } as any,
      response(),
    );

    expect(service.listForBusiness).toHaveBeenCalledWith(
      "business-1",
      expect.objectContaining({
        status: "CONTACTED",
        source: "website",
        page: 2,
        pageSize: 10,
        followUpDue: true,
      }),
    );
  });

  it("rejects invalid statuses before invoking the update service", async () => {
    const service = { updateStatus: vi.fn() };
    const controller = new LeadController(service as any);

    await expect(
      controller.updateStatus(
        { auth, params: { id: "lead-1" }, body: { status: "OPEN" } } as any,
        response(),
      ),
    ).rejects.toMatchObject({ statusCode: 400 });
    expect(service.updateStatus).not.toHaveBeenCalled();
  });

  it("keeps the legacy /mine response as an array", async () => {
    const service = {
      listForBusiness: vi
        .fn()
        .mockResolvedValue({ items: [{ id: "lead-1" }], total: 1 }),
    };
    const controller = new LeadController(service as any);
    const res = response();

    await controller.listMine({ auth } as any, res);

    expect(res.json).toHaveBeenCalledWith([{ id: "lead-1" }]);
  });
});
