import { Entitlements, Plan, Subscription } from "./subscription.entity";
import { PlanService } from "./plan.service";
import { SubscriptionRepositoryPrisma } from "./subscription.repository.prisma";
import { IPropertyRepository } from "../property/property.repository.interface";
import { PricingService } from "../pricing/pricing.service";

const ACTIVE_STATUSES = new Set(["ACTIVE", "TRIALING"]);

export class EntitlementService {
  constructor(
    private readonly planService: PlanService,
    private readonly subscriptionRepo: SubscriptionRepositoryPrisma,
    private readonly propertyRepo: IPropertyRepository,
    private readonly pricingService: PricingService
  ) {}

  async resolvePlan(businessId: string): Promise<{ plan: Plan; subscription: Subscription | null }> {
    const subscription = await this.subscriptionRepo.findCurrentByBusiness(businessId);
    const now = new Date();
    if (subscription && ACTIVE_STATUSES.has(subscription.status) && subscription.currentPeriodEnd > now && subscription.plan.isActive) {
      return { plan: subscription.plan, subscription };
    }
    const freePlan = await this.planService.getFreePlan();
    const pricing = await this.pricingService.getConfig();
    return { plan: { ...freePlan, maxActiveListings: pricing.freeListingLimit }, subscription: null };
  }

  async getEntitlements(businessId: string): Promise<Entitlements> {
    const { plan, subscription } = await this.resolvePlan(businessId);
    const listingUsage = await this.propertyRepo.countByBusiness(businessId);
    return {
      ...plan,
      subscriptionId: subscription?.id ?? null,
      subscriptionStatus: subscription?.status ?? null,
      currentPeriodEnd: subscription?.currentPeriodEnd ?? null,
      listingUsage,
      listingLimitReached: listingUsage >= plan.maxActiveListings,
    };
  }

  async canCreateListing(businessId: string) {
    const entitlements = await this.getEntitlements(businessId);
    return {
      allowed: !entitlements.listingLimitReached,
      requiresPayment: entitlements.listingLimitReached,
      entitlements,
    };
  }

  async canUseFeaturedListing(businessId: string): Promise<boolean> {
    const entitlements = await this.getEntitlements(businessId);
    return entitlements.featuredCredits > 0;
  }

  async canUseLeadCRM(businessId: string): Promise<boolean> {
    return this.hasFeature(businessId, "leadManagement");
  }

  async canUseAnalytics(businessId: string): Promise<boolean> {
    return this.hasFeature(businessId, "analytics");
  }

  async hasFeature(businessId: string, feature: keyof Pick<Plan, "leadManagement" | "analytics" | "priorityVisibility" | "profileVisibility" | "projectListingAccess">): Promise<boolean> {
    const entitlements = await this.getEntitlements(businessId);
    return entitlements[feature];
  }
}
