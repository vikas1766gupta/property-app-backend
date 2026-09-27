import { describe, expect, it, vi } from "vitest";
import { BadRequestError } from "@common/errors/AppError";
import { TrustService } from "./trust.service";

describe("TrustService", () => {
  it("creates reports with an optional reporter", async () => {
    const reportRepo = { createReport: vi.fn().mockResolvedValue({ id: "report-1" }), list: vi.fn(), moderate: vi.fn() };
    const service = new TrustService({} as any, reportRepo as any);
    await expect(service.createReport({ entityType: "PROPERTY", entityId: "property-1", reason: "DUPLICATE", description: "Same address and price" })).resolves.toEqual({ id: "report-1" });
    expect(reportRepo.createReport).toHaveBeenCalledOnce();
  });

  it("rejects invalid verification transitions", async () => {
    const verificationRepo = { findVerification: vi.fn().mockResolvedValue({ id: "v-1", status: "VERIFIED" }), review: vi.fn() };
    const service = new TrustService(verificationRepo as any, {} as any);
    await expect(service.reviewVerification("v-1", { status: "REJECTED", reviewedBy: "admin-1" })).rejects.toBeInstanceOf(BadRequestError);
    expect(verificationRepo.review).not.toHaveBeenCalled();
  });

  it("moderates reports through the repository", async () => {
    const reportRepo = { createReport: vi.fn(), list: vi.fn(), moderate: vi.fn().mockResolvedValue({ id: "report-1", status: "RESOLVED" }) };
    const service = new TrustService({} as any, reportRepo as any);
    await expect(service.moderateReport("report-1", { status: "RESOLVED", reviewedBy: "admin-1" })).resolves.toEqual({ id: "report-1", status: "RESOLVED" });
  });
});