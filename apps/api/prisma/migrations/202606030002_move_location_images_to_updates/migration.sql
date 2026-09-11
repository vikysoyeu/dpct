-- Move image evidence out of Location into LocationUpdate without resetting data.

ALTER TABLE "LocationUpdate" DROP CONSTRAINT IF EXISTS "LocationUpdate_userId_fkey";
ALTER TABLE "LocationUpdate" ALTER COLUMN "userId" DROP NOT NULL;

ALTER TABLE "LocationUpdate"
  ADD CONSTRAINT "LocationUpdate_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

INSERT INTO "LocationUpdate" ("id", "locationId", "userId", "imageUrl", "content", "createdAt")
SELECT
  concat('locimg_', md5(concat(location_images."locationId", ':', location_images."imageUrl"))),
  location_images."locationId",
  location_images."userId",
  location_images."imageUrl",
  'Ảnh hiện trường đã chuyển từ địa điểm',
  location_images."createdAt"
FROM (
  SELECT
    l."id" AS "locationId",
    COALESCE(l."reportedById", l."verifiedById") AS "userId",
    trim(image_url) AS "imageUrl",
    l."updatedAt" AS "createdAt"
  FROM "Location" l
  CROSS JOIN LATERAL unnest(COALESCE(l."imageUrls", ARRAY[]::TEXT[])) AS image_url
) location_images
WHERE location_images."imageUrl" <> ''
  AND NOT EXISTS (
    SELECT 1
    FROM "LocationUpdate" lu
    WHERE lu."locationId" = location_images."locationId"
      AND lu."imageUrl" = location_images."imageUrl"
  );

CREATE INDEX IF NOT EXISTS "LocationUpdate_locationId_idx" ON "LocationUpdate"("locationId");

ALTER TABLE "Location" DROP COLUMN "imageUrls";
