export type LeadStatus = "NEW" | "CONTACTED" | "INTERESTED" | "SITE_VISIT" | "NEGOTIATION" | "CLOSED" | "NOT_INTERESTED" | "INVALID";

export class LeadEntity {
  constructor(
    public id: string,
    public propertyId: string | null,
    public userId: string | null,
    public name: string,
    public contact: string,
    public message: string,
    public createdAt: Date,
    public status: LeadStatus = "NEW",
    public assignedTo: string | null = null,
    public notes: string | null = null,
    public nextFollowUpAt: Date | null = null,
    public contactedAt: Date | null = null,
    public siteVisitAt: Date | null = null,
    public closedAt: Date | null = null,
    public source: string | null = null,
    public lastUpdatedAt: Date = createdAt,
    public projectId: string | null = null
  ) {}
}

export interface CreateLeadInput {
  propertyId?: string;
  projectId?: string;
  userId?: string;
  name: string;
  contact: string;
  message: string;
  source?: string;
}

export interface LeadForBusiness extends Omit<LeadEntity, "projectId"> {
  projectId?: string | null;
  propertyTitle: string;
  propertyCity: string;
}

export interface LeadFilters {
  status?: LeadStatus;
  propertyId?: string;
  fromDate?: Date;
  toDate?: Date;
  source?: string;
  assignedTo?: string;
  followUpDue?: boolean;
  page: number;
  pageSize: number;
}

export interface LeadUpdateInput {
  status?: LeadStatus;
  assignedTo?: string | null;
  notes?: string | null;
  nextFollowUpAt?: Date | null;
  contactedAt?: Date | null;
  siteVisitAt?: Date | null;
  closedAt?: Date | null;
  source?: string | null;
}

export interface LeadSummary {
  total: number;
  new: number;
  contacted: number;
  siteVisits: number;
  negotiation: number;
  closed: number;
  invalid: number;
}

export interface LeadEventInput {
  leadId: string;
  type: "lead_opened" | "status_changed" | "site_visit_scheduled" | "lead_closed";
  metadata?: Record<string, unknown>;
}

export interface ILeadRepository {
  create(input: CreateLeadInput): Promise<LeadEntity>;
  listByProperty(propertyId: string): Promise<LeadEntity[]>;
  listByBusiness(businessId: string, filters: LeadFilters): Promise<{ items: LeadForBusiness[]; total: number }>;
  findByIdForBusiness(businessId: string, leadId: string): Promise<LeadForBusiness | null>;
  updateForBusiness(businessId: string, leadId: string, input: LeadUpdateInput): Promise<LeadForBusiness>;
  addNoteForBusiness(businessId: string, leadId: string, note: string): Promise<LeadForBusiness>;
  scheduleFollowUpForBusiness(businessId: string, leadId: string, nextFollowUpAt: Date): Promise<LeadForBusiness>;
  summaryByBusiness(businessId: string): Promise<LeadSummary>;
  recordEvent(input: LeadEventInput): Promise<void>;
}
