import { describe, expect, it, vi } from "vitest";
import { LeadService } from "./lead.service";
import { LeadForBusiness } from "./lead.entity";

const lead: LeadForBusiness = {
  id: "lead-1", propertyId: "property-1", userId: null, name: "Buyer", contact: "buyer@example.com", message: "Interested",
  createdAt: new Date("2026-09-27T10:00:00Z"), status: "NEW", assignedTo: null, notes: null, nextFollowUpAt: null,
  contactedAt: null, siteVisitAt: null, closedAt: null, source: "website", lastUpdatedAt: new Date("2026-09-27T10:00:00Z"),
  propertyTitle: "Central home", propertyCity: "Pune",
};

function repos() {
  return {
    lead: {
      findByIdForBusiness: vi.fn().mockResolvedValue(lead),
      updateForBusiness: vi.fn().mockResolvedValue({ ...lead, status: "CONTACTED" }),
      recordEvent: vi.fn().mockResolvedValue(undefined),
      listByBusiness: vi.fn(), summaryByBusiness: vi.fn(), addNoteForBusiness: vi.fn(), scheduleFollowUpForBusiness: vi.fn(),
    },
    property: {},
  };
}

describe("LeadService CRM workflow", () => {
  it("isolates a lead from another business", async () => {
    const reposet = repos();
    reposet.lead.findByIdForBusiness.mockResolvedValue(null);
    const service = new LeadService(reposet.lead as any, reposet.property as any);

    await expect(service.getForBusiness("business-2", "lead-1")).rejects.toMatchObject({ statusCode: 404 });
    expect(reposet.lead.recordEvent).not.toHaveBeenCalled();
  });

  it("rejects invalid status transitions and records valid status changes", async () => {
    const reposet = repos();
    const service = new LeadService(reposet.lead as any, reposet.property as any);

    await expect(service.updateStatus("business-1", "lead-1", "CLOSED")).rejects.toMatchObject({ statusCode: 400 });
    await service.updateStatus("business-1", "lead-1", "CONTACTED");
    expect(reposet.lead.updateForBusiness).toHaveBeenCalledWith("business-1", "lead-1", expect.objectContaining({ status: "CONTACTED", contactedAt: expect.any(Date) }));
    expect(reposet.lead.recordEvent).toHaveBeenCalledWith(expect.objectContaining({ type: "status_changed" }));
  });

  it("rejects follow-ups scheduled in the past", async () => {
    const reposet = repos();
    const service = new LeadService(reposet.lead as any, reposet.property as any);

    await expect(service.scheduleFollowUp("business-1", "lead-1", new Date(Date.now() - 1000))).rejects.toMatchObject({ statusCode: 400 });
    expect(reposet.lead.scheduleFollowUpForBusiness).not.toHaveBeenCalled();
  });
});
