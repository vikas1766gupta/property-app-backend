export interface SeoLocation {
  slug: string;
  name: string;
  title: string;
  intro: string;
}

export interface SeoLocationPage extends SeoLocation {
  canonicalPath: string;
  noindex: boolean;
  total: number;
  averagePrice: number | null;
  priceMin: number | null;
  priceMax: number | null;
  popularPropertyTypes: Array<{ type: string; count: number }>;
  popularLocalities: string[];
  listings: Array<{
    id: string;
    title: string;
    city: string;
    price: number;
    currency: string;
    listingType: string;
  }>;
}

export const SEO_LOCATIONS: SeoLocation[] = [
  ["chandigarh", "Chandigarh"],
  ["mohali", "Mohali"],
  ["kharar", "Kharar"],
  ["zirakpur", "Zirakpur"],
  ["new-chandigarh", "New Chandigarh"],
  ["panchkula", "Panchkula"],
  ["ludhiana", "Ludhiana"],
  ["amritsar", "Amritsar"],
  ["jalandhar", "Jalandhar"],
  ["patiala", "Patiala"],
].map(([slug, name]) => ({
  slug,
  name,
  title: `Property for sale and rent in ${name}`,
  intro: `Explore verified property listings, prices, and active inventory in ${name}.`,
}));

export function canonicalLocationSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function findSeoLocation(slug: string): SeoLocation | null {
  return SEO_LOCATIONS.find((location) => location.slug === slug) ?? null;
}
