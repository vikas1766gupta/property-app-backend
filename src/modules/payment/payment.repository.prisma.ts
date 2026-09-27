import { PrismaClient, Payment as PrismaPayment } from "@prisma/client";
import { IPaymentRepository, PaymentEntity, PaymentStatus } from "./payment.entity";

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
      row.createdAt
    );
  }

  async create(data: { businessId: string; propertyId: string; amount: number; currency: string; gatewayRef: string }) {
    const row = await this.prisma.payment.create({
      data: {
        businessId: data.businessId,
        propertyId: data.propertyId,
        amount: data.amount,
        currency: data.currency,
        gatewayRef: data.gatewayRef,
        status: "PENDING",
      },
    });
    return this.toEntity(row);
  }

  async updateStatusByGatewayRef(gatewayRef: string, status: PaymentStatus) {
    const existing = await this.prisma.payment.findFirst({ where: { gatewayRef } });
    if (!existing) return null;
    const row = await this.prisma.payment.update({ where: { id: existing.id }, data: { status } });
    return this.toEntity(row);
  }

  async listByBusiness(businessId: string) {
    const rows = await this.prisma.payment.findMany({ where: { businessId }, orderBy: { createdAt: "desc" } });
    return rows.map((r) => this.toEntity(r));
  }
}
