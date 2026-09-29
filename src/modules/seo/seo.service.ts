import { PrismaClient } from "@prisma/client";
import { IPropertyRepository } from "@modules/property/property.repository.interface";
import { PropertySearchFilters } from "@modules/property/property.entity";
import {
  SeoLocationPage,
  findSeoLocation,
  SeoLocation,
  SEO_LOCATIONS,
} from "./seo.entity";

export function locationQueryFromSlug(
  slug: string,
): { city: string; filters: PropertySearchFilters } | null {
  const match =
    /^(?:(\d+)-bhk-)?(?:(properties|flats|commercial-property|plots)-)?(?:(for-sale|for-rent)-)?in-(.+)$/.exec(
      slug,
    );
  if (!match) return null;
  const city = match[4].replace(/-/g, " ");
  const location = findSeoLocation(city.replace(/ /g, "-"));
  if (!location) return null;
  return {
    city: location.name,
    filters: {
      city: location.name,
      ...(match[3] === "for-sale"
        ? { listingType: "SALE" as const }
        : match[3] === "for-rent"
          ? { listingType: "RENT" as const }
          : {}),
      ...(match[1] ? { minBedrooms: Number(match[1]) } : {}),
    },
  };
}

export class SeoService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly propertyRepo: IPropertyRepository,
  ) {}

  async locationPage(slug: string): Promise<SeoLocationPage | null> {
    const query = locationQueryFromSlug(slug);
    if (!query) return null;
    const location: SeoLocation = findSeoLocation(
      query.city.toLowerCase().replace(/ /g, "-"),
    )!;
    const result = await this.propertyRepo.search({
      ...query.filters,
      page: 1,
      pageSize: 50,
    });
    const prices = result.items.map((property) => property.price);
    const counts = new Map<string, number>();
    result.items.forEach((property) =>
      counts.set(
        property.listingType,
        (counts.get(property.listingType) ?? 0) + 1,
      ),
    );
    return {
      ...location,
      title: `${query.filters.listingType === "RENT" ? "Flats for rent" : query.filters.listingType === "SALE" ? "Properties for sale" : "Property"} in ${location.name}`,
      canonicalPath: `/${slug}`,
      noindex: result.total === 0,
      total: result.total,
      averagePrice: prices.length
        ? Math.round(
            prices.reduce((sum, price) => sum + price, 0) / prices.length,
          )
        : null,
      priceMin: prices.length ? Math.min(...prices) : null,
      priceMax: prices.length ? Math.max(...prices) : null,
      popularPropertyTypes: [...counts.entries()]
        .map(([type, count]) => ({ type, count }))
        .sort((a, b) => b.count - a.count),
      popularLocalities: [],
      listings: result.items.map((property) => ({
        id: property.id,
        title: property.title,
        city: property.city,
        price: property.price,
        currency: property.currency,
        listingType: property.listingType,
      })),
    };
  }

  async sitemap(baseUrl: string): Promise<string> {
    const [properties, projects, businesses, locationPages] = await Promise.all(
      [
        this.prisma.property.findMany({
          where: {
            status: "PUBLISHED",
            verificationStatus: { not: "SUSPENDED" },
          },
          select: { id: true, updatedAt: true },
        }),
        this.prisma.project.findMany({
          where: {
            status: { in: ["PUBLISHED", "SOLD_OUT", "COMPLETED"] },
            verificationStatus: "VERIFIED",
          },
          select: { slug: true, updatedAt: true },
        }),
        this.prisma.business.findMany({
          where: { verificationStatus: "VERIFIED" },
          select: { id: true, updatedAt: true },
        }),
        Promise.all(
          SEO_LOCATIONS.map((location) =>
            this.locationPage(`properties-for-sale-in-${location.slug}`),
          ),
        ),
      ],
    );
    const urls = locationPages
      .filter((page) => page && !page.noindex)
      .map((page) => `${baseUrl}${page!.canonicalPath}`)
      .concat(
        properties.map((property) => `${baseUrl}/properties/${property.id}`),
      )
      .concat(projects.map((project) => `${baseUrl}/projects/${project.slug}`))
      .concat(
        businesses.map((business) => `${baseUrl}/businesses/${business.id}`),
      );
    return `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.map((url) => `<url><loc>${escapeXml(url)}</loc></url>`).join("")}</urlset>`;
  }
}

function escapeXml(value: string): string {
  return value.replace(
    /[<>&'\"]/g,
    (character) =>
      ({
        "<": "&lt;",
        ">": "&gt;",
        "&": "&amp;",
        "'": "&apos;",
        '\"': "&quot;",
      })[character] ?? character,
  );
}
