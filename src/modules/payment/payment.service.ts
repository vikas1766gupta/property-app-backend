import Stripe from "stripe";
import { IPaymentRepository } from "./payment.entity";
import { AppError } from "@common/errors/AppError";
import { logger } from "@common/logger/logger";
import { PricingService } from "@modules/pricing/pricing.service";
import { SubscriptionService } from "@modules/subscription/subscription.service";
import { AnalyticsService } from "@modules/analytics/analytics.service";

export class PaymentService {
  private readonly stripe: Stripe | null;
  private listingPublisher?: (propertyId: string) => Promise<unknown>;
  private promotionActivator?: (promotionId: string) => Promise<unknown>;

  constructor(
    private readonly paymentRepo: IPaymentRepository,
    stripeSecretKey: string,
    private readonly pricingService: PricingService,
    private readonly subscriptionService?: SubscriptionService,
    private readonly analyticsService?: AnalyticsService
  ) {
    this.stripe = stripeSecretKey ? new Stripe(stripeSecretKey, { apiVersion: "2024-06-20" }) : null;
  }

  isConfigured(): boolean { return this.stripe !== null; }

  private requireStripe(): Stripe {
    if (!this.stripe) throw new AppError(503, "Payments are not configured. Set STRIPE_SECRET_KEY on the backend.");
    return this.stripe;
  }

  setListingPublisher(publisher: (propertyId: string) => Promise<unknown>): void {
    this.listingPublisher = publisher;
  }

  setPromotionActivator(activator: (promotionId: string) => Promise<unknown>): void { this.promotionActivator = activator; }

  async createPromotionPaymentIntent(businessId: string, promotionId: string, amount: number, currency: string) {
    const normalizedCurrency = currency.toUpperCase();
    const fractionDigits = new Intl.NumberFormat('en', { style: 'currency', currency: normalizedCurrency }).resolvedOptions().maximumFractionDigits ?? 2;
    const intent = await this.requireStripe().paymentIntents.create({ amount: Math.round(amount * 10 ** fractionDigits), currency: normalizedCurrency.toLowerCase(), metadata: { businessId, promotionId } });
    const payment = await this.paymentRepo.create({ businessId, amount, currency: normalizedCurrency, gatewayRef: intent.id });
    return { clientSecret: intent.client_secret as string, paymentId: payment.id };
  }

  /** Creates a Stripe PaymentIntent for a single paid listing and records it as PENDING. */
  async createListingPaymentIntent(businessId: string, propertyId: string): Promise<{ clientSecret: string; paymentId: string }> {
    const pricing = await this.pricingService.getConfig();
    const currency = pricing.currency.toUpperCase();
    const fractionDigits = new Intl.NumberFormat("en", { style: "currency", currency }).resolvedOptions().maximumFractionDigits ?? 2;
    const amountInMinorUnits = Math.round(pricing.pricePerListing * 10 ** fractionDigits);
    const intent = await this.requireStripe().paymentIntents.create({
      amount: amountInMinorUnits,
      currency: currency.toLowerCase(),
      metadata: { businessId, propertyId },
    });

    const payment = await this.paymentRepo.create({
      businessId,
      propertyId,
      amount: pricing.pricePerListing,
      currency,
      gatewayRef: intent.id,
    });

    return { clientSecret: intent.client_secret as string, paymentId: payment.id };
  }

  async createSubscriptionPaymentIntent(businessId: string, subscriptionId: string, amount: number, currency: string) {
    const normalizedCurrency = currency.toUpperCase();
    const fractionDigits = new Intl.NumberFormat("en", { style: "currency", currency: normalizedCurrency }).resolvedOptions().maximumFractionDigits ?? 2;
    const intent = await this.requireStripe().paymentIntents.create({
      amount: Math.round(amount * 10 ** fractionDigits),
      currency: normalizedCurrency.toLowerCase(),
      metadata: { businessId, subscriptionId },
    });
    const payment = await this.paymentRepo.create({ businessId, subscriptionId, amount, currency: normalizedCurrency, gatewayRef: intent.id });
    return { clientSecret: intent.client_secret as string, paymentId: payment.id, subscriptionId };
  }

  /** Called from the Stripe webhook route. Verifies signature and updates payment status. */
  async handleWebhookEvent(rawBody: Buffer, signature: string, webhookSecret: string) {
    const event = this.requireStripe().webhooks.constructEvent(rawBody, signature, webhookSecret);
    const eventId = event.id;
    const eventRecord = await this.claimWebhookEvent(eventId, event.type);
    if (eventRecord === "DUPLICATE") return { propertyId: null, subscriptionId: null, succeeded: false, duplicate: true };

    try {
      const result = await this.processStripeEvent(event);
      if (eventRecord) await this.paymentRepo.markWebhookEvent?.(eventRecord, "PROCESSED");
      return result;
    } catch (error) {
      if (eventRecord) await this.paymentRepo.markWebhookEvent?.(eventRecord, "FAILED");
      throw error;
    }
  }

  private async claimWebhookEvent(eventId: string, eventType: string): Promise<string | "DUPLICATE" | null> {
    if (!eventId || !this.paymentRepo.findWebhookEvent || !this.paymentRepo.createWebhookEvent) return null;
    const existing = await this.paymentRepo.findWebhookEvent("stripe", eventId);
    if (existing?.processingStatus === "PROCESSED" || existing?.processingStatus === "PROCESSING") return "DUPLICATE";
    if (existing) return existing.id;
    try {
      const created = await this.paymentRepo.createWebhookEvent({ provider: "stripe", eventId, eventType });
      return created.id;
    } catch (error: any) {
      if (error?.code !== "P2002") throw error;
      const concurrent = await this.paymentRepo.findWebhookEvent("stripe", eventId);
      return concurrent?.processingStatus === "FAILED" ? concurrent.id : "DUPLICATE";
    }
  }

