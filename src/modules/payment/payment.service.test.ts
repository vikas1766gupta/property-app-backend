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
});