CREATE TYPE "AnalyticsEventType" AS ENUM (
  'PROPERTY_VIEW', 'SEARCH', 'FAVORITE', 'CONTACT_CLICK', 'CALL_CLICK', 'WHATSAPP_CLICK',
  'LEAD_CREATED', 'SITE_VISIT_REQUESTED', 'PROPERTY_CREATED', 'PROPERTY_FEATURED',
  'SUBSCRIPTION_PURCHASED', 'PAYMENT_COMPLETED', 'PROJECT_VIEW'
);

CREATE TABLE "AnalyticsEvent" (
  "id" TEXT NOT NULL,
  "event" "AnalyticsEventType" NOT NULL,
  "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "userId" TEXT,
  "businessId" TEXT,
  "propertyId" TEXT,
  "projectId" TEXT,
  "city" TEXT,
  "propertyType" TEXT,
  "metadata" JSONB,
  CONSTRAINT "AnalyticsEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AnalyticsEvent_event_occurredAt_idx" ON "AnalyticsEvent"("event", "occurredAt");
CREATE INDEX "AnalyticsEvent_businessId_occurredAt_idx" ON "AnalyticsEvent"("businessId", "occurredAt");
CREATE INDEX "AnalyticsEvent_propertyId_event_occurredAt_idx" ON "AnalyticsEvent"("propertyId", "event", "occurredAt");
CREATE INDEX "AnalyticsEvent_projectId_event_occurredAt_idx" ON "AnalyticsEvent"("projectId", "event", "occurredAt");
CREATE INDEX "AnalyticsEvent_city_occurredAt_idx" ON "AnalyticsEvent"("city", "occurredAt");

ALTER TABLE "AnalyticsEvent" ADD CONSTRAINT "AnalyticsEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AnalyticsEvent" ADD CONSTRAINT "AnalyticsEvent_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AnalyticsEvent" ADD CONSTRAINT "AnalyticsEvent_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AnalyticsEvent" ADD CONSTRAINT "AnalyticsEvent_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;