  private async processStripeEvent(event: Stripe.Event) {
    const object = event.data.object as Stripe.Event.Data.Object & Record<string, any>;
    const metadata = object.metadata ?? {};
    const paymentIntentId = typeof object.payment_intent === "string" ? object.payment_intent : undefined;
    const providerSubscriptionId = typeof object.subscription === "string" ? object.subscription : undefined;
    const customerId = typeof object.customer === "string" ? object.customer : undefined;

    if (event.type === "payment_intent.succeeded" || event.type === "payment_intent.payment_failed") {
      const status = event.type === "payment_intent.succeeded" ? "SUCCEEDED" : "FAILED";
      const payment = await this.paymentRepo.updateFromProvider?.({
        gatewayRef: object.id,
        providerPaymentId: object.id,
        providerCustomerId: customerId,
        providerSubscriptionId,
        amount: typeof object.amount_received === "number" ? object.amount_received / 100 : undefined,
        currency: typeof object.currency === "string" ? object.currency.toUpperCase() : undefined,
        status,
      });
      if (!payment) await this.paymentRepo.updateStatusByGatewayRef(object.id, status);
      if (status === "SUCCEEDED") {
        await this.analyticsService?.record({ event: "PAYMENT_COMPLETED", businessId: payment?.businessId ?? metadata.businessId, propertyId: metadata.propertyId, metadata: { gatewayRef: object.id } });
        if (metadata.subscriptionId) await this.analyticsService?.record({ event: "SUBSCRIPTION_PURCHASED", businessId: payment?.businessId ?? metadata.businessId, metadata: { subscriptionId: metadata.subscriptionId } });
      }
      if (status === "SUCCEEDED" && metadata.propertyId) await this.listingPublisher?.(metadata.propertyId);
      if (status === "SUCCEEDED" && metadata.promotionId) await this.promotionActivator?.(metadata.promotionId);
      if (event.type === "payment_intent.succeeded" && metadata.subscriptionId) {
        await this.subscriptionService?.activateFromPayment(metadata.subscriptionId, providerSubscriptionId);
      }
      logger.info(`payment ${status.toLowerCase()}`, { providerPaymentId: object.id, paymentId: payment?.id });
      return { propertyId: metadata.propertyId ?? null, ...(metadata.subscriptionId ? { subscriptionId: metadata.subscriptionId } : {}), ...(metadata.promotionId ? { promotionId: metadata.promotionId } : {}), succeeded: status === "SUCCEEDED" };
    }

    if (event.type === "checkout.session.completed") {
      if (paymentIntentId) await this.paymentRepo.updateFromProvider?.({ gatewayRef: paymentIntentId, providerPaymentId: paymentIntentId, providerCustomerId: customerId, providerSubscriptionId, status: "SUCCEEDED" });
      if (metadata.propertyId) await this.listingPublisher?.(metadata.propertyId);
      if (metadata.promotionId) await this.promotionActivator?.(metadata.promotionId);
      if (metadata.subscriptionId) await this.subscriptionService?.activateFromPayment(metadata.subscriptionId, providerSubscriptionId);
      return { propertyId: metadata.propertyId ?? null, ...(metadata.subscriptionId ? { subscriptionId: metadata.subscriptionId } : {}), ...(metadata.promotionId ? { promotionId: metadata.promotionId } : {}), succeeded: true };
    }

    if (event.type.startsWith("customer.subscription.")) {
      await this.subscriptionService?.syncFromProvider({
        subscriptionId: metadata.subscriptionId,
        providerSubscriptionId: object.id,
        status: event.type.endsWith("deleted") ? "canceled" : object.status,
        currentPeriodStart: object.current_period_start ? new Date(object.current_period_start * 1000) : undefined,
        currentPeriodEnd: object.current_period_end ? new Date(object.current_period_end * 1000) : undefined,
        cancelAtPeriodEnd: Boolean(object.cancel_at_period_end),
      });
    }

    if (event.type === "invoice.paid" || event.type === "invoice.payment_failed") {
      const status = event.type === "invoice.paid" ? "SUCCEEDED" : "FAILED";
      if (paymentIntentId) await this.paymentRepo.updateFromProvider?.({
        gatewayRef: paymentIntentId,
        providerPaymentId: paymentIntentId,
        providerCustomerId: customerId,
        providerSubscriptionId,
        amount: typeof object.amount_paid === "number" ? object.amount_paid / 100 : typeof object.amount_due === "number" ? object.amount_due / 100 : undefined,
        currency: typeof object.currency === "string" ? object.currency.toUpperCase() : undefined,
        status,
      });
      if (providerSubscriptionId) await this.subscriptionService?.syncFromProvider({ providerSubscriptionId, status: status === "SUCCEEDED" ? "active" : "past_due" });
      return { propertyId: null, subscriptionId: metadata.subscriptionId ?? null, succeeded: status === "SUCCEEDED" };
    }

    return { propertyId: null, subscriptionId: null, succeeded: false };
  }

  async history(businessId: string) {
    return this.paymentRepo.listByBusiness(businessId);
  }
}
