import { BadRequestError } from "@common/errors/AppError";
import { IPricingRepository } from "./pricing.repository.interface";
import { DEFAULT_PRICING_CONFIG, PricingConfig } from "./pricing.entity";

export class PricingService {
  constructor(private readonly pricingRepo: IPricingRepository) {}

  async getConfig(): Promise<PricingConfig> {
    return (await this.pricingRepo.findCurrent()) ?? { ...DEFAULT_PRICING_CONFIG };
  }

  async updateConfig(input: unknown): Promise<PricingConfig> {
    if (!input || typeof input !== "object" || Array.isArray(input)) {
      throw new BadRequestError("Pricing config must be an object");
    }

    const values = input as Record<string, unknown>;
    const { freeListingLimit, pricePerListing, currency } = values;

    if (typeof freeListingLimit !== "number" || !Number.isInteger(freeListingLimit) || freeListingLimit <= 0) {
      throw new BadRequestError("Free listing limit must be a positive integer");
    }
    if (typeof pricePerListing !== "number" || !Number.isFinite(pricePerListing) || pricePerListing <= 0) {
      throw new BadRequestError("Price per listing must be a positive number");
    }

    const normalizedCurrency = typeof currency === "string" ? currency.trim().toUpperCase() : "";
    if (!normalizedCurrency || !Intl.supportedValuesOf("currency").includes(normalizedCurrency)) {
      throw new BadRequestError("Currency must be a valid ISO 4217 currency code");
    }

    const currencyFractionDigits = new Intl.NumberFormat("en", {
      style: "currency",
      currency: normalizedCurrency,
    }).resolvedOptions().maximumFractionDigits ?? 2;
    const fractionDigits = Math.min(currencyFractionDigits, 2);
    if (Number(pricePerListing.toFixed(fractionDigits)) !== pricePerListing) {
      throw new BadRequestError(`Price per listing supports at most ${fractionDigits} decimal places for ${normalizedCurrency}`);
    }

    return this.pricingRepo.save({ freeListingLimit, pricePerListing, currency: normalizedCurrency });
  }
}