import { Request, Response } from "express";
import { z } from "zod";
import { BadRequestError, ForbiddenError } from "@common/errors/AppError";
import { LeadService } from "@modules/lead/lead.service";
import { ProjectService } from "./project.service";

const mediaRef = z.object({
  id: z.string().min(1).max(64),
  mediaType: z.enum(["GALLERY", "FLOOR_PLAN", "BROCHURE", "SITE_PLAN"]),
  sortOrder: z.number().int().nonnegative().optional(),
});
const projectFields = {
  name: z.string().trim().min(2).max(150),
  description: z.string().trim().min(20),
  propertyType: z.string().trim().min(2).max(80),
  city: z.string().trim().min(2).max(100),
  locality: z.string().trim().min(2).max(100),
  address: z.string().trim().min(5).max(255),
  latitude: z.number().min(-90).max(90).nullable().optional(),
  longitude: z.number().min(-180).max(180).nullable().optional(),
  priceFrom: z.number().nonnegative().nullable().optional(),
  priceTo: z.number().nonnegative().nullable().optional(),
  areaFrom: z.number().int().positive().nullable().optional(),
  areaTo: z.number().int().positive().nullable().optional(),
  totalUnits: z.number().int().positive(),
  availableUnits: z.number().int().nonnegative(),
  possessionDate: z.coerce.date().nullable().optional(),
  status: z
    .enum(["DRAFT", "PUBLISHED", "SOLD_OUT", "SUSPENDED", "COMPLETED"])
    .optional(),
  reraNumber: z.string().trim().max(100).nullable().optional(),
  reraStatus: z
    .enum(["PENDING", "VERIFIED", "NOT_APPLICABLE", "REJECTED"])
    .optional(),
  amenities: z.array(z.string().trim().min(1).max(80)).max(50).optional(),
  mediaRefs: z.array(mediaRef).max(100).optional(),
};
const createSchema = z
  .object(projectFields)
  .strict()
  .superRefine((value, context) => {
    if (
      value.priceFrom !== null &&
      value.priceTo !== null &&
      value.priceFrom !== undefined &&
      value.priceTo !== undefined &&
      value.priceFrom > value.priceTo
    )
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["priceFrom"],
        message: "Starting price cannot exceed ending price",
      });
    if (value.availableUnits > value.totalUnits)
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["availableUnits"],
        message: "Available units cannot exceed total units",
      });
  });
const updateSchema = z
  .object(projectFields)
  .strict()
  .partial()
  .refine(
    (value) => Object.keys(value).length > 0,
    "At least one project field must be provided",
  );
const searchSchema = z.object({
  city: z.string().optional(),
  locality: z.string().optional(),
  minPrice: z.coerce.number().nonnegative().optional(),
  maxPrice: z.coerce.number().nonnegative().optional(),
  propertyType: z.string().optional(),
  possessionStatus: z.enum(["READY", "UPCOMING"]).optional(),
  verified: z.coerce.boolean().optional(),
  reraStatus: z
    .enum(["PENDING", "VERIFIED", "NOT_APPLICABLE", "REJECTED"])
    .optional(),
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().max(50).optional(),
});
const enquirySchema = z.object({
  name: z.string().trim().min(2).max(100),
  contact: z.string().trim().min(5).max(150),
  message: z.string().trim().min(5).max(2000),
});

export class ProjectController {
  constructor(
    private readonly projectService: ProjectService,
    private readonly leadService: LeadService,
  ) {}

  create = async (req: Request, res: Response): Promise<void> => {
    if (!req.auth?.businessId)
      throw new ForbiddenError("Builder account required");
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success)
      throw new BadRequestError(
        "Invalid project payload",
        parsed.error.flatten(),
      );
    res
      .status(201)
      .json(
        await this.projectService.create({
          ...parsed.data,
          builderId: req.auth.businessId,
        }),
      );
  };
  list = async (req: Request, res: Response): Promise<void> => {
    if (!req.auth?.businessId)
      throw new ForbiddenError("Builder account required");
    res.json(await this.projectService.listForBuilder(req.auth.businessId));
  };
  search = async (req: Request, res: Response): Promise<void> => {
    const parsed = searchSchema.safeParse(req.query);
    if (!parsed.success)
      throw new BadRequestError(
        "Invalid project filters",
        parsed.error.flatten(),
      );
    res.json(await this.projectService.search(parsed.data));
  };
  getById = async (req: Request, res: Response): Promise<void> => {
    res.json(await this.projectService.getPublic(req.params.id));
  };
  update = async (req: Request, res: Response): Promise<void> => {
    if (!req.auth?.businessId)
      throw new ForbiddenError("Builder account required");
    const parsed = updateSchema.safeParse(req.body);
    if (!parsed.success)
      throw new BadRequestError(
        "Invalid project update",
        parsed.error.flatten(),
      );
    res.json(
      await this.projectService.update(
        req.params.id,
        req.auth.businessId,
        parsed.data,
      ),
    );
  };
  remove = async (req: Request, res: Response): Promise<void> => {
    if (!req.auth?.businessId)
      throw new ForbiddenError("Builder account required");
    await this.projectService.remove(req.params.id, req.auth.businessId);
    res.status(204).send();
  };
  enquiry = async (req: Request, res: Response): Promise<void> => {
    const parsed = enquirySchema.safeParse(req.body);
    if (!parsed.success)
      throw new BadRequestError(
        "Invalid project enquiry",
        parsed.error.flatten(),
      );
    res
      .status(201)
      .json(
        await this.leadService.submitProjectLead(req.params.id, {
          ...parsed.data,
          userId: req.auth?.userId,
        }),
      );
  };
}
