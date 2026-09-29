import { PrismaClient } from "@prisma/client";
import { env } from "@config/env";
import { NotificationDeliveryRepositoryPrisma } from "@modules/notification/notification.delivery.repository.prisma";
import { SmtpEmailProvider } from "@modules/notification/smtp.email.provider";
import { startEmailWorker } from "@modules/notification/email.queue.bullmq";
import { logger } from "@common/logger/logger";

if (!env.smtpHost || !env.smtpFrom)
  throw new Error("SMTP_HOST and SMTP_FROM are required for the email worker");

const prisma = new PrismaClient();
const deliveryRepo = new NotificationDeliveryRepositoryPrisma(prisma);
const provider = new SmtpEmailProvider(
  env.smtpHost,
  env.smtpPort,
  env.smtpUser,
  env.smtpPassword,
  env.smtpFrom,
);
const worker = startEmailWorker(env.redisUrl, deliveryRepo, provider);
worker.on("error", (error) => logger.error("Email worker error", { error }));
worker.on("failed", (job, error) =>
  logger.error("Email job failed", { jobId: job?.id, error }),
);

const shutdown = async () => {
  await worker.close();
  await prisma.$disconnect();
};
process.once("SIGINT", shutdown);
process.once("SIGTERM", shutdown);
