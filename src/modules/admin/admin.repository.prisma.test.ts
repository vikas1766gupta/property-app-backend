import { beforeEach, describe, expect, it, vi } from "vitest";
import { PrismaClient } from "@prisma/client";
import { AdminRepositoryPrisma } from "./admin.repository.prisma";

describe("AdminRepositoryPrisma", () => {
  const businessRows = [
    {
      id: "business-1",
      user: { email: "agent@example.com", passwordHash: "hash" },
    },
  ];
  const listingRows = [
    {
      id: "property-1",
      business: { id: "business-1" },
      images: [{ url: "https://image.test/1" }],
    },
  ];
  const revenueRows = [
    { status: "SUCCEEDED", _sum: { amount: "499.00" }, _count: 2 },
  ];
  let prisma: {
    business: {
      findMany: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
    };
    property: {
      findMany: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
    };
    payment: { groupBy: ReturnType<typeof vi.fn> };
  };
  let repository: AdminRepositoryPrisma;

  beforeEach(() => {
    prisma = {
      business: {
        findMany: vi.fn().mockResolvedValue(businessRows),
        update: vi
          .fn()
          .mockResolvedValue({
            id: "business-1",
            verificationStatus: "VERIFIED",
          }),
      },
      property: {
        findMany: vi.fn().mockResolvedValue(listingRows),
        update: vi
          .fn()
          .mockResolvedValue({ id: "property-1", status: "FLAGGED" }),
      },
      payment: { groupBy: vi.fn().mockResolvedValue(revenueRows) },
    };
    repository = new AdminRepositoryPrisma(prisma as unknown as PrismaClient);
  });

  it("keeps business list and verification response shapes", async () => {
    await expect(repository.listBusinesses()).resolves.toBe(businessRows);
    expect(prisma.business.findMany).toHaveBeenCalledWith({
      include: { user: true },
    });

    const updated = await repository.verifyBusiness("business-1", "VERIFIED");
    expect(updated).toEqual({
      id: "business-1",
      verificationStatus: "VERIFIED",
    });
    expect(prisma.business.update).toHaveBeenCalledWith({
      where: { id: "business-1" },
      data: { verificationStatus: "VERIFIED" },
    });
  });

  it("keeps listing includes and moderation update responses unchanged", async () => {
    await expect(repository.listAllListings()).resolves.toBe(listingRows);
    expect(prisma.property.findMany).toHaveBeenCalledWith({
      include: { business: true, images: true },
    });

    await repository.updateListingStatus("property-1", "FLAGGED");
    await repository.updateListingStatus("property-2", "REMOVED");
    expect(prisma.property.update).toHaveBeenNthCalledWith(1, {
      where: { id: "property-1" },
      data: { status: "FLAGGED" },
    });
    expect(prisma.property.update).toHaveBeenNthCalledWith(2, {
      where: { id: "property-2" },
      data: { status: "REMOVED" },
    });
  });

  it("groups revenue by payment status and returns Prisma's raw rows", async () => {
    await expect(repository.revenueReport()).resolves.toBe(revenueRows);
    expect(prisma.payment.groupBy).toHaveBeenCalledWith({
      by: ["status"],
      _sum: { amount: true },
      _count: true,
    });
  });
});
