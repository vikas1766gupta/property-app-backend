import { describe, expect, it } from "vitest";
import { PropertySearchFilters } from "./property.entity";
import { matchesPropertySearch } from "./property-search.match";

const property = {
  city: "Pune",
  listingType: "RENT",
  price: 25000,
  bedrooms: 2,
  amenities: ["parking", "gym"],
  latitude: 18.5204,
  longitude: 73.8567,
};

describe("saved search matching", () => {
  it("matches every configured filter", () => {
    const filters: PropertySearchFilters = {
      city: "pune",
      listingType: "RENT",
      minPrice: 20000,
      maxPrice: 30000,
      minBedrooms: 2,
      amenities: ["parking"],
      latitude: 18.52,
      longitude: 73.85,
      radiusKm: 5,
    };

    expect(matchesPropertySearch(property, filters)).toBe(true);
  });

  it("rejects properties outside price, amenities, or location criteria", () => {
    expect(matchesPropertySearch(property, { maxPrice: 20000 })).toBe(false);
    expect(matchesPropertySearch(property, { amenities: ["pool"] })).toBe(false);
    expect(matchesPropertySearch(property, { latitude: 19, longitude: 73.85, radiusKm: 5 })).toBe(false);
  });

  it("does not match a radius search when the property has no coordinates", () => {
    expect(matchesPropertySearch({ ...property, latitude: null, longitude: null }, {
      latitude: 18.52,
      longitude: 73.85,
      radiusKm: 5,
    })).toBe(false);
  });
});
