import { PrismaClient, SavedSearch as PrismaSavedSearch } from "@prisma/client";
import { PropertySearchFilters, SavedSearchEntity } from "./property.entity";
import { ISavedSearchRepository } from "./saved-search.repository.interface";

export class SavedSearchRepositoryPrisma implements ISavedSearchRepository {
  constructor(private readonly prisma: PrismaClient) {}

  private toEntity(row: PrismaSavedSearch): SavedSearchEntity {
    return {
      id: row.id,
      userId: row.userId,
      name: row.name,
      filters: row.filters as Omit<PropertySearchFilters, "page" | "pageSize">,
      notifyOnMatch: row.notifyOnMatch,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  async create(data: {
    userId: string;
    name: string;
    filters: Omit<PropertySearchFilters, "page" | "pageSize">;
    notifyOnMatch: boolean;
  }): Promise<SavedSearchEntity> {
    const row = await this.prisma.savedSearch.create({
      data: { ...data, filters: data.filters },
    });
    return this.toEntity(row);
  }

  async listByUser(userId: string): Promise<SavedSearchEntity[]> {
    const rows = await this.prisma.savedSearch.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });
    return rows.map((row) => this.toEntity(row));
  }

  async listWithNotificationsEnabled(): Promise<SavedSearchEntity[]> {
    const rows = await this.prisma.savedSearch.findMany({
      where: { notifyOnMatch: true },
    });
    return rows.map((row) => this.toEntity(row));
  }

  async removeForUser(id: string, userId: string): Promise<boolean> {
    const result = await this.prisma.savedSearch.deleteMany({
      where: { id, userId },
    });
    return result.count > 0;
  }
}
