import { PropertySearchFilters, SavedSearchEntity } from "./property.entity";

export interface ISavedSearchRepository {
  create(data: {
    userId: string;
    name: string;
    filters: Omit<PropertySearchFilters, "page" | "pageSize">;
    notifyOnMatch: boolean;
  }): Promise<SavedSearchEntity>;
  listByUser(userId: string): Promise<SavedSearchEntity[]>;
  listWithNotificationsEnabled(): Promise<SavedSearchEntity[]>;
  removeForUser(id: string, userId: string): Promise<boolean>;
}