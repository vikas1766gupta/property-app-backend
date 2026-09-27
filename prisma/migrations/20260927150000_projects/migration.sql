CREATE TYPE "ProjectStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'SOLD_OUT', 'SUSPENDED', 'COMPLETED');
CREATE TYPE "ReraStatus" AS ENUM ('PENDING', 'VERIFIED', 'NOT_APPLICABLE', 'REJECTED');
CREATE TYPE "ProjectMediaType" AS ENUM ('GALLERY', 'FLOOR_PLAN', 'BROCHURE', 'SITE_PLAN');

CREATE TABLE "Project" (
  "id" TEXT NOT NULL,
  "builderId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "propertyType" TEXT NOT NULL,
  "city" TEXT NOT NULL,
  "locality" TEXT NOT NULL,
  "address" TEXT NOT NULL,
  "latitude" DOUBLE PRECISION,
  "longitude" DOUBLE PRECISION,
  "priceFrom" DECIMAL(12,2),
  "priceTo" DECIMAL(12,2),
  "areaFrom" INTEGER,
  "areaTo" INTEGER,
  "totalUnits" INTEGER NOT NULL,
  "availableUnits" INTEGER NOT NULL,
  "possessionDate" TIMESTAMP(3),
  "status" "ProjectStatus" NOT NULL DEFAULT 'DRAFT',
  "reraNumber" TEXT,
  "reraStatus" "ReraStatus" NOT NULL DEFAULT 'PENDING',
  "verificationStatus" "BusinessVerificationStatus" NOT NULL DEFAULT 'PENDING',
  "viewCount" INTEGER NOT NULL DEFAULT 0,
  "amenities" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Project_slug_key" ON "Project"("slug");
CREATE INDEX "Project_builderId_status_idx" ON "Project"("builderId", "status");
CREATE INDEX "Project_city_locality_status_idx" ON "Project"("city", "locality", "status");
CREATE INDEX "Project_propertyType_status_idx" ON "Project"("propertyType", "status");
CREATE INDEX "Project_verificationStatus_reraStatus_idx" ON "Project"("verificationStatus", "reraStatus");

ALTER TABLE "PropertyImage" ADD COLUMN "projectId" TEXT;
ALTER TABLE "PropertyImage" ADD COLUMN "mediaType" "ProjectMediaType" NOT NULL DEFAULT 'GALLERY';
CREATE INDEX "PropertyImage_projectId_mediaType_idx" ON "PropertyImage"("projectId", "mediaType");

ALTER TABLE "Lead" ALTER COLUMN "propertyId" DROP NOT NULL;
ALTER TABLE "Lead" ADD COLUMN "projectId" TEXT;
CREATE INDEX "Lead_projectId_status_createdAt_idx" ON "Lead"("projectId", "status", "createdAt");

ALTER TABLE "Project" ADD CONSTRAINT "Project_builderId_fkey" FOREIGN KEY ("builderId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PropertyImage" ADD CONSTRAINT "PropertyImage_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;