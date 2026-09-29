import { IPropertyRepository } from "./property.repository.interface";
import {
  CreatePropertyInput,
  PropertySearchFilters,
  PropertyEntity,
  UpdatePropertyInput,
} from "./property.entity";
import { PaymentService } from "@modules/payment/payment.service";
import {
  PaymentRequiredError,
  ForbiddenError,
  NotFoundError,
} from "@common/errors/AppError";
import { logger } from "@common/logger/logger";
import { PricingService } from "@modules/pricing/pricing.service";
import { IPropertyImageStorage } from "./image-storage.interface";
import { PropertyImageInput } from "./property.entity";
import { SavedSearchService } from "./saved-search.service";
import { EntitlementService } from "@modules/subscription/entitlement.service";
import { AnalyticsService } from "@modules/analytics/analytics.service";

/**
 * Business logic only — no HTTP concerns, no DB-specific query syntax.
 * Depends on IPropertyRepository (interface), never a concrete implementation.
 */
export class PropertyService {
  constructor(
    private readonly propertyRepo: IPropertyRepository,
    private readonly paymentService: PaymentService,
    private readonly pricingService: PricingService,
    private readonly imageStorage: IPropertyImageStorage,
    private readonly savedSearchService?: SavedSearchService,
    private readonly entitlementService?: EntitlementService,
    private readonly analyticsService?: AnalyticsService,
  ) {}

  async uploadImage(
    businessId: string,
    buffer: Buffer,
  ): Promise<{ id: string; url: string }> {
    const uploaded = await this.imageStorage.upload(buffer, businessId);
    const reference = await this.propertyRepo.createImageUpload({
      businessId,
      ...uploaded,
    });
    return { id: reference.id, url: reference.url };
  }

  /** Creates a listing. If the business is past its free tier, the listing is
   * created as PENDING_PAYMENT and the caller must complete payment before it publishes. */
  async createListing(
    input: CreatePropertyInput,
  ): Promise<{ property: PropertyEntity; requiresPayment: boolean }> {
    this.validateImageReferences(input.imageRefs);
    const requiresPayment = this.entitlementService
      ? (await this.entitlementService.canCreateListing(input.businessId))
          .requiresPayment
      : (await this.propertyRepo.countByBusiness(input.businessId)) >=
        (await this.pricingService.getConfig()).freeListingLimit;

    const property = await this.propertyRepo.create(input);
    await this.analyticsService?.record({
      event: "PROPERTY_CREATED",
      businessId: property.businessId,
      propertyId: property.id,
      city: property.city,
      propertyType: property.listingType,
    });
    await this.flagPotentialDuplicates(property);

    if (requiresPayment) {
      await this.propertyRepo.updateStatus(property.id, "PENDING_PAYMENT");
      logger.info("listing created pending payment", {
        propertyId: property.id,
        businessId: input.businessId,
      });
    } else {
      const published = await this.propertyRepo.updateStatus(
        property.id,
        "PUBLISHED",
      );
      await this.notifySavedSearches(published);
      logger.info("listing published on free tier", {
        propertyId: property.id,
        businessId: input.businessId,
      });
    }

    return { property, requiresPayment };
  }

  /** Called after a successful payment webhook — publishes the pending listing. */
  async publishAfterPayment(propertyId: string): Promise<PropertyEntity> {
    const published = await this.propertyRepo.updateStatus(
      propertyId,
      "PUBLISHED",
    );
    await this.notifySavedSearches(published);
    return published;
  }

  private async notifySavedSearches(property: PropertyEntity): Promise<void> {
    try {
      await this.savedSearchService?.notifyMatchingSearches(property);
    } catch (error) {
      logger.warn("saved search notification matching failed", {
        propertyId: property.id,
        error,
      });
    }
  }

  async getPublicListing(id: string): Promise<PropertyEntity> {
    const property = await this.propertyRepo.findById(id);
    if (
      !property ||
      property.status !== "PUBLISHED" ||
      property.verificationStatus === "SUSPENDED"
    )
      throw new NotFoundError("Listing not found");
    return property;
  }

  async search(filters: PropertySearchFilters) {
    return this.propertyRepo.search(filters);
  }

  async listForBusiness(businessId: string): Promise<PropertyEntity[]> {
    return this.propertyRepo.listByBusiness(businessId);
  }

  async updateListing(
    id: string,
    businessId: string,
    patch: UpdatePropertyInput,
  ): Promise<PropertyEntity> {
    const existing = await this.propertyRepo.findById(id);
    if (!existing) throw new NotFoundError("Listing not found");
    if (existing.businessId !== businessId)
      throw new ForbiddenError("Not your listing");
    this.validateImageReferences(patch.imageRefs);
    const updated = await this.propertyRepo.update(id, businessId, patch);
    await this.flagPotentialDuplicates(updated);
    return updated;
  }

  private async flagPotentialDuplicates(
    property: PropertyEntity,
  ): Promise<void> {
    if (
      !this.propertyRepo.findPotentialDuplicates ||
      !this.propertyRepo.markDuplicate
    )
      return;
    const matches = await this.propertyRepo.findPotentialDuplicates({
      id: property.id,
      businessId: property.businessId,
      listingType: property.listingType,
      city: property.city,
      addressLine: property.addressLine,
      price: property.price,
      areaSqft: property.areaSqft,
      latitude: property.latitude ?? null,
      longitude: property.longitude ?? null,
    });
    if (matches.length)
      await this.propertyRepo.markDuplicate(
        property.id,
        `Likely duplicate of ${matches[0].id}`,
      );
  }

  private validateImageReferences(imageRefs?: PropertyImageInput[]): void {
    if (imageRefs === undefined) return;
    if (new Set(imageRefs.map((image) => image.id)).size !== imageRefs.length) {
      throw new ForbiddenError("Duplicate image references are not allowed");
    }
    if (
      imageRefs.length > 0 &&
      imageRefs.filter((image) => image.isCover).length !== 1
    ) {
      throw new ForbiddenError(
        "Exactly one listing image must be selected as the cover",
      );
    }
  }

  async deleteListing(id: string, businessId: string): Promise<void> {
    const existing = await this.propertyRepo.findById(id);
    if (!existing) throw new NotFoundError("Listing not found");
    if (existing.businessId !== businessId)
      throw new ForbiddenError("Not your listing");
    await this.propertyRepo.delete(id);
  }

  async remainingFreeListings(businessId: string): Promise<number> {
    if (this.entitlementService) {
      const entitlements =
        await this.entitlementService.getEntitlements(businessId);
      return Math.max(
        0,
        entitlements.maxActiveListings - entitlements.listingUsage,
      );
    }
    const used = await this.propertyRepo.countByBusiness(businessId);
    const { freeListingLimit } = await this.pricingService.getConfig();
    return Math.max(0, freeListingLimit - used);
  }
}
