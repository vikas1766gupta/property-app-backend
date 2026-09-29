import { Request, Response } from "express";
import { AdminService } from "./admin.service";
import { PlanService } from "@modules/subscription/plan.service";

export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly planService: PlanService,
  ) {}

  listBusinesses = async (_req: Request, res: Response): Promise<void> => {
    res.json(await this.adminService.listBusinesses());
  };

  verifyBusiness = async (req: Request, res: Response): Promise<void> => {
    const { status } = req.body as {
      status:
        | "PENDING"
        | "UNDER_REVIEW"
        | "VERIFIED"
        | "REJECTED"
        | "SUSPENDED"
        | "EXPIRED";
    };
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

  subscriptionReport = async (_req: Request, res: Response): Promise<void> => {
    res.json(await this.adminService.subscriptionReport());
  };

  notificationDeliveryFailures = async (
    _req: Request,
    res: Response,
  ): Promise<void> => {
    res.json(await this.adminService.notificationDeliveryFailures());
  };

  listProjects = async (_req: Request, res: Response): Promise<void> => {
    res.json(await this.adminService.listProjects());
  };

  moderateProject = async (req: Request, res: Response): Promise<void> => {
    res.json(await this.adminService.updateProject(req.params.id, req.body));
  };

  getPricing = async (_req: Request, res: Response): Promise<void> => {
    res.json(await this.adminService.getPricing());
  };

  updatePricing = async (req: Request, res: Response): Promise<void> => {
    res.json(await this.adminService.updatePricing(req.body));
  };

  listPlans = async (_req: Request, res: Response): Promise<void> => {
    res.json(await this.planService.list(undefined, true));
  };

  createPlan = async (req: Request, res: Response): Promise<void> => {
    res.status(201).json(await this.planService.create(req.body));
  };

  updatePlan = async (req: Request, res: Response): Promise<void> => {
    res.json(await this.planService.update(req.params.id, req.body));
  };
}
