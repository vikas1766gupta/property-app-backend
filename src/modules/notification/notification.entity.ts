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
  create(data: Omit<NotificationEntity, "id" | "readAt" | "createdAt">): Promise<NotificationEntity>;
  listByUser(userId: string): Promise<NotificationEntity[]>;
}