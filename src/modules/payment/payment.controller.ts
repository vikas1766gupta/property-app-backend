import { Request, Response } from "express";
import { PaymentService } from "./payment.service";
import { PropertyService } from "@modules/property/property.service";
import { ForbiddenError, BadRequestError } from "@common/errors/AppError";
import { SubscriptionService } from "@modules/subscription/subscription.service";
import { env } from "@config/env";

export class PaymentController {
  constructor(
    private readonly paymentService: PaymentService,
    private readonly propertyService: PropertyService,
    private readonly subscriptionService?: SubscriptionService,
  ) {}

  createIntent = async (req: Request, res: Response): Promise<void> => {
    if (!req.auth?.businessId)
      throw new ForbiddenError("Business account required");
    const { propertyId } = req.body as { propertyId?: string };
    if (!propertyId) throw new BadRequestError("propertyId is required");
    const result = await this.paymentService.createListingPaymentIntent(
      req.auth.businessId,
      propertyId,
    );
    res.status(201).json(result);
  };

  history = async (req: Request, res: Response): Promise<void> => {
    if (!req.auth?.businessId)
      throw new ForbiddenError("Business account required");
    res.json(await this.paymentService.history(req.auth.businessId));
  };

  /** Stripe webhook — must receive the RAW body, mounted before the JSON body parser. */
  webhook = async (req: Request, res: Response): Promise<void> => {
    const signature = req.headers["stripe-signature"] as string;
    await this.paymentService.handleWebhookEvent(
      req.body,
      signature,
      env.stripeWebhookSecret,
    );
    res.json({ received: true });
  };
}
