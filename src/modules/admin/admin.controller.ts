import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";

/**
 * Kept intentionally thin/direct for the admin surface (low traffic, internal
 * tool). For consistency with the rest of the app it still goes through
 * Prisma only here, in the controller's injected client — if this module
 * grows, split it into AdminService + AdminRepository like Property.
 */
export class AdminController {
  constructor(private readonly prisma: PrismaClient) {}

  listBusinesses = async (_req: Request, res: Response): Promise<void> => {
    res.json(await this.prisma.business.findMany({ include: { user: true } }));
  };

  verifyBusiness = async (req: Request, res: Response): Promise<void> => {
    const { status } = req.body as { status: "VERIFIED" | "REJECTED" };
    const business = await this.prisma.business.update({
      where: { id: req.params.id },
      data: { verificationStatus: status },
    });
    res.json(business);
  };

  listAllListings = async (_req: Request, res: Response): Promise<void> => {
    res.json(await this.prisma.property.findMany({ include: { business: true, images: true } }));
  };

  flagListing = async (req: Request, res: Response): Promise<void> => {
    const property = await this.prisma.property.update({
      where: { id: req.params.id },
      data: { status: "FLAGGED" },
    });
    res.json(property);
  };

  removeListing = async (req: Request, res: Response): Promise<void> => {
    const property = await this.prisma.property.update({
      where: { id: req.params.id },
      data: { status: "REMOVED" },
    });
    res.json(property);
  };

  revenueReport = async (_req: Request, res: Response): Promise<void> => {
    const totals = await this.prisma.payment.groupBy({
      by: ["status"],
      _sum: { amount: true },
      _count: true,
    });
    res.json(totals);
  };

  updatePricing = async (req: Request, res: Response): Promise<void> => {
    const { freeListingLimit, pricePerListing } = req.body as { freeListingLimit?: number; pricePerListing?: number };
    const existing = await this.prisma.pricingConfig.findFirst();
    const config = existing
      ? await this.prisma.pricingConfig.update({ where: { id: existing.id }, data: { freeListingLimit, pricePerListing } })
      : await this.prisma.pricingConfig.create({ data: { freeListingLimit, pricePerListing } });
    res.json(config);
  };
}
