export type PaymentStatus = "PENDING" | "SUCCEEDED" | "FAILED" | "REFUNDED";

export type WebhookProcessingStatus = "PROCESSING" | "PROCESSED" | "FAILED";

export class PaymentEntity {
  constructor(
    public id: string,
    public businessId: string,
    public propertyId: string | null,
    public amount: number,
    public currency: string,
    public status: PaymentStatus,
    public gatewayRef: string | null,
    public createdAt: Date,
    public providerPaymentId: string | null = null,
    public providerCustomerId: string | null = null,
    public providerSubscriptionId: string | null = null,
  ) {}
}

export interface IPaymentRepository {
  create(data: {
    businessId: string;
    propertyId?: string | null;
    subscriptionId?: string | null;
    amount: number;
    currency: string;
    gatewayRef: string;
  }): Promise<PaymentEntity>;
  updateStatusByGatewayRef(
    gatewayRef: string,
    status: PaymentStatus,
  ): Promise<PaymentEntity | null>;
  updateFromProvider?(data: {
    gatewayRef?: string;
    providerPaymentId?: string;
    providerCustomerId?: string | null;
    providerSubscriptionId?: string | null;
    amount?: number;
    currency?: string;
    status: PaymentStatus;
  }): Promise<PaymentEntity | null>;
  findWebhookEvent?(
    provider: string,
    eventId: string,
  ): Promise<{ id: string; processingStatus: WebhookProcessingStatus } | null>;
  createWebhookEvent?(data: {
    provider: string;
    eventId: string;
    eventType: string;
  }): Promise<{ id: string; processingStatus: WebhookProcessingStatus }>;
  markWebhookEvent?(id: string, status: WebhookProcessingStatus): Promise<void>;
  listByBusiness(businessId: string): Promise<PaymentEntity[]>;
}
