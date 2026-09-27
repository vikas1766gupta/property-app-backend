CREATE TYPE "VerificationStatus" AS ENUM ('PENDING', 'UNDER_REVIEW', 'VERIFIED', 'REJECTED', 'SUSPENDED', 'EXPIRED');
CREATE TYPE "VerificationType" AS ENUM ('BUSINESS', 'PROPERTY', 'PROJECT', 'RERA');
CREATE TYPE "VerificationEntityType" AS ENUM ('BUSINESS', 'PROPERTY', 'PROJECT');
CREATE TYPE "ReportReason" AS ENUM ('FAKE_PROPERTY', 'WRONG_PRICE', 'DUPLICATE', 'SPAM', 'SCAM', 'WRONG_INFORMATION', 'OTHER');
CREATE TYPE "ReportStatus" AS ENUM ('OPEN', 'UNDER_REVIEW', 'DISMISSED', 'SUSPENDED', 'REJECTED', 'RESOLVED');

ALTER TYPE "ReraStatus" ADD VALUE 'UNDER_REVIEW';
ALTER TYPE "ReraStatus" ADD VALUE 'SUSPENDED';
ALTER TYPE "ReraStatus" ADD VALUE 'EXPIRED';

ALTER TABLE "Business" ALTER COLUMN "verificationStatus" DROP DEFAULT;
ALTER TABLE "Business" ALTER COLUMN "verificationStatus" TYPE "VerificationStatus" USING ("verificationStatus"::text::"VerificationStatus");
ALTER TABLE "Business" ALTER COLUMN "verificationStatus" SET DEFAULT 'PENDING';
ALTER TABLE "Project" ALTER COLUMN "verificationStatus" DROP DEFAULT;
ALTER TABLE "Project" ALTER COLUMN "verificationStatus" TYPE "VerificationStatus" USING ("verificationStatus"::text::"VerificationStatus");
ALTER TABLE "Project" ALTER COLUMN "verificationStatus" SET DEFAULT 'PENDING';
ALTER TABLE "Property" ADD COLUMN "verificationStatus" "VerificationStatus" NOT NULL DEFAULT 'PENDING';
ALTER TABLE "Property" ADD COLUMN "duplicateFlag" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Property" ADD COLUMN "duplicateReason" TEXT;
CREATE INDEX "Property_verificationStatus_idx" ON "Property"("verificationStatus");
CREATE INDEX "Property_duplicateFlag_idx" ON "Property"("duplicateFlag");

CREATE TABLE "VerificationRecord" (
  "id" TEXT NOT NULL,
  "entityType" "VerificationEntityType" NOT NULL,
  "entityId" TEXT NOT NULL,
  "verificationType" "VerificationType" NOT NULL,
  "status" "VerificationStatus" NOT NULL DEFAULT 'PENDING',
  "reviewedBy" TEXT,
  "reviewedAt" TIMESTAMP(3),
  "reason" TEXT,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "VerificationRecord_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "VerificationRecord_entityType_entityId_verificationType_idx" ON "VerificationRecord"("entityType", "entityId", "verificationType");
CREATE INDEX "VerificationRecord_status_createdAt_idx" ON "VerificationRecord"("status", "createdAt");
ALTER TABLE "VerificationRecord" ADD CONSTRAINT "VerificationRecord_reviewedBy_fkey" FOREIGN KEY ("reviewedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "Report" (
  "id" TEXT NOT NULL,
  "reporterId" TEXT,
  "entityType" "VerificationEntityType" NOT NULL,
  "entityId" TEXT NOT NULL,
  "reason" "ReportReason" NOT NULL,
  "description" TEXT NOT NULL,
  "status" "ReportStatus" NOT NULL DEFAULT 'OPEN',
  "reviewedBy" TEXT,
  "reviewedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Report_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "Report_entityType_entityId_status_idx" ON "Report"("entityType", "entityId", "status");
CREATE INDEX "Report_status_createdAt_idx" ON "Report"("status", "createdAt");
ALTER TABLE "Report" ADD CONSTRAINT "Report_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Report" ADD CONSTRAINT "Report_reviewedBy_fkey" FOREIGN KEY ("reviewedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;