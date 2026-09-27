export function prioritizeByPromotionWeight<T extends { id: string }>(items: T[], weights: Map<string, number>): T[] {
  return [...items].sort((first, second) => (weights.get(second.id) ?? 0) - (weights.get(first.id) ?? 0));
}
