import { Request, Response } from "express";
import { z } from "zod";
import { BadRequestError, ForbiddenError } from "@common/errors/AppError";
import { AnalyticsEventType } from "./analytics.entity";
import { AnalyticsService } from "./analytics.service";
import { EntitlementService } from "@modules/subscription/entitlement.service";

const eventSchema = z
  .object({
    event: z.enum([
      "PROPERTY_VIEW",
      "SEARCH",
      "FAVORITE",
      "CONTACT_CLICK",
      "CALL_CLICK",
      "WHATSAPP_CLICK",
      "LEAD_CREATED",
      "SITE_VISIT_REQUESTED",
      "PROPERTY_CREATED",
      "PROPERTY_FEATURED",
      "SUBSCRIPTION_PURCHASED",
      "PAYMENT_COMPLETED",
      "PROJECT_VIEW",
    ]),
    propertyId: z.string().min(1).optional(),
    projectId: z.string().min(1).optional(),
    city: z.string().max(100).optional(),
    propertyType: z.string().max(100).optional(),
    metadata: z.record(z.unknown()).optional(),
  })
  .strict();

export class AnalyticsController {
  constructor(
    private readonly analyticsService: AnalyticsService,
    private readonly entitlementService?: EntitlementService,
  ) {}

  record = async (req: Request, res: Response): Promise<void> => {
    const parsed = eventSchema.safeParse(req.body);
    if (!parsed.success)
      throw new BadRequestError(
        "Invalid analytics event",
        parsed.error.flatten(),
      );
    await this.analyticsService.record({
      ...parsed.data,
      event: parsed.data.event as AnalyticsEventType,
      userId: req.auth?.userId,
    });
    res.status(202).send();
  };

  business = async (req: Request, res: Response): Promise<void> => {
    if (!req.auth?.businessId)
      throw new ForbiddenError("Business account required");
    await this.requireAnalytics(req.auth.businessId);
    res.json(
      await this.analyticsService.businessSummary(
        req.auth.businessId,
        this.days(req),
      ),
    );
  };

  builder = async (req: Request, res: Response): Promise<void> => {
    if (!req.auth?.businessId)
      throw new ForbiddenError("Business account required");
    await this.requireAnalytics(req.auth.businessId);
    res.json(
      await this.analyticsService.builderSummary(
        req.auth.businessId,
        this.days(req),
      ),
    );
  };

  admin = async (req: Request, res: Response): Promise<void> => {
    res.json(await this.analyticsService.adminSummary(this.days(req)));
  };

  private days(req: Request): number | undefined {
    const raw = req.query.days;
    if (raw === undefined) return undefined;
    const parsed = Number(raw);
    if (!Number.isInteger(parsed))
      throw new BadRequestError("Invalid analytics range");
    return parsed;
  }

  private async requireAnalytics(businessId: string): Promise<void> {
    if (
      this.entitlementService &&
      !(await this.entitlementService.canUseAnalytics(businessId))
    )
      throw new ForbiddenError("Analytics is not included in the current plan");
  }
}
