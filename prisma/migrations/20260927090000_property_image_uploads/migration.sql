ALTER TABLE "PropertyImage" ADD COLUMN "businessId" TEXT;
ALTER TABLE "PropertyImage" ADD COLUMN "publicId" TEXT;
ALTER TABLE "PropertyImage" ADD COLUMN "isCover" BOOLEAN NOT NULL DEFAULT false;

UPDATE "PropertyImage" AS image
SET "businessId" = property."businessId"
FROM "Property" AS property
WHERE image."propertyId" = property."id";

WITH ranked_images AS (
  SELECT "id", ROW_NUMBER() OVER (PARTITION BY "propertyId" ORDER BY "sortOrder", "id") AS position
  FROM "PropertyImage"
)
UPDATE "PropertyImage" AS image
SET "isCover" = true
FROM ranked_images
WHERE image."id" = ranked_images."id" AND ranked_images.position = 1;

ALTER TABLE "PropertyImage" ALTER COLUMN "propertyId" DROP NOT NULL;
ALTER TABLE "PropertyImage" ALTER COLUMN "businessId" SET NOT NULL;

ALTER TABLE "PropertyImage" DROP CONSTRAINT "PropertyImage_propertyId_fkey";
ALTER TABLE "PropertyImage"
  ADD CONSTRAINT "PropertyImage_propertyId_fkey"
  FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PropertyImage"
  ADD CONSTRAINT "PropertyImage_businessId_fkey"
  FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "PropertyImage_businessId_idx" ON "PropertyImage"("businessId");