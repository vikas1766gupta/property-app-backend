ALTER TABLE "User"
  ADD COLUMN "emailEnabled" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "leadEmails" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "propertyAlertEmails" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "paymentEmails" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "marketingEmails" BOOLEAN NOT NULL DEFAULT false;

CREATE TYPE "NotificationDeliveryStatus" AS ENUM ('PENDING', 'SENT', 'FAILED', 'RETRYING');

CREATE TABLE "NotificationDelivery" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "event" TEXT NOT NULL,
  "eventKey" TEXT NOT NULL,
  "status" "NotificationDeliveryStatus" NOT NULL DEFAULT 'PENDING',
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "lastError" TEXT,
  "payload" JSONB NOT NULL,
  "sentAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "NotificationDelivery_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "NotificationDelivery_userId_event_eventKey_key"
  ON "NotificationDelivery"("userId", "event", "eventKey");
CREATE INDEX "NotificationDelivery_status_createdAt_idx"
  ON "NotificationDelivery"("status", "createdAt");
ALTER TABLE "NotificationDelivery"
  ADD CONSTRAINT "NotificationDelivery_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
