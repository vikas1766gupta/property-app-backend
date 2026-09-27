import { Request, Response } from "express";
import { z } from "zod";
import { LeadService } from "./lead.service";
import { BadRequestError, ForbiddenError } from "@common/errors/AppError";

const createLeadSchema = z.object({
  propertyId: z.string().min(1),
  name: z.string().min(2),
  contact: z.string().min(5),
  message: z.string().min(5),
});

export class LeadController {
  constructor(private readonly leadService: LeadService) {}

  create = async (req: Request, res: Response): Promise<void> => {
    const parsed = createLeadSchema.safeParse(req.body);
    if (!parsed.success) throw new BadRequestError("Invalid lead payload", parsed.error.flatten());
    const lead = await this.leadService.submitLead({ ...parsed.data, userId: req.auth?.userId });
    res.status(201).json(lead);
  };

  listMine = async (req: Request, res: Response): Promise<void> => {
    const businessId = req.auth?.businessId;
    if (!businessId) throw new ForbiddenError("Business account is not linked to a business");
    res.json(await this.leadService.listForBusiness(businessId));
  };
}
