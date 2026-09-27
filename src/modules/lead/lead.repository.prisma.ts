import { PrismaClient, Lead as PrismaLead } from "@prisma/client";
import { ILeadRepository, LeadEntity, CreateLeadInput, LeadForBusiness } from "./lead.entity";

export class LeadRepositoryPrisma implements ILeadRepository {
  constructor(private readonly prisma: PrismaClient) {}

  private toEntity(row: PrismaLead): LeadEntity {
    return new LeadEntity(row.id, row.propertyId, row.userId, row.name, row.contact, row.message, row.createdAt);
  }

  async create(input: CreateLeadInput): Promise<LeadEntity> {
    const row = await this.prisma.lead.create({
      data: {
        propertyId: input.propertyId,
        userId: input.userId,
        name: input.name,
        contact: input.contact,
        message: input.message,
      },
    });
    return this.toEntity(row);
  }

  async listByProperty(propertyId: string): Promise<LeadEntity[]> {
    const rows = await this.prisma.lead.findMany({ where: { propertyId }, orderBy: { createdAt: "desc" } });
    return rows.map((r) => this.toEntity(r));
  }

  async listByBusiness(businessId: string): Promise<LeadForBusiness[]> {
    const rows = await this.prisma.lead.findMany({
      where: { property: { businessId } },
      include: { property: { select: { title: true, city: true } } },
      orderBy: { createdAt: "desc" },
    });
    return rows.map((row) => ({
      ...this.toEntity(row),
      propertyTitle: row.property.title,
      propertyCity: row.property.city,
    }));
  }
}
