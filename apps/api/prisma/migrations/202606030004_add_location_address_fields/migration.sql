ALTER TABLE "Location"
ADD COLUMN "province" TEXT,
ADD COLUMN "ward" TEXT,
ADD COLUMN "address" TEXT;

CREATE INDEX "Location_province_idx" ON "Location"("province");
CREATE INDEX "Location_ward_idx" ON "Location"("ward");
