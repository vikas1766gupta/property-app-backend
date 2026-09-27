import { describe, expect, it } from "vitest";
import { isLikelyDuplicate } from "./duplicate-detector";

describe("property duplicate detector", () => {
  it("flags close same-business listings without deleting them", () => {
    expect(isLikelyDuplicate({ businessId: "b-1", listingType: "SALE", city: "Pune", addressLine: "Baner Road", price: 10000000, areaSqft: 1200, latitude: 18.56, longitude: 73.78 }, { id: "p-2", price: 10100000, areaSqft: 1210, addressLine: "Baner Road", latitude: 18.5604, longitude: 73.7803 })).toBe(true);
  });
});