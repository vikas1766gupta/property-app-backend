export class LeadEntity {
  constructor(
    public id: string,
    public propertyId: string,
    public userId: string | null,
    public name: string,
    public contact: string,
    public message: string,
    public createdAt: Date
  ) {}
}

export interface CreateLeadInput {
  propertyId: string;
  userId?: string;
  name: string;
  contact: string;
  message: string;
}

export interface LeadForBusiness extends LeadEntity {
  propertyTitle: string;
  propertyCity: string;
}

export interface ILeadRepository {
  create(input: CreateLeadInput): Promise<LeadEntity>;
  listByProperty(propertyId: string): Promise<LeadEntity[]>;
  listByBusiness(businessId: string): Promise<LeadForBusiness[]>;
}
