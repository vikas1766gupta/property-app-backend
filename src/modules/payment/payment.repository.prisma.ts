import { PrismaClient, Payment as PrismaPayment } from "@prisma/client";
import {
  IPaymentRepository,
  PaymentEntity,
  PaymentStatus,
  WebhookProcessingStatus,
} from "./payment.entity";

export class PaymentRepositoryPrisma implements IPaymentRepository {
  constructor(private readonly prisma: PrismaClient) {}

  private toEntity(row: PrismaPayment): PaymentEntity {
    return new PaymentEntity(
      row.id,
      row.businessId,
      row.propertyId,
      Number(row.amount),
      row.currency,
      row.status,
      row.gatewayRef,
      row.createdAt,
      row.providerPaymentId,
      row.providerCustomerId,
      row.providerSubscriptionId,
    );
  }

  async create(data: {
    businessId: string;
    propertyId?: string | null;
    subscriptionId?: string | null;
    amount: number;
    currency: string;
    gatewayRef: string;
  }) {
    const row = await this.prisma.payment.create({
      data: {
        businessId: data.businessId,
        propertyId: data.propertyId ?? null,
        subscriptionId: data.subscriptionId ?? null,
        amount: data.amount,
        currency: data.currency,
        gatewayRef: data.gatewayRef,
        status: "PENDING",
      },
    });
    return this.toEntity(row);
  }

  async updateStatusByGatewayRef(gatewayRef: string, status: PaymentStatus) {
    const existing = await this.prisma.payment.findFirst({
      where: { gatewayRef },
    });
    if (!existing) return null;
    const row = await this.prisma.payment.update({
      where: { id: existing.id },
      data: { status },
    });
    return this.toEntity(row);
  }

  async updateFromProvider(data: {
    gatewayRef?: string;
    providerPaymentId?: string;
    providerCustomerId?: string | null;
    providerSubscriptionId?: string | null;
    amount?: number;
    currency?: string;
    status: PaymentStatus;
  }) {
    const existing = await this.prisma.payment.findFirst({
      where: {
        OR: [
          { gatewayRef: data.gatewayRef },
          { providerPaymentId: data.providerPaymentId },
        ].filter((item) => Object.values(item)[0]),
      },
    });
    if (!existing) return null;
    const row = await this.prisma.payment.update({
      where: { id: existing.id },
      data: {
        status: data.status,
        providerPaymentId: data.providerPaymentId,
        providerCustomerId: data.providerCustomerId,
        providerSubscriptionId: data.providerSubscriptionId,
        amount: data.amount,
        currency: data.currency,
      },
    });
    return this.toEntity(row);
  }

  async findWebhookEvent(provider: string, eventId: string) {
    return this.prisma.webhookEvent.findUnique({
      where: { provider_eventId: { provider, eventId } },
      select: { id: true, processingStatus: true },
    });
  }

  async createWebhookEvent(data: {
    provider: string;
    eventId: string;
    eventType: string;
  }) {
    return this.prisma.webhookEvent.create({
      data,
      select: { id: true, processingStatus: true },
    });
  }

  async markWebhookEvent(id: string, status: WebhookProcessingStatus) {
    await this.prisma.webhookEvent.update({
      where: { id },
      data: {
        processingStatus: status,
        processedAt: status === "PROCESSED" ? new Date() : null,
      },
    });
  }

  async listByBusiness(businessId: string) {
    const rows = await this.prisma.payment.findMany({
      where: { businessId },
      orderBy: { createdAt: "desc" },
    });
    return rows.map((r) => this.toEntity(r));
  }
}
