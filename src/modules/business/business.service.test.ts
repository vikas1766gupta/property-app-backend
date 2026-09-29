import { describe, expect, it, vi } from "vitest";
import { BusinessService } from "./business.service";
import { BusinessProfile, IBusinessRepository } from "./business.entity";

const profile: BusinessProfile = {
  id: "business-1",
  accountType: "BROKER",
  displayName: "Asha Realty",
  companyName: "Asha Realty Pvt Ltd",
  profileImage: null,
  bio: "Local property advisor",
  yearsOfExperience: 8,
  phone: "+919999999999",
  email: "asha@example.com",
  website: "https://asha.example.com",
  verificationStatus: "VERIFIED",
  city: "Pune",
  servedLocalities: ["Baner", "Aundh"],
  createdAt: new Date(),
  updatedAt: new Date(),
  stats: {
    activePropertyCount: 2,
    saleListingsCount: 1,
    rentalListingsCount: 1,
    commercialListingsCount: 0,
    projectsCount: 0,
    activeProjectsCount: 0,
  },
};

function repository(): IBusinessRepository {
  return {
    findById: vi.fn().mockResolvedValue(profile),
    findAll: vi.fn().mockResolvedValue([profile]),
    update: vi.fn().mockResolvedValue(profile),
    listPublishedProperties: vi.fn().mockResolvedValue([]),
  };
}

describe("BusinessService", () => {
  it("retrieves a public profile without authentication internals", async () => {
    const service = new BusinessService(repository());
    const result = await service.getPublicProfile("business-1");

    expect(result).toEqual(profile);
    expect(result).not.toHaveProperty("passwordHash");
    expect(result).not.toHaveProperty("userId");
  });

  it("updates only the business id supplied by the authenticated route", async () => {
    const repo = repository();
    const service = new BusinessService(repo);

    await service.updateOwnProfile("business-1", {
      accountType: "BUILDER",
      website: null,
    });

    expect(repo.update).toHaveBeenCalledWith("business-1", {
      accountType: "BUILDER",
      website: null,
    });
  });
});
