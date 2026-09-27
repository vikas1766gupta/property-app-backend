import { ILeadRepository, CreateLeadInput } from "./lead.entity";
import { IPropertyRepository } from "@modules/property/property.repository.interface";
import { NotFoundError } from "@common/errors/AppError";

export class LeadService {
  constructor(private readonly leadRepo: ILeadRepository, private readonly propertyRepo: IPropertyRepository) {}

  /** Captures an inquiry without exposing the business's direct contact details to the buyer. */
  async submitLead(input: CreateLeadInput) {
    const property = await this.propertyRepo.findById(input.propertyId);
    if (!property || property.status !== "PUBLISHED") throw new NotFoundError("Listing not found");
    return this.leadRepo.create(input);
  }

  async listForProperty(propertyId: string) {
    return this.leadRepo.listByProperty(propertyId);
  }

  async listForBusiness(businessId: string) {
    return this.leadRepo.listByBusiness(businessId);
  }
}
