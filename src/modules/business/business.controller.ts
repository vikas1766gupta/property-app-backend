import { Request, Response } from "express";
import { z } from "zod";
import { BadRequestError, ForbiddenError } from "@common/errors/AppError";
import { BusinessService } from "./business.service";

const profileUpdateSchema = z.object({
  accountType: z.enum(["OWNER", "BROKER", "BUILDER"]).optional(),
  displayName: z.string().trim().min(2).max(100).nullable().optional(),
  companyName: z.string().trim().min(2).max(150).optional(),
  profileImage: z.string().url().max(500).nullable().optional(),
  bio: z.string().trim().max(1000).nullable().optional(),
  yearsOfExperience: z.number().int().min(0).max(100).nullable().optional(),
  phone: z.string().regex(/^[+]?\d[\d\s().-]{6,19}$/).nullable().optional(),
  website: z.string().url().max(255).nullable().optional(),
  city: z.string().trim().min(2).max(100).nullable().optional(),
  servedLocalities: z.array(z.string().trim().min(2).max(100)).max(50).optional(),
}).strict().refine((value) => Object.keys(value).length > 0, "At least one profile field must be provided");

export class BusinessController {
  constructor(private readonly businessService: BusinessService) {}

  getById = async (req: Request, res: Response): Promise<void> => {
    res.json(await this.businessService.getPublicProfile(req.params.id));
  };

  list = async (_req: Request, res: Response): Promise<void> => {
    res.json(await this.businessService.listPublicProfiles());
  };

  updateMine = async (req: Request, res: Response): Promise<void> => {
    if (!req.auth?.businessId) throw new ForbiddenError("Business account required");
    const parsed = profileUpdateSchema.safeParse(req.body);
    if (!parsed.success) throw new BadRequestError("Invalid business profile", parsed.error.flatten());
    res.json(await this.businessService.updateOwnProfile(req.auth.businessId, parsed.data));
  };

  properties = async (req: Request, res: Response): Promise<void> => {
    res.json(await this.businessService.listProperties(req.params.id));
  };
}
