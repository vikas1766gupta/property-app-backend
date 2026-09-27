import { Request, Response } from "express";
import { AdminService } from "./admin.service";

export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  listBusinesses = async (_req: Request, res: Response): Promise<void> => {
    res.json(await this.adminService.listBusinesses());
  };

  verifyBusiness = async (req: Request, res: Response): Promise<void> => {
    const { status } = req.body as { status: "VERIFIED" | "REJECTED" };
    res.json(await this.adminService.verifyBusiness(req.params.id, status));
  };

  listAllListings = async (_req: Request, res: Response): Promise<void> => {
    res.json(await this.adminService.listAllListings());
  };

  flagListing = async (req: Request, res: Response): Promise<void> => {
    res.json(await this.adminService.flagListing(req.params.id));
  };

  removeListing = async (req: Request, res: Response): Promise<void> => {
    res.json(await this.adminService.removeListing(req.params.id));
  };

  revenueReport = async (_req: Request, res: Response): Promise<void> => {
    res.json(await this.adminService.revenueReport());
  };

  getPricing = async (_req: Request, res: Response): Promise<void> => {
    res.json(await this.adminService.getPricing());
  };

  updatePricing = async (req: Request, res: Response): Promise<void> => {
    res.json(await this.adminService.updatePricing(req.body));
  };
}
