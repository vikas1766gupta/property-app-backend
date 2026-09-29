import { Prisma, PrismaClient, Lead as PrismaLead } from "@prisma/client";
import {
  CreateLeadInput,
  ILeadRepository,
  LeadEventInput,
  LeadFilters,
  LeadForBusiness,
  LeadSummary,
  LeadUpdateInput,
  LeadEntity,
} from "./lead.entity";

const businessLeadInclude = {
  property: { select: { title: true, city: true } },
  project: { select: { name: true, city: true } },
} satisfies Prisma.LeadInclude;
type BusinessLeadRow = Prisma.LeadGetPayload<{
  include: typeof businessLeadInclude;
}>;

export class LeadRepositoryPrisma implements ILeadRepository {
  constructor(private readonly prisma: PrismaClient) {}

  private toEntity(row: PrismaLead): LeadEntity {
    return new LeadEntity(
      row.id,
      row.propertyId,
      row.userId,
      row.name,
      row.contact,
      row.message,
      row.createdAt,
      row.status,
      row.assignedTo,
      row.notes,
      row.nextFollowUpAt,
      row.contactedAt,
      row.siteVisitAt,
      row.closedAt,
      row.source,
      row.lastUpdatedAt,
      row.projectId,
    );
  }

  private toBusinessLead(row: BusinessLeadRow): LeadForBusiness {
    return {
      ...this.toEntity(row),
      propertyTitle:
        row.property?.title ?? row.project?.name ?? "Project enquiry",
      propertyCity: row.property?.city ?? row.project?.city ?? "",
    };
  }

  async create(input: CreateLeadInput): Promise<LeadEntity> {
    const row = await this.prisma.lead.create({
      data: {
        propertyId: input.propertyId,
        projectId: input.projectId,
        userId: input.userId,
        name: input.name,
        contact: input.contact,
        message: input.message,
        source: input.source,
      },
    });
    return this.toEntity(row);
  }

  async listByProperty(propertyId: string): Promise<LeadEntity[]> {
    const rows = await this.prisma.lead.findMany({
      where: { propertyId },
      orderBy: { createdAt: "desc" },
    });
    return rows.map((row) => this.toEntity(row));
  }

  private businessWhere(businessId: string): Prisma.LeadWhereInput {
    return {
      OR: [
        { property: { businessId } },
        { project: { builderId: businessId } },
      ],
    };
  }

  private buildWhere(
    businessId: string,
    filters: LeadFilters,
  ): Prisma.LeadWhereInput {
    return {
      ...this.businessWhere(businessId),
      ...(filters.status ? { status: filters.status } : {}),
      ...(filters.propertyId ? { propertyId: filters.propertyId } : {}),
      ...(filters.source ? { source: filters.source } : {}),
      ...(filters.assignedTo ? { assignedTo: filters.assignedTo } : {}),
      ...(filters.followUpDue ? { nextFollowUpAt: { lte: new Date() } } : {}),
      ...(filters.fromDate || filters.toDate
        ? {
            createdAt: {
              ...(filters.fromDate ? { gte: filters.fromDate } : {}),
              ...(filters.toDate ? { lte: filters.toDate } : {}),
            },
          }
        : {}),
    };
  }

  async listByBusiness(
    businessId: string,
    filters: LeadFilters,
  ): Promise<{ items: LeadForBusiness[]; total: number }> {
    const where = this.buildWhere(businessId, filters);
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.lead.findMany({
        where,
        include: businessLeadInclude,
        skip: (filters.page - 1) * filters.pageSize,
        take: filters.pageSize,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.lead.count({ where }),
    ]);
    return { items: rows.map((row) => this.toBusinessLead(row)), total };
  }

  async findByIdForBusiness(
    businessId: string,
    leadId: string,
  ): Promise<LeadForBusiness | null> {
    const row = await this.prisma.lead.findFirst({
      where: { id: leadId, ...this.businessWhere(businessId) },
      include: businessLeadInclude,
    });
    return row ? this.toBusinessLead(row) : null;
  }

  async updateForBusiness(
    businessId: string,
    leadId: string,
    input: LeadUpdateInput,
  ): Promise<LeadForBusiness> {
    const existing = await this.findByIdForBusiness(businessId, leadId);
    if (!existing) throw new Error("Lead not found");
    const row = await this.prisma.lead.update({
      where: { id: leadId },
      data: input,
      include: businessLeadInclude,
    });
    return this.toBusinessLead(row);
  }

  async addNoteForBusiness(
    businessId: string,
    leadId: string,
    note: string,
  ): Promise<LeadForBusiness> {
    const existing = await this.findByIdForBusiness(businessId, leadId);
    if (!existing) throw new Error("Lead not found");
    const notes = [existing.notes, `[${new Date().toISOString()}] ${note}`]
      .filter(Boolean)
      .join("\n");
    return this.updateForBusiness(businessId, leadId, { notes });
  }

  async scheduleFollowUpForBusiness(
    businessId: string,
    leadId: string,
    nextFollowUpAt: Date,
  ): Promise<LeadForBusiness> {
    return this.updateForBusiness(businessId, leadId, { nextFollowUpAt });
  }

  async summaryByBusiness(businessId: string): Promise<LeadSummary> {
    const groups = await this.prisma.lead.groupBy({
      by: ["status"],
      where: this.businessWhere(businessId),
      _count: { _all: true },
    });
    const count = (status: string) =>
      groups.find((group) => group.status === status)?._count._all ?? 0;
    return {
      total: groups.reduce((total, group) => total + group._count._all, 0),
      new: count("NEW"),
      contacted: count("CONTACTED"),
      siteVisits: count("SITE_VISIT"),
      negotiation: count("NEGOTIATION"),
      closed: count("CLOSED"),
      invalid: count("INVALID"),
    };
  }

  async recordEvent(input: LeadEventInput): Promise<void> {
    await this.prisma.leadEvent.create({
      data: {
        leadId: input.leadId,
        type: input.type,
        metadata: input.metadata as Prisma.InputJsonValue | undefined,
      },
    });
  }
}
