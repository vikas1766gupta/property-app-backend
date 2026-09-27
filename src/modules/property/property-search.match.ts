import { PropertySearchFilters } from "./property.entity";

export interface SearchableProperty {
  city: string;
  listingType: string;
  price: number;
  bedrooms: number | null;
  amenities: string[];
  latitude?: number | null;
  longitude?: number | null;
}

export function distanceInKilometers(
  first: { latitude: number; longitude: number },
  second: { latitude: number; longitude: number }
): number {
  const toRadians = (degrees: number) => degrees * (Math.PI / 180);
  const latitudeDelta = toRadians(second.latitude - first.latitude);
  const longitudeDelta = toRadians(second.longitude - first.longitude);
  const haversine = Math.sin(latitudeDelta / 2) ** 2
    + Math.cos(toRadians(first.latitude)) * Math.cos(toRadians(second.latitude)) * Math.sin(longitudeDelta / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
}

export function matchesPropertySearch(
  property: SearchableProperty,
  filters: Omit<PropertySearchFilters, "page" | "pageSize">
): boolean {
  if (filters.city && property.city.toLocaleLowerCase() !== filters.city.trim().toLocaleLowerCase()) return false;
  if (filters.listingType && property.listingType !== filters.listingType) return false;
  if (filters.minPrice !== undefined && property.price < filters.minPrice) return false;
  if (filters.maxPrice !== undefined && property.price > filters.maxPrice) return false;
  if (filters.minBedrooms !== undefined && (property.bedrooms === null || property.bedrooms < filters.minBedrooms)) return false;
  if (filters.amenities?.some((amenity) => !property.amenities.includes(amenity))) return false;

  if (filters.radiusKm !== undefined) {
    if (filters.latitude === undefined || filters.longitude === undefined
      || property.latitude == null || property.longitude == null) return false;
    if (distanceInKilometers(
      { latitude: filters.latitude, longitude: filters.longitude },
      { latitude: property.latitude, longitude: property.longitude }
    ) > filters.radiusKm) return false;
  }

  return true;
}