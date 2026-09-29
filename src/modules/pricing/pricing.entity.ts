export interface PricingConfig {
  freeListingLimit: number;
  pricePerListing: number;
  currency: string;
}

export const DEFAULT_PRICING_CONFIG: Readonly<PricingConfig> = Object.freeze({
  freeListingLimit: 5,
  pricePerListing: 499,
  currency: "INR",
});
