import { describe, expect, it } from "vitest";
import { prioritizeByPromotionWeight } from "./promotion-order";

describe("promotion ordering", () => {
  it("puts active boosted results first and leaves expired results ordinary", () => {
    const items = [
      { id: "ordinary" },
      { id: "expired-boost" },
      { id: "active-boost" },
    ];
    const weights = new Map([
      ["expired-boost", 0],
      ["active-boost", 20],
    ]);
    expect(
      prioritizeByPromotionWeight(items, weights).map((item) => item.id),
    ).toEqual(["active-boost", "ordinary", "expired-boost"]);
  });
});
