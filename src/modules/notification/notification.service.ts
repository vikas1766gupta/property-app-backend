import { EmailNotificationQueue, INotificationDeliveryRepository, INotificationRepository, NotificationEntity, NotificationEvent } from "./notification.entity";
import { logger } from "@common/logger/logger";

export class NotificationService {
  constructor(
    private readonly notificationRepo: INotificationRepository,
    private readonly deliveryRepo?: INotificationDeliveryRepository,
    private readonly emailQueue?: EmailNotificationQueue,
  ) {}

  async createSavedSearchMatch(userId: string, propertyId: string, searchName: string, propertyTitle: string) {
    const notification = await this.notificationRepo.create({
      userId,
      propertyId,
      type: "SAVED_SEARCH_MATCH",
      title: `New property for ${searchName}`,
      message: `${propertyTitle} matches your saved search.`,
    });
    await this.enqueueEmail(userId, "NEW_SAVED_SEARCH_MATCH", propertyId, `New property for ${searchName}`, `${propertyTitle} matches your saved search.`);
    return notification;
  }

  async notifyEmail(userId: string, event: NotificationEvent, eventKey: string, subject: string, text: string): Promise<void> {
    await this.enqueueEmail(userId, event, eventKey, subject, text);
  }

  async getPreferences(userId: string) {
    if (!this.deliveryRepo) throw new Error("Notification preferences unavailable");
    const preferences = await this.deliveryRepo.getPreferences(userId);
    if (!preferences) return null;
    const { email: _email, ...publicPreferences } = preferences;
    return publicPreferences;
  }

  async updatePreferences(userId: string, preferences: Partial<{ emailEnabled: boolean; leadEmails: boolean; propertyAlertEmails: boolean; paymentEmails: boolean; marketingEmails: boolean }>) {
    if (!this.deliveryRepo) throw new Error("Notification preferences unavailable");
    const current = await this.deliveryRepo.getPreferences(userId);
    if (!current) return null;
    const { email: _email, ...currentPublic } = current;
    return this.deliveryRepo.updatePreferences(userId, { ...currentPublic, ...preferences });
  }

  private async enqueueEmail(userId: string, event: NotificationEvent, eventKey: string, subject: string, text: string): Promise<void> {
    if (!this.deliveryRepo || !this.emailQueue) return;
    const preferences = await this.deliveryRepo.getPreferences(userId);
    if (!preferences || !preferences.email || !preferences.emailEnabled || !isEventEnabled(event, preferences)) return;
    const delivery = await this.deliveryRepo.createPending({ userId, event, eventKey, payload: { to: preferences.email, subject, text } });
    if (!delivery) return;
    try {
      await this.emailQueue.enqueue(delivery);
    } catch (error) {
      logger.error("email notification queue failed", { deliveryId: delivery.id, event, error });
    }
  }

  listForUser(userId: string): Promise<NotificationEntity[]> {
    return this.notificationRepo.listByUser(userId);
  }
}

function isEventEnabled(event: NotificationEvent, preferences: { leadEmails: boolean; propertyAlertEmails: boolean; paymentEmails: boolean; marketingEmails: boolean }): boolean {
  if (event === "NEW_LEAD") return preferences.leadEmails;
  if (["PROPERTY_APPROVED", "PROPERTY_REJECTED", "LISTING_EXPIRING", "NEW_SAVED_SEARCH_MATCH", "SITE_VISIT_REMINDER"].includes(event)) return preferences.propertyAlertEmails;
  if (["PAYMENT_SUCCESS", "PAYMENT_FAILED", "SUBSCRIPTION_EXPIRING"].includes(event)) return preferences.paymentEmails;
  return preferences.marketingEmails;
}