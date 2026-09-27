import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NotificationService } from './notification.service';
import { EmailNotification, INotificationDeliveryRepository, NotificationDeliveryEntity, INotificationRepository } from './notification.entity';
import { processEmailDelivery } from './email.queue.bullmq';

const delivery = (payload: EmailNotification): NotificationDeliveryEntity => ({
  id: 'delivery-1', userId: 'user-1', event: 'PAYMENT_SUCCESS', eventKey: 'payment-1', status: 'PENDING', attempts: 0,
  lastError: null, payload, sentAt: null, createdAt: new Date(), updatedAt: new Date(),
});

describe('asynchronous email notifications', () => {
  let notificationRepo: INotificationRepository;
  let deliveryRepo: INotificationDeliveryRepository;
  let queue: { enqueue: ReturnType<typeof vi.fn> };
  const preferences = { email: 'buyer@example.com', emailEnabled: true, leadEmails: true, propertyAlertEmails: true, paymentEmails: true, marketingEmails: false };

  beforeEach(() => {
    notificationRepo = { create: vi.fn(), listByUser: vi.fn() };
    deliveryRepo = {
      getPreferences: vi.fn().mockResolvedValue(preferences), updatePreferences: vi.fn(), createPending: vi.fn(), getById: vi.fn(),
      markRetrying: vi.fn(), markSent: vi.fn(), markFailed: vi.fn(), listFailures: vi.fn(),
    };
    queue = { enqueue: vi.fn().mockResolvedValue(undefined) };
  });

  it('creates one queued delivery when preferences allow the event', async () => {
    const item = delivery({ to: preferences.email, subject: 'Paid', text: 'Payment succeeded' });
    vi.mocked(deliveryRepo.createPending).mockResolvedValue(item);
    const service = new NotificationService(notificationRepo, deliveryRepo, queue);

    await service.notifyEmail('user-1', 'PAYMENT_SUCCESS', 'payment-1', 'Paid', 'Payment succeeded');

    expect(deliveryRepo.createPending).toHaveBeenCalledWith({ userId: 'user-1', event: 'PAYMENT_SUCCESS', eventKey: 'payment-1', payload: { to: preferences.email, subject: 'Paid', text: 'Payment succeeded' } });
    expect(queue.enqueue).toHaveBeenCalledWith(item);
  });

  it('filters disabled categories and treats an existing delivery as a duplicate', async () => {
    vi.mocked(deliveryRepo.getPreferences).mockResolvedValue({ ...preferences, paymentEmails: false });
    const service = new NotificationService(notificationRepo, deliveryRepo, queue);
    await service.notifyEmail('user-1', 'PAYMENT_SUCCESS', 'payment-1', 'Paid', 'Payment succeeded');
    expect(deliveryRepo.createPending).not.toHaveBeenCalled();

    vi.mocked(deliveryRepo.getPreferences).mockResolvedValue(preferences);
    vi.mocked(deliveryRepo.createPending).mockResolvedValue(null);
    await service.notifyEmail('user-1', 'PAYMENT_SUCCESS', 'payment-1', 'Paid', 'Payment succeeded');
    expect(queue.enqueue).not.toHaveBeenCalled();
  });

  it('marks successful delivery as sent', async () => {
    const item = delivery({ to: 'buyer@example.com', subject: 'Paid', text: 'Payment succeeded' });
    vi.mocked(deliveryRepo.getById).mockResolvedValue(item);
    const provider = { send: vi.fn().mockResolvedValue(undefined) };
    await processEmailDelivery({ data: item, attemptsMade: 0 }, deliveryRepo, provider);
    expect(provider.send).toHaveBeenCalledWith(item.payload);
    expect(deliveryRepo.markSent).toHaveBeenCalledWith(item.id);
  });

  it('marks transient failures retrying and terminal failures failed', async () => {
    const item = delivery({ to: 'buyer@example.com', subject: 'Paid', text: 'Payment succeeded' });
    vi.mocked(deliveryRepo.getById).mockResolvedValue(item);
    const provider = { send: vi.fn().mockRejectedValue(new Error('SMTP unavailable')) };
    await expect(processEmailDelivery({ data: item, attemptsMade: 0 }, deliveryRepo, provider)).rejects.toThrow('SMTP unavailable');
    expect(deliveryRepo.markRetrying).toHaveBeenCalledWith(item.id, 1, 'SMTP unavailable');
    await expect(processEmailDelivery({ data: item, attemptsMade: 4 }, deliveryRepo, provider)).rejects.toThrow('SMTP unavailable');
    expect(deliveryRepo.markFailed).toHaveBeenCalledWith(item.id, 5, 'SMTP unavailable');
  });
});
