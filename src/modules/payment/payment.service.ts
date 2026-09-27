import Stripe from "stripe";
import { IPaymentRepository } from "./payment.entity";
import { logger } from "@common/logger/logger";

const DEFAULT_PRICE_PER_LISTING = 499; // in smallest currency unit handling is done by Stripe (paise for INR)
const CURRENCY = "inr";

export class PaymentService {
  private readonly stripe: Stripe;

  constructor(private readonly paymentRepo: IPaymentRepository, stripeSecretKey: string) {
    this.stripe = new Stripe(stripeSecretKey, { apiVersion: "2024-06-20" });
  }

  /** Creates a Stripe PaymentIntent for a single paid listing and records it as PENDING. */
  async createListingPaymentIntent(businessId: string, propertyId: string): Promise<{ clientSecret: string; paymentId: string }> {
    const intent = await this.stripe.paymentIntents.create({
      amount: DEFAULT_PRICE_PER_LISTING * 100,
      currency: CURRENCY,
      metadata: { businessId, propertyId },
    });

    const payment = await this.paymentRepo.create({
      businessId,
      propertyId,
      amount: DEFAULT_PRICE_PER_LISTING,
      currency: CURRENCY.toUpperCase(),
      gatewayRef: intent.id,
    });

    return { clientSecret: intent.client_secret as string, paymentId: payment.id };
  }

  /** Called from the Stripe webhook route. Verifies signature and updates payment status. */
  async handleWebhookEvent(rawBody: Buffer, signature: string, webhookSecret: string) {
    const event = this.stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);

    if (event.type === "payment_intent.succeeded") {
      const intent = event.data.object as Stripe.PaymentIntent;
      const payment = await this.paymentRepo.updateStatusByGatewayRef(intent.id, "SUCCEEDED");
      logger.info("payment succeeded", { gatewayRef: intent.id, paymentId: payment?.id });
      return { propertyId: intent.metadata.propertyId, succeeded: true };
    }

    if (event.type === "payment_intent.payment_failed") {
      const intent = event.data.object as Stripe.PaymentIntent;
      await this.paymentRepo.updateStatusByGatewayRef(intent.id, "FAILED");
      logger.warn("payment failed", { gatewayRef: intent.id });
      return { propertyId: intent.metadata.propertyId, succeeded: false };
    }

    return { propertyId: null, succeeded: false };
  }

  async history(businessId: string) {
    return this.paymentRepo.listByBusiness(businessId);
  }
}
