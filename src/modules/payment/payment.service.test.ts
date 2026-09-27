import { beforeEach, describe, expect, it, vi } from "vitest";
import { PricingService } from "@modules/pricing/pricing.service";
import { IPaymentRepository } from "./payment.entity";
import { PaymentService } from "./payment.service";

const { createPaymentIntent, constructEvent } = vi.hoisted(() => ({
  createPaymentIntent: vi.fn(),
  constructEvent: vi.fn(),
}));

vi.mock("stripe", () => ({
  default: class StripeMock {
    paymentIntents = { create: createPaymentIntent };
    webhooks = { constructEvent };
  },
}));

describe("PaymentService pricing", () => {
  beforeEach(() => {
    createPaymentIntent.mockReset().mockResolvedValue({ id: "pi_123", client_secret: "secret" });
    constructEvent.mockReset();
  });

  it("charges and records the configured listing price and currency", async () => {
    const paymentRepository = {
      create: vi.fn().mockResolvedValue({ id: "payment-1" }),
    } as unknown as IPaymentRepository;
    const pricingService = {
      getConfig: vi.fn().mockResolvedValue({ freeListingLimit: 5, pricePerListing: 725.5, currency: "INR" }),
    } as unknown as PricingService;
    const service = new PaymentService(paymentRepository, "sk_test_dummy", pricingService);

    await expect(service.createListingPaymentIntent("business-1", "property-1")).resolves.toEqual({
      clientSecret: "secret",
      paymentId: "payment-1",
    });

    expect(createPaymentIntent).toHaveBeenCalledWith({
      amount: 72550,
      currency: "inr",
      metadata: { businessId: "business-1", propertyId: "property-1" },
    });
    expect(paymentRepository.create).toHaveBeenCalledWith({
      businessId: "business-1",
      propertyId: "property-1",
      amount: 725.5,
      currency: "INR",
      gatewayRef: "pi_123",
    });
  });

  it("marks a successful Stripe webhook payment as succeeded and returns its property", async () => {
    constructEvent.mockReturnValue({
      type: "payment_intent.succeeded",
      data: { object: { id: "pi_success", metadata: { propertyId: "property-1" } } },
    });
    const paymentRepository = {
      updateStatusByGatewayRef: vi.fn().mockResolvedValue({ id: "payment-1" }),
    } as unknown as IPaymentRepository;
    const pricingService = { getConfig: vi.fn() } as unknown as PricingService;
    const service = new PaymentService(paymentRepository, "sk_test_dummy", pricingService);

    await expect(service.handleWebhookEvent(Buffer.from("{}"), "signature", "webhook-secret"))
      .resolves.toEqual({ propertyId: "property-1", succeeded: true });
    expect(constructEvent).toHaveBeenCalledWith(Buffer.from("{}"), "signature", "webhook-secret");
    expect(paymentRepository.updateStatusByGatewayRef).toHaveBeenCalledWith("pi_success", "SUCCEEDED");
  });

  it("marks a failed Stripe webhook payment as failed and returns its property", async () => {
    constructEvent.mockReturnValue({
      type: "payment_intent.payment_failed",
      data: { object: { id: "pi_failed", metadata: { propertyId: "property-2" } } },
    });
    const paymentRepository = {
      updateStatusByGatewayRef: vi.fn().mockResolvedValue({ id: "payment-2" }),
    } as unknown as IPaymentRepository;
    const pricingService = { getConfig: vi.fn() } as unknown as PricingService;
    const service = new PaymentService(paymentRepository, "sk_test_dummy", pricingService);

    await expect(service.handleWebhookEvent(Buffer.from("{}"), "signature", "webhook-secret"))
      .resolves.toEqual({ propertyId: "property-2", succeeded: false });
    expect(paymentRepository.updateStatusByGatewayRef).toHaveBeenCalledWith("pi_failed", "FAILED");
  });

  it("processes a webhook event only once", async () => {
    const event = {
      id: "evt_123",
      type: "payment_intent.succeeded",
      data: { object: { id: "pi_idempotent", metadata: { propertyId: "property-1" }, amount_received: 72550, currency: "inr" } },
    };
    constructEvent.mockReturnValue(event);
    const paymentRepository = {
      findWebhookEvent: vi.fn().mockResolvedValueOnce(null).mockResolvedValueOnce({ id: "event-row", processingStatus: "PROCESSED" }),
      createWebhookEvent: vi.fn().mockResolvedValue({ id: "event-row", processingStatus: "PROCESSING" }),
      markWebhookEvent: vi.fn(),
      updateFromProvider: vi.fn().mockResolvedValue({ id: "payment-1" }),
    } as unknown as IPaymentRepository;
    const service = new PaymentService(paymentRepository, "sk_test_dummy", { getConfig: vi.fn() } as unknown as PricingService);

    await service.handleWebhookEvent(Buffer.from("{}"), "signature", "webhook-secret");
    const duplicate = await service.handleWebhookEvent(Buffer.from("{}"), "signature", "webhook-secret");

    expect(paymentRepository.updateFromProvider).toHaveBeenCalledTimes(1);
    expect(paymentRepository.markWebhookEvent).toHaveBeenCalledWith("event-row", "PROCESSED");
    expect(duplicate).toMatchObject({ duplicate: true, succeeded: false });
  });

  it("maps Stripe subscription updates into the subscription domain", async () => {
    constructEvent.mockReturnValue({
      id: "evt_subscription_updated",
      type: "customer.subscription.updated",
      data: { object: { id: "sub_stripe", status: "past_due", current_period_start: 1720000000, current_period_end: 1722600000, cancel_at_period_end: true, metadata: { subscriptionId: "sub_local" } } },
    });
    const paymentRepository = {
      findWebhookEvent: vi.fn().mockResolvedValue(null),
      createWebhookEvent: vi.fn().mockResolvedValue({ id: "event-row", processingStatus: "PROCESSING" }),
      markWebhookEvent: vi.fn(),
    } as unknown as IPaymentRepository;
    const subscriptionService = { syncFromProvider: vi.fn().mockResolvedValue({ id: "sub_local" }) };
    const service = new PaymentService(paymentRepository, "sk_test_dummy", { getConfig: vi.fn() } as unknown as PricingService, subscriptionService as any);

    await service.handleWebhookEvent(Buffer.from("{}"), "signature", "webhook-secret");

    expect(subscriptionService.syncFromProvider).toHaveBeenCalledWith(expect.objectContaining({
      subscriptionId: "sub_local",
      providerSubscriptionId: "sub_stripe",
      status: "past_due",
      cancelAtPeriodEnd: true,
    }));
  });
});