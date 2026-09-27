import { BadRequestError, ForbiddenError, NotFoundError } from "@common/errors/AppError";
import { CreateLeadInput, ILeadRepository, LeadFilters, LeadStatus, LeadUpdateInput } from "./lead.entity";
import { IPropertyRepository } from "@modules/property/property.repository.interface";
import { IProjectRepository } from "@modules/project/project.entity";
import { AnalyticsService } from "@modules/analytics/analytics.service";

const transitions: Record<LeadStatus, LeadStatus[]> = {
  NEW: ["CONTACTED", "INVALID", "NOT_INTERESTED"],
  CONTACTED: ["INTERESTED", "SITE_VISIT", "NOT_INTERESTED", "INVALID"],
  INTERESTED: ["SITE_VISIT", "NEGOTIATION", "NOT_INTERESTED"],
  SITE_VISIT: ["NEGOTIATION", "CLOSED", "NOT_INTERESTED"],
  NEGOTIATION: ["CLOSED", "NOT_INTERESTED"],
  CLOSED: [],
  NOT_INTERESTED: [],
  INVALID: [],
};

export class LeadService {
  constructor(private readonly leadRepo: ILeadRepository, private readonly propertyRepo: IPropertyRepository, private readonly projectRepo?: IProjectRepository, private readonly analyticsService?: AnalyticsService) {}

  async submitLead(input: CreateLeadInput) {
    if (!input.propertyId) throw new BadRequestError("propertyId is required");
    const property = await this.propertyRepo.findById(input.propertyId);
    if (!property || property.status !== "PUBLISHED") throw new NotFoundError("Listing not found");
    const lead = await this.leadRepo.create(input);
    await this.analyticsService?.record({ event: "LEAD_CREATED", businessId: property.businessId, propertyId: property.id, city: property.city, propertyType: property.listingType });
    return lead;
  }

  async listForProperty(propertyId: string) {
    return this.leadRepo.listByProperty(propertyId);
  }

  async submitProjectLead(projectId: string, input: Omit<CreateLeadInput, "projectId">) {
    if (!this.projectRepo) throw new NotFoundError("Project service unavailable");
    const project = await this.projectRepo.findBySlugOrId(projectId);
    if (!project || project.status !== "PUBLISHED" || project.verificationStatus !== "VERIFIED") throw new NotFoundError("Project not found");
    const lead = await this.leadRepo.create({ ...input, projectId: project.id, source: "PROJECT" });
    await this.analyticsService?.record({ event: "LEAD_CREATED", businessId: project.builderId, projectId: project.id, city: project.city, propertyType: project.propertyType });
    return lead;
  }

  async listForBusiness(businessId: string, filters: LeadFilters) {
    return this.leadRepo.listByBusiness(businessId, filters);
  }

  async getForBusiness(businessId: string, leadId: string) {
    const lead = await this.leadRepo.findByIdForBusiness(businessId, leadId);
    if (!lead) throw new NotFoundError("Lead not found");
    await this.leadRepo.recordEvent({ leadId, type: "lead_opened" });
    return lead;
  }

  async summaryForBusiness(businessId: string) {
    return this.leadRepo.summaryByBusiness(businessId);
  }

  async updateStatus(businessId: string, leadId: string, status: LeadStatus) {
    const current = await this.requireLead(businessId, leadId);
    if (current.status !== status && !transitions[current.status].includes(status)) {
      throw new BadRequestError(`Cannot move a lead from ${current.status} to ${status}`);
    }
    const input: LeadUpdateInput = { status };
    if (status === "CONTACTED" && !current.contactedAt) input.contactedAt = new Date();
    if (status === "SITE_VISIT" && !current.siteVisitAt) input.siteVisitAt = new Date();
    if (status === "CLOSED" && !current.closedAt) input.closedAt = new Date();
    const updated = await this.leadRepo.updateForBusiness(businessId, leadId, input);
    if (current.status !== status) {
      await this.leadRepo.recordEvent({ leadId, type: "status_changed", metadata: { from: current.status, to: status } });
    }
    if (status === "SITE_VISIT" && current.status !== status) await this.leadRepo.recordEvent({ leadId, type: "site_visit_scheduled" });
    if (status === "CLOSED" && current.status !== status) await this.leadRepo.recordEvent({ leadId, type: "lead_closed" });
    return updated;
  }

  async updateForBusiness(businessId: string, leadId: string, input: LeadUpdateInput) {
    const current = await this.requireLead(businessId, leadId);
    if (input.status !== undefined && input.status !== current.status) {
      return this.updateStatus(businessId, leadId, input.status);
    }
    if (input.nextFollowUpAt && input.nextFollowUpAt.getTime() <= Date.now()) throw new BadRequestError("Follow-up must be scheduled in the future");
    return this.leadRepo.updateForBusiness(businessId, leadId, input);
  }

  async addNote(businessId: string, leadId: string, note: string) {
    await this.requireLead(businessId, leadId);
    return this.leadRepo.addNoteForBusiness(businessId, leadId, note);
  }

  async scheduleFollowUp(businessId: string, leadId: string, nextFollowUpAt: Date) {
    await this.requireLead(businessId, leadId);
    if (nextFollowUpAt.getTime() <= Date.now()) throw new BadRequestError("Follow-up must be scheduled in the future");
    return this.leadRepo.scheduleFollowUpForBusiness(businessId, leadId, nextFollowUpAt);
  }

  private async requireLead(businessId: string, leadId: string) {
    const lead = await this.leadRepo.findByIdForBusiness(businessId, leadId);
    if (!lead) throw new NotFoundError("Lead not found");
    return lead;
  }
}
