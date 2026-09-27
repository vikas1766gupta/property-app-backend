import { NotFoundError } from "@common/errors/AppError";
import { NotificationService } from "@modules/notification/notification.service";
import { logger } from "@common/logger/logger";
import { PropertyEntity, PropertySearchFilters, SavedSearchEntity } from "./property.entity";
import { matchesPropertySearch } from "./property-search.match";
import { ISavedSearchRepository } from "./saved-search.repository.interface";

export type SavedSearchFilters = Omit<PropertySearchFilters, "page" | "pageSize">;

export class SavedSearchService {
  constructor(
    private readonly savedSearchRepo: ISavedSearchRepository,
    private readonly notificationService: NotificationService
  ) {}

  create(userId: string, input: { name: string; filters: SavedSearchFilters; notifyOnMatch: boolean }): Promise<SavedSearchEntity> {
    return this.savedSearchRepo.create({
      userId,
      name: input.name.trim(),
      filters: input.filters,
      notifyOnMatch: input.notifyOnMatch,
    });
  }

  list(userId: string): Promise<SavedSearchEntity[]> {
    return this.savedSearchRepo.listByUser(userId);
  }

  async remove(userId: string, id: string): Promise<void> {
    if (!await this.savedSearchRepo.removeForUser(id, userId)) throw new NotFoundError("Saved search not found");
  }

  async notifyMatchingSearches(property: PropertyEntity): Promise<void> {
    const savedSearches = await this.savedSearchRepo.listWithNotificationsEnabled();
    for (const savedSearch of savedSearches) {
      if (!matchesPropertySearch(property, savedSearch.filters)) continue;
      try {
        await this.notificationService.createSavedSearchMatch(
          savedSearch.userId,
          property.id,
          savedSearch.name,
          property.title
        );
      } catch (error) {
        logger.warn("saved search notification failed", { savedSearchId: savedSearch.id, propertyId: property.id, error });
      }
    }
  }
}