import { Request, Response } from "express";
import { z } from "zod";
import { BadRequestError, ForbiddenError } from "@common/errors/AppError";
import { LeadService } from "./lead.service";

const statuses = [
  "NEW",
  "CONTACTED",
  "INTERESTED",
  "SITE_VISIT",
  "NEGOTIATION",
  "CLOSED",
  "NOT_INTERESTED",
  "INVALID",
] as const;
const leadStatus = z.enum(statuses);
const leadFiltersSchema = z
  .object({
    status: leadStatus.optional(),
    propertyId: z.string().min(1).optional(),
    fromDate: z.coerce.date().optional(),
    toDate: z.coerce.date().optional(),
    source: z.string().trim().max(50).optional(),
    assignedTo: z.string().trim().max(100).optional(),
    followUpDue: z.coerce.boolean().optional(),
    page: z.coerce.number().int().positive().default(1),
    pageSize: z.coerce.number().int().positive().max(100).default(20),
  })
  .superRefine((filters, context) => {
    if (filters.fromDate && filters.toDate && filters.fromDate > filters.toDate)
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["fromDate"],
        message: "Start date cannot exceed end date",
      });
  });

const createLeadSchema = z.object({
  propertyId: z.string().min(1),
  name: z.string().trim().min(2).max(100),
  contact: z.string().trim().min(5).max(150),
  message: z.string().trim().min(5).max(2000),
  source: z.string().trim().max(50).optional(),
});
const updateLeadSchema = z
  .object({
    status: leadStatus.optional(),
    assignedTo: z.string().trim().max(100).nullable().optional(),
    notes: z.string().trim().max(5000).nullable().optional(),
    nextFollowUpAt: z.coerce.date().nullable().optional(),
    contactedAt: z.coerce.date().nullable().optional(),
    siteVisitAt: z.coerce.date().nullable().optional(),
    closedAt: z.coerce.date().nullable().optional(),
    source: z.string().trim().max(50).nullable().optional(),
  })
  .strict()
  .refine(
    (value) => Object.keys(value).length > 0,
    "At least one lead field must be provided",
  );
const noteSchema = z.object({ note: z.string().trim().min(1).max(2000) });
const followUpSchema = z.object({ nextFollowUpAt: z.coerce.date() });

export class LeadController {
  constructor(private readonly leadService: LeadService) {}

  create = async (req: Request, res: Response): Promise<void> => {
    const parsed = createLeadSchema.safeParse(req.body);
    if (!parsed.success)
      throw new BadRequestError("Invalid lead payload", parsed.error.flatten());
    res
      .status(201)
      .json(
        await this.leadService.submitLead({
          ...parsed.data,
          userId: req.auth?.userId,
        }),
      );
  };

  list = async (req: Request, res: Response): Promise<void> => {
    const parsed = leadFiltersSchema.safeParse(req.query);
    if (!parsed.success)
      throw new BadRequestError("Invalid lead filters", parsed.error.flatten());
    res.json(
      await this.leadService.listForBusiness(
        this.requireBusiness(req),
        parsed.data,
      ),
    );
  };

  listMine = async (req: Request, res: Response): Promise<void> => {
    const result = await this.leadService.listForBusiness(
      this.requireBusiness(req),
      { page: 1, pageSize: 100 },
    );
    res.json(result.items);
  };

  getById = async (req: Request, res: Response): Promise<void> => {
    res.json(
      await this.leadService.getForBusiness(
        this.requireBusiness(req),
        req.params.id,
      ),
    );
  };

  summary = async (req: Request, res: Response): Promise<void> => {
    res.json(
      await this.leadService.summaryForBusiness(this.requireBusiness(req)),
    );
  };

  updateStatus = async (req: Request, res: Response): Promise<void> => {
    const parsed = z.object({ status: leadStatus }).safeParse(req.body);
    if (!parsed.success)
      throw new BadRequestError("Invalid lead status", parsed.error.flatten());
    res.json(
      await this.leadService.updateStatus(
        this.requireBusiness(req),
        req.params.id,
        parsed.data.status,
      ),
    );
  };

  update = async (req: Request, res: Response): Promise<void> => {
    const parsed = updateLeadSchema.safeParse(req.body);
    if (!parsed.success)
      throw new BadRequestError("Invalid lead update", parsed.error.flatten());
    res.json(
      await this.leadService.updateForBusiness(
        this.requireBusiness(req),
        req.params.id,
        parsed.data,
      ),
    );
  };

  addNote = async (req: Request, res: Response): Promise<void> => {
    const parsed = noteSchema.safeParse(req.body);
    if (!parsed.success)
      throw new BadRequestError("Invalid note", parsed.error.flatten());
    res.json(
      await this.leadService.addNote(
        this.requireBusiness(req),
        req.params.id,
        parsed.data.note,
      ),
    );
  };

  followUp = async (req: Request, res: Response): Promise<void> => {
    const parsed = followUpSchema.safeParse(req.body);
    if (!parsed.success)
      throw new BadRequestError("Invalid follow-up", parsed.error.flatten());
    res.json(
      await this.leadService.scheduleFollowUp(
        this.requireBusiness(req),
        req.params.id,
        parsed.data.nextFollowUpAt,
      ),
    );
  };

  private requireBusiness(req: Request): string {
    const businessId = req.auth?.businessId;
    if (!businessId)
      throw new ForbiddenError("Business account is not linked to a business");
    return businessId;
  }
}
