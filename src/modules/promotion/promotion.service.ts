import {
  BadRequestError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
} from "@common/errors/AppError";
import { EntitlementService } from "@modules/subscription/entitlement.service";
import { IBusinessRepository } from "@modules/business/business.entity";
import {
  CustomerType,
  PromotionConfig,
  PromotionEntity,
  PromotionRepository,
  PromotionTargetType,
  PromotionType,
} from "./promotion.entity";

export class PromotionService {
  constructor(
    private readonly repo: PromotionRepository,
    private readonly entitlementService?: EntitlementService,
    private readonly businessRepo?: IBusinessRepository,
  ) {}

  listConfigs(): Promise<PromotionConfig[]> {
    return this.repo.listConfigs();
  }
  async saveConfig(
    input: Omit<PromotionConfig, "id">,
  ): Promise<PromotionConfig> {
    if (
      !input.price ||
      input.price < 0 ||
      !Number.isInteger(input.durationDays) ||
      input.durationDays < 1 ||
      input.priorityWeight < 0
    )
      throw new BadRequestError("Invalid promotion configuration");
    return this.repo.saveConfig(input);
  }
  async purchase(input: {
    businessId: string;
    customerType: CustomerType;
    targetType: PromotionTargetType;
    targetId: string;
    type: PromotionType;
  }): Promise<{ promotion: PromotionEntity; config: PromotionConfig }> {
    const config = await this.repo.findConfig(input.type);
    if (!config || !config.isActive)
      throw new NotFoundError("Promotion type is not available");
    if (
      this.repo.targetOwned &&
      !(await this.repo.targetOwned({
        targetType: input.targetType,
        targetId: input.targetId,
        businessId: input.businessId,
      }))
    )
      throw new NotFoundError("Promotion target not found");
    const customerType =
      (await this.businessRepo?.findById(input.businessId))?.accountType ??
      input.customerType;
    if (!config.allowedCustomerTypes.includes(customerType))
      throw new ForbiddenError(
        "This promotion is not available for your account type",
      );
    if (
      this.entitlementService &&
      config.price === 0 &&
      !(await this.entitlementService.canUseFeaturedListing(input.businessId))
    )
      throw new ForbiddenError("Promotion entitlement is not available");
    const existing = await this.repo.findPendingOrActive({
      businessId: input.businessId,
      [input.targetType === "PROPERTY" ? "propertyId" : "projectId"]:
        input.targetId,
      type: input.type,
    });
    if (existing)
      throw new ConflictError(
        "A matching promotion is already pending or active",
      );
    const startAt = new Date();
    const endAt = new Date(startAt.getTime() + config.durationDays * 86400000);
    const promotion = await this.repo.create({
      propertyId: input.targetType === "PROPERTY" ? input.targetId : null,
      projectId: input.targetType === "PROJECT" ? input.targetId : null,
      businessId: input.businessId,
      type: input.type,
      startAt,
      endAt,
      status: config.price === 0 ? "ACTIVE" : "PENDING_PAYMENT",
      paymentId: null,
      priorityWeight: config.priorityWeight,
    });
    return { promotion, config };
  }
  async activateFromPayment(promotionId: string): Promise<PromotionEntity> {
    const promotion = await this.repo.findById(promotionId);
    if (!promotion) throw new NotFoundError("Promotion not found");
    return this.repo.activate(promotionId, promotion.startAt);
  }
  listMine(businessId: string): Promise<PromotionEntity[]> {
    return this.repo.listByBusiness(businessId);
  }
  attachPayment(id: string, paymentId: string): Promise<PromotionEntity> {
    return this.repo.attachPayment(id, paymentId);
  }
}
