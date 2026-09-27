export type PaymentStatus = "PENDING" | "SUCCEEDED" | "FAILED" | "REFUNDED";

export class PaymentEntity {
  constructor(
    public id: string,
    public businessId: string,
    public propertyId: string | null,
    public amount: number,
    public currency: string,
    public status: PaymentStatus,
    public gatewayRef: string | null,
    public createdAt: Date
  ) {}
}

export interface IPaymentRepository {
  create(data: {
    businessId: string;
    propertyId: string;
    amount: number;
    currency: string;
    gatewayRef: string;
  }): Promise<PaymentEntity>;
  updateStatusByGatewayRef(gatewayRef: string, status: PaymentStatus): Promise<PaymentEntity | null>;
  listByBusiness(businessId: string): Promise<PaymentEntity[]>;
}
