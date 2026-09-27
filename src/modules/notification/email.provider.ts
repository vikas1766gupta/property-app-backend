import { EmailNotification } from './notification.entity';

export interface EmailProvider {
  send(email: EmailNotification): Promise<void>;
}
