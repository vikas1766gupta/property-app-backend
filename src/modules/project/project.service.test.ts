import { describe, expect, it, vi } from "vitest";
import { ForbiddenError, NotFoundError } from "@common/errors/AppError";
import { ProjectService } from "./project.service";

const builder = { id: "builder-1", accountType: "BUILDER" };
const project = { id: "project-1", builderId: "builder-1", slug: "sunrise-pune", status: "PUBLISHED", verificationStatus: "VERIFIED", city: "Pune", propertyType: "Apartment", viewCount: 4 };

function setup() {
  const projectRepo = { findBySlug: vi.fn().mockResolvedValue(null), create: vi.fn().mockResolvedValue(project), findBySlugOrId: vi.fn().mockResolvedValue(project), incrementViews: vi.fn(), similar: vi.fn().mockResolvedValue([]), findById: vi.fn().mockResolvedValue(project), update: vi.fn().mockResolvedValue(project), delete: vi.fn() };
  const businessRepo = { findById: vi.fn().mockResolvedValue(builder) };
  return { service: new ProjectService(projectRepo as any, businessRepo as any), projectRepo, businessRepo };
}

describe("ProjectService", () => {
  it("allows only builder businesses to create projects", async () => {
    const { service, businessRepo } = setup();
    businessRepo.findById.mockResolvedValue({ ...builder, accountType: "BROKER" });
    await expect(service.create({ builderId: "builder-1", name: "Sunrise", description: "A verified residential project in Pune", propertyType: "Apartment", city: "Pune", locality: "Baner", address: "Main Road", totalUnits: 10, availableUnits: 10 })).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("hides unverified projects from public detail", async () => {
    const { service, projectRepo } = setup();
    projectRepo.findBySlugOrId.mockResolvedValue({ ...project, verificationStatus: "PENDING" });
    await expect(service.getPublic("sunrise-pune")).rejects.toBeInstanceOf(NotFoundError);
  });

  it("increments views for a visible project", async () => {
    const { service, projectRepo } = setup();
    const result = await service.getPublic("sunrise-pune");
    expect(projectRepo.incrementViews).toHaveBeenCalledWith("project-1");
    expect(result.project.viewCount).toBe(5);
  });
});