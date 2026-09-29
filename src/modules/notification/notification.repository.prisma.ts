import {
  PrismaClient,
  Notification as PrismaNotification,
} from "@prisma/client";
import {
  INotificationRepository,
  NotificationEntity,
} from "./notification.entity";

export class NotificationRepositoryPrisma implements INotificationRepository {
  constructor(private readonly prisma: PrismaClient) {}

  private toEntity(row: PrismaNotification): NotificationEntity {
    return {
      id: row.id,
      userId: row.userId,
      propertyId: row.propertyId,
      type: row.type,
      title: row.title,
      message: row.message,
      readAt: row.readAt,
      createdAt: row.createdAt,
    };
  }

  async create(
    data: Omit<NotificationEntity, "id" | "readAt" | "createdAt">,
  ): Promise<NotificationEntity> {
    const row = await this.prisma.notification.create({ data });
    return this.toEntity(row);
  }

  async listByUser(userId: string): Promise<NotificationEntity[]> {
    const rows = await this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    return rows.map((row) => this.toEntity(row));
  }
}
