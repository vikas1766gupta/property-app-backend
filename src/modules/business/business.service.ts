import { ForbiddenError, NotFoundError } from "@common/errors/AppError";
import {
  BusinessProfile,
  BusinessProfileUpdate,
  IBusinessRepository,
} from "./business.entity";

export class BusinessService {
  constructor(private readonly businessRepo: IBusinessRepository) {}

  async getPublicProfile(id: string): Promise<BusinessProfile> {
    const profile = await this.businessRepo.findById(id);
    if (!profile) throw new NotFoundError("Business profile not found");
    return profile;
  }

  async listPublicProfiles(): Promise<BusinessProfile[]> {
    return this.businessRepo.findAll();
  }

  async updateOwnProfile(
    businessId: string,
    input: BusinessProfileUpdate,
  ): Promise<BusinessProfile> {
    const existing = await this.businessRepo.findById(businessId);
    if (!existing) throw new NotFoundError("Business profile not found");
    if (existing.id !== businessId)
      throw new ForbiddenError("Not your business profile");
    return this.businessRepo.update(businessId, input);
  }

  async listProperties(id: string) {
    const profile = await this.businessRepo.findById(id);
    if (!profile) throw new NotFoundError("Business profile not found");
    return this.businessRepo.listPublishedProperties(id);
  }
}
