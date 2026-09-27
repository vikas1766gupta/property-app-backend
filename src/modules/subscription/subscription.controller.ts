import { Request, Response } from "express";
import { AppError, ForbiddenError, BadRequestError } from "../../common/errors/AppError";
import { EntitlementService } from "./entitlement.service";
import { PlanService } from "./plan.service";
import { SubscriptionService } from "./subscription.service";
import { PaymentService } from "../payment/payment.service";

export class SubscriptionController {
  constructor(
    private readonly planService: PlanService,
    private readonly subscriptionService: SubscriptionService,
    private readonly entitlementService: EntitlementService,
    private readonly paymentService: PaymentService
  ) {}

  plans = async (req: Request, res: Response): Promise<void> => {
    res.setHeader("Cache-Control", "no-store");
    res.json(await this.planService.list(req.auth?.role === "BUSINESS" ? undefined : undefined));
  };

  mine = async (req: Request, res: Response): Promise<void> => {
    const businessId = this.businessId(req);
    res.json(await this.subscriptionService.getMine(businessId));
  };

  create = async (req: Request, res: Response): Promise<void> => {
    const businessId = this.businessId(req);
    const { planId } = req.body as { planId?: string };
    if (!planId) throw new BadRequestError("planId is required");
    const plan = await this.planService.getById(planId);
    if (!plan || !plan.isActive) throw new BadRequestError("Plan not found or inactive");
    if (plan.price > 0 && !this.paymentService.isConfigured()) {
      throw new AppError(503, "Payments are not configured. Set STRIPE_SECRET_KEY on the backend.");
    }
    const subscription = await this.subscriptionService.create(businessId, planId);
    const checkout = subscription.plan.price > 0
      ? await this.paymentService.createSubscriptionPaymentIntent(businessId, subscription.id, subscription.plan.price, subscription.plan.currency)
      : null;
    res.status(201).json({ subscription, checkout });
  };

  cancel = async (req: Request, res: Response): Promise<void> => {
    res.json(await this.subscriptionService.cancel(this.businessId(req), req.params.id));
  };

  history = async (req: Request, res: Response): Promise<void> => {
    res.json(await this.subscriptionService.history(this.businessId(req)));
  };

  entitlements = async (req: Request, res: Response): Promise<void> => {
    res.json(await this.entitlementService.getEntitlements(this.businessId(req)));
  };

  private businessId(req: Request): string {
    if (!req.auth?.businessId) throw new ForbiddenError("Business account required");
    return req.auth.businessId;
  }
}
