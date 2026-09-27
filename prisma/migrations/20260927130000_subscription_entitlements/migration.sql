CREATE TYPE "SubscriptionStatus" AS ENUM ('ACTIVE', 'TRIALING', 'PAST_DUE', 'CANCELLED', 'EXPIRED', 'INCOMPLETE');
CREATE TYPE "BillingInterval" AS ENUM ('MONTHLY', 'YEARLY');

CREATE TABLE "Plan" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "accountType" "BusinessAccountType",
  "price" DECIMAL(12,2) NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'INR',
  "billingInterval" "BillingInterval" NOT NULL DEFAULT 'MONTHLY',
  "maxActiveListings" INTEGER NOT NULL,
  "featuredCredits" INTEGER NOT NULL DEFAULT 0,
  "maxTeamMembers" INTEGER NOT NULL DEFAULT 1,
  "leadManagement" BOOLEAN NOT NULL DEFAULT false,
  "analytics" BOOLEAN NOT NULL DEFAULT false,
  "priorityVisibility" BOOLEAN NOT NULL DEFAULT false,
  "profileVisibility" BOOLEAN NOT NULL DEFAULT true,
  "projectListingAccess" BOOLEAN NOT NULL DEFAULT false,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Plan_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Plan_name_key" ON "Plan"("name");
CREATE INDEX "Plan_accountType_isActive_idx" ON "Plan"("accountType", "isActive");

CREATE TABLE "Subscription" (
  "id" TEXT NOT NULL,
  "businessId" TEXT NOT NULL,
  "planId" TEXT NOT NULL,
  "status" "SubscriptionStatus" NOT NULL DEFAULT 'INCOMPLETE',
  "currentPeriodStart" TIMESTAMP(3) NOT NULL,
  "currentPeriodEnd" TIMESTAMP(3) NOT NULL,
  "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
  "provider" TEXT NOT NULL DEFAULT 'stripe',
  "providerSubscriptionId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Subscription_providerSubscriptionId_key" ON "Subscription"("providerSubscriptionId");
CREATE INDEX "Subscription_businessId_status_idx" ON "Subscription"("businessId", "status");
CREATE INDEX "Subscription_planId_status_idx" ON "Subscription"("planId", "status");

CREATE TABLE "SubscriptionEvent" (
  "id" TEXT NOT NULL,
  "subscriptionId" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SubscriptionEvent_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "SubscriptionEvent_subscriptionId_createdAt_idx" ON "SubscriptionEvent"("subscriptionId", "createdAt");

ALTER TABLE "Payment" ADD COLUMN "subscriptionId" TEXT;
CREATE UNIQUE INDEX "Payment_subscriptionId_key" ON "Payment"("subscriptionId");

ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON UPDATE CASCADE;
ALTER TABLE "SubscriptionEvent" ADD CONSTRAINT "SubscriptionEvent_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "Subscription"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "Subscription"("id") ON DELETE SET NULL ON UPDATE CASCADE;

INSERT INTO "Plan" ("id", "name", "price", "currency", "billingInterval", "maxActiveListings", "featuredCredits", "maxTeamMembers", "leadManagement", "analytics", "priorityVisibility", "profileVisibility", "projectListingAccess", "isActive", "updatedAt")
VALUES
  ('plan_free', 'FREE', 0, 'INR', 'MONTHLY', 5, 0, 1, false, false, false, true, false, true, CURRENT_TIMESTAMP),
  ('plan_pro', 'PRO', 1999, 'INR', 'MONTHLY', 25, 5, 3, true, false, true, true, false, true, CURRENT_TIMESTAMP),
  ('plan_business', 'BUSINESS', 4999, 'INR', 'MONTHLY', 100, 25, 10, true, true, true, true, true, true, CURRENT_TIMESTAMP)
ON CONFLICT ("name") DO NOTHING;
