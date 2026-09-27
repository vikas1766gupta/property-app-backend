import { INotificationRepository, NotificationEntity } from "./notification.entity";

export class NotificationService {
  constructor(private readonly notificationRepo: INotificationRepository) {}

  createSavedSearchMatch(userId: string, propertyId: string, searchName: string, propertyTitle: string) {
    return this.notificationRepo.create({
      userId,
      propertyId,
      type: "SAVED_SEARCH_MATCH",
      title: `New property for ${searchName}`,
      message: `${propertyTitle} matches your saved search.`,
    });
  }

  listForUser(userId: string): Promise<NotificationEntity[]> {
    return this.notificationRepo.listByUser(userId);
  }
}