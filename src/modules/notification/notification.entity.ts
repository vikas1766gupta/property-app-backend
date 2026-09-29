export interface NotificationEntity {
  id: string;
  userId: string;
  propertyId: string | null;
  type: string;
  title: string;
  message: string;
  readAt: Date | null;
  createdAt: Date;
}

export interface INotificationRepository {
  create(
    data: Omit<NotificationEntity, "id" | "readAt" | "createdAt">,
  ): Promise<NotificationEntity>;
  listByUser(userId: string): Promise<NotificationEntity[]>;
}

export type NotificationEvent =
  | "NEW_LEAD"
  | "PROPERTY_APPROVED"
  | "PROPERTY_REJECTED"
  | "LISTING_EXPIRING"
  | "SUBSCRIPTION_EXPIRING"
  | "PAYMENT_SUCCESS"
  | "PAYMENT_FAILED"
  | "NEW_SAVED_SEARCH_MATCH"
  | "SITE_VISIT_REMINDER";

export interface NotificationPreferences {
  email: string;
  emailEnabled: boolean;
  leadEmails: boolean;
  propertyAlertEmails: boolean;
  paymentEmails: boolean;
  marketingEmails: boolean;
}

export interface EmailNotification {
  to: string;
  subject: string;
  text: string;
}

export interface NotificationDeliveryEntity {
  id: string;
  userId: string;
  event: NotificationEvent;
  eventKey: string;
  status: "PENDING" | "SENT" | "FAILED" | "RETRYING";
  attempts: number;
  lastError: string | null;
  payload: EmailNotification;
  sentAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface INotificationDeliveryRepository {
  getPreferences(userId: string): Promise<NotificationPreferences | null>;
  updatePreferences(
    userId: string,
    preferences: Omit<NotificationPreferences, "email">,
  ): Promise<Omit<NotificationPreferences, "email">>;
  createPending(input: {
    userId: string;
    event: NotificationEvent;
    eventKey: string;
    payload: EmailNotification;
  }): Promise<NotificationDeliveryEntity | null>;
  getById(id: string): Promise<NotificationDeliveryEntity | null>;
  markRetrying(id: string, attempts: number, error: string): Promise<void>;
  markSent(id: string): Promise<void>;
  markFailed(id: string, attempts: number, error: string): Promise<void>;
  listFailures(): Promise<NotificationDeliveryEntity[]>;
}

export interface EmailNotificationQueue {
  enqueue(delivery: NotificationDeliveryEntity): Promise<void>;
}
