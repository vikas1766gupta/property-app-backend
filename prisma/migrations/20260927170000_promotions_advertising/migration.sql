CREATE TYPE "PromotionType" AS ENUM ('FEATURED', 'PREMIUM', 'HOMEPAGE', 'SEARCH_PRIORITY');
CREATE TYPE "PromotionStatus" AS ENUM ('PENDING_PAYMENT', 'SCHEDULED', 'ACTIVE', 'EXPIRED', 'CANCELLED');
CREATE TYPE "PromotionTargetType" AS ENUM ('PROPERTY', 'PROJECT');
CREATE TYPE "CampaignStatus" AS ENUM ('DRAFT', 'SCHEDULED', 'ACTIVE', 'PAUSED', 'COMPLETED', 'CANCELLED');
CREATE TYPE "AdPlacement" AS ENUM ('HOME_BANNER', 'SEARCH_BANNER', 'CITY_PAGE', 'PROJECT_PAGE', 'SIDEBAR');

CREATE TABLE "PromotionConfig" (
  "id" TEXT NOT NULL, "type" "PromotionType" NOT NULL, "price" DECIMAL(12,2) NOT NULL,
  "durationDays" INTEGER NOT NULL, "allowedCustomerTypes" "BusinessAccountType"[], "priorityWeight" INTEGER NOT NULL DEFAULT 0,
  "isActive" BOOLEAN NOT NULL DEFAULT true, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PromotionConfig_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "PromotionConfig_type_key" ON "PromotionConfig"("type");

CREATE TABLE "Promotion" (
  "id" TEXT NOT NULL, "propertyId" TEXT, "projectId" TEXT, "businessId" TEXT NOT NULL, "type" "PromotionType" NOT NULL,
  "startAt" TIMESTAMP(3) NOT NULL, "endAt" TIMESTAMP(3) NOT NULL, "status" "PromotionStatus" NOT NULL DEFAULT 'PENDING_PAYMENT',
  "paymentId" TEXT, "priorityWeight" INTEGER NOT NULL DEFAULT 0, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Promotion_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Promotion_paymentId_key" ON "Promotion"("paymentId");
CREATE INDEX "Promotion_propertyId_status_startAt_endAt_idx" ON "Promotion"("propertyId", "status", "startAt", "endAt");
CREATE INDEX "Promotion_projectId_status_startAt_endAt_idx" ON "Promotion"("projectId", "status", "startAt", "endAt");
CREATE INDEX "Promotion_businessId_status_idx" ON "Promotion"("businessId", "status");
ALTER TABLE "Promotion" ADD CONSTRAINT "Promotion_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Promotion" ADD CONSTRAINT "Promotion_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Promotion" ADD CONSTRAINT "Promotion_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "Campaign" (
  "id" TEXT NOT NULL, "businessId" TEXT NOT NULL, "name" TEXT NOT NULL, "targetUrl" TEXT NOT NULL,
  "startAt" TIMESTAMP(3) NOT NULL, "endAt" TIMESTAMP(3) NOT NULL, "budget" DECIMAL(12,2) NOT NULL,
  "status" "CampaignStatus" NOT NULL DEFAULT 'DRAFT', "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Campaign_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "Campaign_status_startAt_endAt_idx" ON "Campaign"("status", "startAt", "endAt");
CREATE INDEX "Campaign_businessId_status_idx" ON "Campaign"("businessId", "status");
ALTER TABLE "Campaign" ADD CONSTRAINT "Campaign_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "Creative" ("id" TEXT NOT NULL, "campaignId" TEXT NOT NULL, "assetUrl" TEXT NOT NULL, "headline" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "Creative_pkey" PRIMARY KEY ("id"));
ALTER TABLE "Creative" ADD CONSTRAINT "Creative_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE TABLE "CampaignPlacement" ("id" TEXT NOT NULL, "campaignId" TEXT NOT NULL, "placement" "AdPlacement" NOT NULL, CONSTRAINT "CampaignPlacement_pkey" PRIMARY KEY ("id"));
CREATE UNIQUE INDEX "CampaignPlacement_campaignId_placement_key" ON "CampaignPlacement"("campaignId", "placement");
CREATE INDEX "CampaignPlacement_placement_idx" ON "CampaignPlacement"("placement");
ALTER TABLE "CampaignPlacement" ADD CONSTRAINT "CampaignPlacement_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE TABLE "AdImpression" ("id" TEXT NOT NULL, "campaignId" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "AdImpression_pkey" PRIMARY KEY ("id"));
CREATE INDEX "AdImpression_campaignId_createdAt_idx" ON "AdImpression"("campaignId", "createdAt");
ALTER TABLE "AdImpression" ADD CONSTRAINT "AdImpression_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE TABLE "AdClick" ("id" TEXT NOT NULL, "campaignId" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "AdClick_pkey" PRIMARY KEY ("id"));
CREATE INDEX "AdClick_campaignId_createdAt_idx" ON "AdClick"("campaignId", "createdAt");
ALTER TABLE "AdClick" ADD CONSTRAINT "AdClick_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;
