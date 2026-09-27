import { SubscriptionStatus as PrismaSubscriptionStatus } from "@prisma/client";
import { BadRequestError, ConflictError, NotFoundError } from "../../common/errors/AppError";
import { PlanService } from "./plan.service";
import { SubscriptionRepositoryPrisma } from "./subscription.repository.prisma";
import { Subscription } from "./subscription.entity";

export class SubscriptionService {
  constructor(
    private readonly planService: PlanService,
    private readonly subscriptionRepo: SubscriptionRepositoryPrisma
  ) {}

  async getMine(businessId: string) {
    return this.subscriptionRepo.findCurrentByBusiness(businessId);
  }

  async create(businessId: string, planId: string): Promise<Subscription> {
    const plan = await this.planService.getById(planId);
    if (!plan || !plan.isActive) throw new NotFoundError("Plan not found or inactive");

    const current = await this.subscriptionRepo.findCurrentByBusiness(businessId);
    if (current && ["ACTIVE", "TRIALING", "INCOMPLETE"].includes(current.status) && current.plan.id === plan.id) {
      throw new ConflictError("You are already subscribed to this plan");
    }

    if (current && ["ACTIVE", "TRIALING", "INCOMPLETE"].includes(current.status)) {
      await this.subscriptionRepo.addEvent(current.id, "PLAN_CHANGE_REQUESTED", { toPlanId: plan.id });
      await this.subscriptionRepo.cancel(current.id);
    }

    const start = new Date();
    const end = new Date(start);
    if (plan.billingInterval === "YEARLY") end.setFullYear(end.getFullYear() + 1);
    else end.setMonth(end.getMonth() + 1);

    const status: PrismaSubscriptionStatus = plan.price === 0 ? "ACTIVE" : "INCOMPLETE";
    const subscription = await this.subscriptionRepo.create({
      businessId,
      planId: plan.id,
      status,
      currentPeriodStart: start,
      currentPeriodEnd: end,
      provider: plan.price === 0 ? "internal" : "stripe",
    });
    await this.subscriptionRepo.addEvent(subscription.id, status === "ACTIVE" ? "SUBSCRIPTION_STARTED" : "CHECKOUT_REQUIRED", { planId: plan.id });
    return subscription;
  }

  async cancel(businessId: string, id: string) {
    const current = await this.subscriptionRepo.findCurrentByBusiness(businessId);
    if (!current || current.id !== id) throw new NotFoundError("Subscription not found");
    if (current.status !== "ACTIVE" && current.status !== "TRIALING") throw new BadRequestError("Subscription is not active");
    await this.subscriptionRepo.addEvent(id, "CANCELLATION_SCHEDULED");
    return this.subscriptionRepo.cancel(id);
  }

  async history(businessId: string) {
    return this.subscriptionRepo.history(businessId);
  }

  async activateFromPayment(subscriptionId: string, providerSubscriptionId?: string) {
    const result = await this.subscriptionRepo.activate(subscriptionId, providerSubscriptionId);
    await this.subscriptionRepo.addEvent(subscriptionId, "SUBSCRIPTION_ACTIVATED");
    return result;
  }

  async syncFromProvider(input: {
    subscriptionId?: string;
    providerSubscriptionId: string;
    status: string;
    currentPeriodStart?: Date;
    currentPeriodEnd?: Date;
    cancelAtPeriodEnd?: boolean;
  }) {
    const current = input.subscriptionId
      ? await this.subscriptionRepo.findById(input.subscriptionId)
      : await this.subscriptionRepo.findByProviderSubscriptionId(input.providerSubscriptionId);
    if (!current) return null;
    const status: PrismaSubscriptionStatus = input.status === "active" ? "ACTIVE"
      : input.status === "trialing" ? "TRIALING"
        : input.status === "past_due" ? "PAST_DUE"
          : input.status === "canceled" ? "CANCELLED"
            : input.status === "incomplete" ? "INCOMPLETE"
              : "EXPIRED";
    const result = await this.subscriptionRepo.updateFromProvider(current.id, {
      status,
      providerSubscriptionId: input.providerSubscriptionId,
      currentPeriodStart: input.currentPeriodStart,
      currentPeriodEnd: input.currentPeriodEnd,
      cancelAtPeriodEnd: input.cancelAtPeriodEnd,
    });
    await this.subscriptionRepo.addEvent(current.id, `PROVIDER_${input.status.toUpperCase()}`, { providerSubscriptionId: input.providerSubscriptionId });
    return result;
  }
}
