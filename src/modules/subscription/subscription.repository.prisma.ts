import { PrismaClient, SubscriptionStatus as PrismaSubscriptionStatus } from "@prisma/client";
import { Subscription } from "./subscription.entity";
import { PlanService } from "./plan.service";

export class SubscriptionRepositoryPrisma {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly planService: PlanService
  ) {}

  async findCurrentByBusiness(businessId: string): Promise<Subscription | null> {
    const subscription = await this.prisma.subscription.findFirst({
      where: { businessId },
      include: { plan: true },
      orderBy: { createdAt: "desc" },
    });
    return subscription ? this.toSubscription(subscription) : null;
  }

  async findById(id: string): Promise<Subscription | null> {
    const subscription = await this.prisma.subscription.findUnique({ where: { id }, include: { plan: true } });
    return subscription ? this.toSubscription(subscription) : null;
  }

  async create(data: {
    businessId: string;
    planId: string;
    status: PrismaSubscriptionStatus;
    currentPeriodStart: Date;
    currentPeriodEnd: Date;
    provider: string;
  }): Promise<Subscription> {
    const subscription = await this.prisma.subscription.create({ data, include: { plan: true } });
    return this.toSubscription(subscription);
  }

  async cancel(id: string): Promise<Subscription> {
    const subscription = await this.prisma.subscription.update({
      where: { id },
      data: { cancelAtPeriodEnd: true },
      include: { plan: true },
    });
    return this.toSubscription(subscription);
  }

  async activate(id: string, providerSubscriptionId?: string): Promise<Subscription> {
    const subscription = await this.prisma.subscription.update({
      where: { id },
      data: { status: "ACTIVE", ...(providerSubscriptionId ? { providerSubscriptionId } : {}) },
      include: { plan: true },
    });
    return this.toSubscription(subscription);
  }

  async findByProviderSubscriptionId(providerSubscriptionId: string): Promise<Subscription | null> {
    const subscription = await this.prisma.subscription.findUnique({ where: { providerSubscriptionId }, include: { plan: true } });
    return subscription ? this.toSubscription(subscription) : null;
  }

  async updateFromProvider(id: string, data: {
    status: PrismaSubscriptionStatus;
    currentPeriodStart?: Date;
    currentPeriodEnd?: Date;
    cancelAtPeriodEnd?: boolean;
    providerSubscriptionId?: string;
  }): Promise<Subscription> {
    const subscription = await this.prisma.subscription.update({ where: { id }, data, include: { plan: true } });
    return this.toSubscription(subscription);
  }

  async history(businessId: string) {
    return this.prisma.subscription.findMany({
      where: { businessId },
      include: { plan: true, events: { orderBy: { createdAt: "desc" } } },
      orderBy: { createdAt: "desc" },
    });
  }

  async addEvent(subscriptionId: string, type: string, metadata?: object) {
    return this.prisma.subscriptionEvent.create({ data: { subscriptionId, type, metadata } });
  }

  private toSubscription(subscription: any): Subscription {
    return { ...subscription, plan: this.planService.toPlan(subscription.plan) };
  }
}
