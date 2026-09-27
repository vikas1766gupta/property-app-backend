-- CreateEnum
CREATE TYPE "BusinessAccountType" AS ENUM ('OWNER', 'BROKER', 'BUILDER');

ALTER TABLE "Business"
  ADD COLUMN "accountType" "BusinessAccountType" NOT NULL DEFAULT 'OWNER',
  ADD COLUMN "displayName" TEXT,
  ADD COLUMN "profileImage" TEXT,
  ADD COLUMN "bio" TEXT,
  ADD COLUMN "yearsOfExperience" INTEGER,
  ADD COLUMN "website" TEXT,
  ADD COLUMN "city" TEXT,
  ADD COLUMN "servedLocalities" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
