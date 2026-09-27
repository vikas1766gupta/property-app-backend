import { IPropertyRepository } from "./property.repository.interface";
import { CreatePropertyInput, PropertySearchFilters, PropertyEntity, UpdatePropertyInput } from "./property.entity";
import { PaymentService } from "@modules/payment/payment.service";
import { PaymentRequiredError, ForbiddenError, NotFoundError } from "@common/errors/AppError";
import { logger } from "@common/logger/logger";

const FREE_LISTING_LIMIT = 5;

/**
 * Business logic only — no HTTP concerns, no DB-specific query syntax.
 * Depends on IPropertyRepository (interface), never a concrete implementation.
 */
export class PropertyService {
  constructor(
    private readonly propertyRepo: IPropertyRepository,
    private readonly paymentService: PaymentService
  ) {}

  /** Creates a listing. If the business is past its free tier, the listing is
   * created as PENDING_PAYMENT and the caller must complete payment before it publishes. */
  async createListing(input: CreatePropertyInput): Promise<{ property: PropertyEntity; requiresPayment: boolean }> {
    const usedCount = await this.propertyRepo.countByBusiness(input.businessId);
    const requiresPayment = usedCount >= FREE_LISTING_LIMIT;

    const property = await this.propertyRepo.create(input);

    if (requiresPayment) {
      await this.propertyRepo.updateStatus(property.id, "PENDING_PAYMENT");
      logger.info("listing created pending payment", { propertyId: property.id, businessId: input.businessId });
    } else {
      await this.propertyRepo.updateStatus(property.id, "PUBLISHED");
      logger.info("listing published on free tier", { propertyId: property.id, businessId: input.businessId });
    }

    return { property, requiresPayment };
  }

  /** Called after a successful payment webhook — publishes the pending listing. */
  async publishAfterPayment(propertyId: string): Promise<PropertyEntity> {
    return this.propertyRepo.updateStatus(propertyId, "PUBLISHED");
  }

  async getPublicListing(id: string): Promise<PropertyEntity> {
    const property = await this.propertyRepo.findById(id);
    if (!property || property.status !== "PUBLISHED") throw new NotFoundError("Listing not found");
    return property;
  }

  async search(filters: PropertySearchFilters) {
    return this.propertyRepo.search(filters);
  }

  async listForBusiness(businessId: string): Promise<PropertyEntity[]> {
    return this.propertyRepo.listByBusiness(businessId);
  }

  async updateListing(id: string, businessId: string, patch: UpdatePropertyInput): Promise<PropertyEntity> {
    const existing = await this.propertyRepo.findById(id);
    if (!existing) throw new NotFoundError("Listing not found");
    if (existing.businessId !== businessId) throw new ForbiddenError("Not your listing");
    return this.propertyRepo.update(id, patch);
  }

  async deleteListing(id: string, businessId: string): Promise<void> {
    const existing = await this.propertyRepo.findById(id);
    if (!existing) throw new NotFoundError("Listing not found");
    if (existing.businessId !== businessId) throw new ForbiddenError("Not your listing");
    await this.propertyRepo.delete(id);
  }

  async remainingFreeListings(businessId: string): Promise<number> {
    const used = await this.propertyRepo.countByBusiness(businessId);
    return Math.max(0, FREE_LISTING_LIMIT - used);
  }
}

export { FREE_LISTING_LIMIT };
