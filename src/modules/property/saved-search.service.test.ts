import { beforeEach, describe, expect, it, vi } from "vitest";
import { NotificationService } from "@modules/notification/notification.service";
import { PropertyEntity, SavedSearchEntity } from "./property.entity";
import { ISavedSearchRepository } from "./saved-search.repository.interface";
import { SavedSearchService } from "./saved-search.service";

const property = {
  id: "property-1",
  title: "Pune apartment",
  city: "Pune",
  listingType: "RENT",
  price: 25000,
  bedrooms: 2,
  amenities: ["parking"],
  latitude: 18.5204,
  longitude: 73.8567,
} as PropertyEntity;

describe("SavedSearchService", () => {
  let repository: ISavedSearchRepository;
  let notifications: NotificationService;
  let service: SavedSearchService;

  beforeEach(() => {
    repository = {
      create: vi.fn(),
      listByUser: vi.fn(),
      listWithNotificationsEnabled: vi.fn().mockResolvedValue([{
        id: "saved-search-1",
        userId: "buyer-1",
        name: "Pune rentals",
        filters: { city: "Pune", listingType: "RENT", maxPrice: 30000 },
        notifyOnMatch: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      } satisfies SavedSearchEntity]),
      removeForUser: vi.fn(),
    };
    notifications = { createSavedSearchMatch: vi.fn().mockResolvedValue(undefined) } as unknown as NotificationService;
    service = new SavedSearchService(repository, notifications);
  });

  it("notifies only opted-in saved searches that match a newly published property", async () => {
    await service.notifyMatchingSearches(property);

    expect(repository.listWithNotificationsEnabled).toHaveBeenCalledOnce();
    expect(notifications.createSavedSearchMatch).toHaveBeenCalledWith(
      "buyer-1",
      "property-1",
      "Pune rentals",
      "Pune apartment",
    );
  });

  it("does not create a notification when saved-search criteria do not match", async () => {
    vi.mocked(repository.listWithNotificationsEnabled).mockResolvedValue([{
      id: "saved-search-2",
      userId: "buyer-2",
      name: "Sale in Mumbai",
      filters: { city: "Mumbai", listingType: "SALE" },
      notifyOnMatch: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    }]);

    await service.notifyMatchingSearches(property);

    expect(notifications.createSavedSearchMatch).not.toHaveBeenCalled();
  });
});
