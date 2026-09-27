import { Job, Queue, Worker } from 'bullmq';
import { EmailProvider } from './email.provider';
import { EmailNotificationQueue, INotificationDeliveryRepository, NotificationDeliveryEntity } from './notification.entity';

export const EMAIL_QUEUE_NAME = 'property-app-email-notifications';
const MAX_ATTEMPTS = 5;

export class BullMqEmailQueue implements EmailNotificationQueue {
  private readonly queue: Queue<NotificationDeliveryEntity>;

  constructor(redisUrl: string) {
    this.queue = new Queue(EMAIL_QUEUE_NAME, { connection: { url: redisUrl } });
  }

  async enqueue(delivery: NotificationDeliveryEntity): Promise<void> {
    await this.queue.add('send-email', delivery, { jobId: delivery.id, attempts: MAX_ATTEMPTS, backoff: { type: 'exponential', delay: 1000 }, removeOnComplete: true, removeOnFail: false });
  }

  async checkHealth(): Promise<void> {
    await this.queue.getJobCounts();
  }

  async close(): Promise<void> { await this.queue.close(); }
}

export function startEmailWorker(redisUrl: string, deliveryRepo: INotificationDeliveryRepository, provider: EmailProvider): Worker<NotificationDeliveryEntity> {
  return new Worker<NotificationDeliveryEntity>(EMAIL_QUEUE_NAME, (job) => processEmailDelivery(job, deliveryRepo, provider), { connection: { url: redisUrl }, concurrency: 5 });
}

export async function processEmailDelivery(job: Pick<Job<NotificationDeliveryEntity>, 'data' | 'attemptsMade'>, deliveryRepo: INotificationDeliveryRepository, provider: EmailProvider): Promise<void> {
  const delivery = await deliveryRepo.getById(job.data.id);
  if (!delivery || delivery.status === 'SENT') return;
  try {
    await provider.send(delivery.payload);
    await deliveryRepo.markSent(delivery.id);
  } catch (error) {
    const attempts = job.attemptsMade + 1;
    const message = error instanceof Error ? error.message : String(error);
    if (attempts >= MAX_ATTEMPTS) await deliveryRepo.markFailed(delivery.id, attempts, message);
    else await deliveryRepo.markRetrying(delivery.id, attempts, message);
    throw error;
  }
}
