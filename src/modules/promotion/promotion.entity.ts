export type PromotionType = 'FEATURED' | 'PREMIUM' | 'HOMEPAGE' | 'SEARCH_PRIORITY';
export type PromotionStatus = 'PENDING_PAYMENT' | 'SCHEDULED' | 'ACTIVE' | 'EXPIRED' | 'CANCELLED';
export type PromotionTargetType = 'PROPERTY' | 'PROJECT';
export type CustomerType = 'OWNER' | 'BROKER' | 'BUILDER';

export interface PromotionConfig {
  id: string;
  type: PromotionType;
  price: number;
  durationDays: number;
  allowedCustomerTypes: CustomerType[];
  priorityWeight: number;
  isActive: boolean;
}

export interface PromotionEntity {
  id: string;
  propertyId: string | null;
  projectId: string | null;
  businessId: string;
  type: PromotionType;
  startAt: Date;
  endAt: Date;
  status: PromotionStatus;
  paymentId: string | null;
  priorityWeight: number;
}

export interface PromotionRepository {
  listConfigs(): Promise<PromotionConfig[]>;
  findConfig(type: PromotionType): Promise<PromotionConfig | null>;
  saveConfig(input: Omit<PromotionConfig, 'id'>): Promise<PromotionConfig>;
  findById(id: string): Promise<PromotionEntity | null>;
  findPendingOrActive(input: { businessId: string; propertyId?: string; projectId?: string; type: PromotionType }): Promise<PromotionEntity | null>;
  create(input: Omit<PromotionEntity, 'id'>): Promise<PromotionEntity>;
  attachPayment(id: string, paymentId: string): Promise<PromotionEntity>;
  activate(id: string, startAt: Date): Promise<PromotionEntity>;
  activeWeights(targetType: PromotionTargetType, ids: string[], now: Date): Promise<Map<string, number>>;
  listByBusiness(businessId: string): Promise<PromotionEntity[]>;
  targetOwned?(input: { targetType: PromotionTargetType; targetId: string; businessId: string }): Promise<boolean>;
}
