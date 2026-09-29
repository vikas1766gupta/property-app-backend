import { Request, Response } from "express";
import { z } from "zod";
import { BadRequestError, ForbiddenError } from "@common/errors/AppError";
import { TrustService } from "./trust.service";

const entityType = z.enum(["BUSINESS", "PROPERTY", "PROJECT"]);
const reasons = z.enum([
  "FAKE_PROPERTY",
  "WRONG_PRICE",
  "DUPLICATE",
  "SPAM",
  "SCAM",
  "WRONG_INFORMATION",
  "OTHER",
]);
const reportSchema = z
  .object({
    entityType,
    entityId: z.string().min(1),
    reason: reasons,
    description: z.string().trim().min(5).max(2000),
  })
  .strict();
const reportModerationSchema = z
  .object({
    status: z.enum([
      "OPEN",
      "UNDER_REVIEW",
      "DISMISSED",
      "SUSPENDED",
      "REJECTED",
      "RESOLVED",
    ]),
    notes: z.string().trim().max(2000).optional(),
  })
  .strict();
const verificationSchema = z
  .object({
    status: z.enum([
      "PENDING",
      "UNDER_REVIEW",
      "VERIFIED",
      "REJECTED",
      "SUSPENDED",
      "EXPIRED",
    ]),
    reason: z.string().trim().max(500).optional(),
    notes: z.string().trim().max(2000).optional(),
  })
  .strict();
const verificationCreateSchema = z
  .object({
    entityType,
    entityId: z.string().min(1),
    verificationType: z.enum(["BUSINESS", "PROPERTY", "PROJECT", "RERA"]),
    notes: z.string().trim().max(2000).optional(),
  })
  .strict();

export class TrustController {
  constructor(private readonly service: TrustService) {}
  createReport = async (req: Request, res: Response): Promise<void> => {
    const parsed = reportSchema.safeParse(req.body);
    if (!parsed.success)
      throw new BadRequestError("Invalid report", parsed.error.flatten());
    res
      .status(201)
      .json(
        await this.service.createReport({
          ...parsed.data,
          reporterId: req.auth?.userId,
        }),
      );
  };
  listReports = async (req: Request, res: Response): Promise<void> => {
    res.json(
      await this.service.listReports(
        typeof req.query.status === "string"
          ? (req.query.status as never)
          : undefined,
      ),
    );
  };
  moderateReport = async (req: Request, res: Response): Promise<void> => {
    const parsed = reportModerationSchema.safeParse(req.body);
    if (!parsed.success)
      throw new BadRequestError(
        "Invalid report moderation",
        parsed.error.flatten(),
      );
    res.json(
      await this.service.moderateReport(req.params.id, {
        ...parsed.data,
        reviewedBy: req.auth!.userId,
      }),
    );
  };
  reviewVerification = async (req: Request, res: Response): Promise<void> => {
    const parsed = verificationSchema.safeParse(req.body);
    if (!parsed.success)
      throw new BadRequestError(
        "Invalid verification review",
        parsed.error.flatten(),
      );
    res.json(
      await this.service.reviewVerification(req.params.id, {
        ...parsed.data,
        reviewedBy: req.auth!.userId,
      }),
    );
  };
  createVerification = async (req: Request, res: Response): Promise<void> => {
    const parsed = verificationCreateSchema.safeParse(req.body);
    if (!parsed.success)
      throw new BadRequestError(
        "Invalid verification request",
        parsed.error.flatten(),
      );
    res.status(201).json(await this.service.createVerification(parsed.data));
  };
  requireAdmin(req: Request): void {
    if (!req.auth?.userId)
      throw new ForbiddenError("Admin authentication required");
  }
}
