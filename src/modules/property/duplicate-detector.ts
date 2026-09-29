import { DuplicatePropertyInput } from "./property.entity";

export interface DuplicatePropertyCandidate {
  id: string;
  price: number;
  areaSqft: number | null;
  addressLine: string;
  latitude: number | null;
  longitude: number | null;
}

export function isLikelyDuplicate(
  input: DuplicatePropertyInput,
  candidate: DuplicatePropertyCandidate,
): boolean {
  const priceClose =
    Math.abs(candidate.price - input.price) / Math.max(input.price, 1) <= 0.03;
  const areaClose =
    input.areaSqft !== null &&
    candidate.areaSqft !== null &&
    Math.abs(candidate.areaSqft - input.areaSqft) /
      Math.max(input.areaSqft, 1) <=
      0.05;
  const coordinatesClose =
    input.latitude !== null &&
    input.longitude !== null &&
    candidate.latitude !== null &&
    candidate.longitude !== null &&
    Math.abs(candidate.latitude - input.latitude) <= 0.001 &&
    Math.abs(candidate.longitude - input.longitude) <= 0.001;
  const addressMatches =
    candidate.addressLine.trim().toLowerCase() ===
    input.addressLine.trim().toLowerCase();
  return (
    1 +
      (priceClose ? 1 : 0) +
      (areaClose ? 1 : 0) +
      (coordinatesClose ? 2 : 0) +
      (addressMatches ? 2 : 0) >=
    4
  );
}
