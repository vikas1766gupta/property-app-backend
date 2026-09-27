import { Prisma, PrismaClient, NotificationDeliveryStatus } from '@prisma/client';
import { INotificationDeliveryRepository, NotificationDeliveryEntity, NotificationEvent, NotificationPreferences, EmailNotification } from './notification.entity';

export class NotificationDeliveryRepositoryPrisma implements INotificationDeliveryRepository {
  constructor(private readonly prisma: PrismaClient) {}

  private toEntity(row: any): NotificationDeliveryEntity {
    return { ...row, event: row.event as NotificationEvent, payload: row.payload as EmailNotification };
  }

  async getPreferences(userId: string): Promise<NotificationPreferences | null> {
    return this.prisma.user.findUnique({ where: { id: userId }, select: { email: true, emailEnabled: true, leadEmails: true, propertyAlertEmails: true, paymentEmails: true, marketingEmails: true } });
  }

  async updatePreferences(userId: string, preferences: Omit<NotificationPreferences, 'email'>): Promise<Omit<NotificationPreferences, 'email'>> {
    return this.prisma.user.update({ where: { id: userId }, data: preferences, select: { emailEnabled: true, leadEmails: true, propertyAlertEmails: true, paymentEmails: true, marketingEmails: true } });
  }

  async createPending(input: { userId: string; event: NotificationEvent; eventKey: string; payload: EmailNotification }): Promise<NotificationDeliveryEntity | null> {
    try {
      const row = await this.prisma.notificationDelivery.create({ data: { ...input, payload: input.payload as unknown as Prisma.InputJsonValue, status: 'PENDING' } });
      return this.toEntity(row);
    } catch (error: any) {
      if (error?.code === 'P2002') return null;
      throw error;
    }
  }

  async getById(id: string): Promise<NotificationDeliveryEntity | null> {
    const row = await this.prisma.notificationDelivery.findUnique({ where: { id } });
    return row ? this.toEntity(row) : null;
  }

  async markRetrying(id: string, attempts: number, error: string): Promise<void> {
    await this.prisma.notificationDelivery.update({ where: { id }, data: { status: NotificationDeliveryStatus.RETRYING, attempts, lastError: error } });
  }

  async markSent(id: string): Promise<void> {
    await this.prisma.notificationDelivery.update({ where: { id }, data: { status: NotificationDeliveryStatus.SENT, sentAt: new Date(), lastError: null } });
  }

  async markFailed(id: string, attempts: number, error: string): Promise<void> {
    await this.prisma.notificationDelivery.update({ where: { id }, data: { status: NotificationDeliveryStatus.FAILED, attempts, lastError: error } });
  }

  async listFailures(): Promise<NotificationDeliveryEntity[]> {
    const rows = await this.prisma.notificationDelivery.findMany({ where: { status: { in: ['FAILED', 'RETRYING'] } }, orderBy: { updatedAt: 'desc' }, take: 100 });
    return rows.map((row) => this.toEntity(row));
  }
}
