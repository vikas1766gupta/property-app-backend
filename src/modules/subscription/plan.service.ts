import { BusinessAccountType, PrismaClient } from "@prisma/client";
import { Plan } from "./subscription.entity";
import { BadRequestError, NotFoundError } from "../../common/errors/AppError";

export class PlanService {
  constructor(private readonly prisma: PrismaClient) {}

  async list(
    accountType?: BusinessAccountType,
    includeInactive = false,
  ): Promise<Plan[]> {
    const plans = await this.prisma.plan.findMany({
      where: {
        ...(includeInactive ? {} : { isActive: true }),
        ...(accountType
          ? { OR: [{ accountType }, { accountType: null }] }
          : {}),
      },
      orderBy: { price: "asc" },
    });
    return plans.map((plan) => this.toPlan(plan));
  }

  async getById(id: string): Promise<Plan | null> {
    const plan = await this.prisma.plan.findUnique({ where: { id } });
    return plan ? this.toPlan(plan) : null;
  }

  async getByName(name: string): Promise<Plan | null> {
    const plan = await this.prisma.plan.findUnique({ where: { name } });
    return plan ? this.toPlan(plan) : null;
  }

  async getFreePlan(): Promise<Plan> {
    const plan = await this.prisma.plan.findUnique({ where: { name: "FREE" } });
    if (!plan || !plan.isActive) {
      throw new Error("An active FREE plan is required");
    }
    return this.toPlan(plan);
  }

  async create(input: Omit<Plan, "id">): Promise<Plan> {
    this.validate(input);
    const plan = await this.prisma.plan.create({ data: input });
    return this.toPlan(plan);
  }

  async update(id: string, input: Partial<Omit<Plan, "id">>): Promise<Plan> {
    const existing = await this.prisma.plan.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError("Plan not found");
    this.validate({ ...this.toPlan(existing), ...input });
    const plan = await this.prisma.plan.update({ where: { id }, data: input });
    return this.toPlan(plan);
  }

  private validate(input: Partial<Plan>): void {
    if (input.price !== undefined && input.price < 0)
      throw new BadRequestError("Plan price cannot be negative");
    for (const key of [
      "maxActiveListings",
      "featuredCredits",
      "maxTeamMembers",
    ] as const) {
      if (
        input[key] !== undefined &&
        (!Number.isInteger(input[key]) || input[key] < 0)
      ) {
        throw new BadRequestError(`${key} must be a non-negative integer`);
      }
    }
    if (input.currency !== undefined && !/^[A-Z]{3}$/.test(input.currency))
      throw new BadRequestError("Invalid currency");
  }

  toPlan(plan: any): Plan {
    return { ...plan, price: Number(plan.price) };
  }
}
