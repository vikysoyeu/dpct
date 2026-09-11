CREATE TABLE IF NOT EXISTS "RescueRequestItem" (
  "rescueRequestId" TEXT NOT NULL,
  "itemCategoryId" TEXT NOT NULL,
  "quantity" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "RescueRequestItem_pkey" PRIMARY KEY ("rescueRequestId", "itemCategoryId")
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'RescueRequestItem_rescueRequestId_fkey') THEN
    ALTER TABLE "RescueRequestItem"
      ADD CONSTRAINT "RescueRequestItem_rescueRequestId_fkey"
      FOREIGN KEY ("rescueRequestId") REFERENCES "RescueRequest"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'RescueRequestItem_itemCategoryId_fkey') THEN
    ALTER TABLE "RescueRequestItem"
      ADD CONSTRAINT "RescueRequestItem_itemCategoryId_fkey"
      FOREIGN KEY ("itemCategoryId") REFERENCES "ItemCategory"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

INSERT INTO "RescueRequestItem" ("rescueRequestId", "itemCategoryId", "quantity")
SELECT rr."id", ic."id", GREATEST(n."quantity", 1)
FROM "RescueRequest" rr
JOIN "Need" n ON n."locationId" = rr."locationId"
JOIN "ItemCategory" ic ON lower(ic."name") = lower(n."item")
ON CONFLICT ("rescueRequestId", "itemCategoryId")
DO UPDATE SET "quantity" = EXCLUDED."quantity";

WITH ranked_categories AS (
  SELECT "id", row_number() OVER (ORDER BY "createdAt", "name") AS rn
  FROM "ItemCategory"
),
ranked_requests AS (
  SELECT rr."id", row_number() OVER (ORDER BY rr."submittedAt", rr."id") AS rn
  FROM "RescueRequest" rr
  WHERE NOT EXISTS (
    SELECT 1 FROM "RescueRequestItem" item WHERE item."rescueRequestId" = rr."id"
  )
)
INSERT INTO "RescueRequestItem" ("rescueRequestId", "itemCategoryId", "quantity")
SELECT rr."id", ic."id", 50 + (rr.rn * 10)
FROM ranked_requests rr
JOIN ranked_categories ic ON ic.rn = ((rr.rn - 1) % (SELECT count(*) FROM ranked_categories)) + 1
WHERE (SELECT count(*) FROM ranked_categories) > 0
ON CONFLICT ("rescueRequestId", "itemCategoryId") DO NOTHING;

DROP TABLE IF EXISTS "StockLevel";
DROP TABLE IF EXISTS "CollectionPoint";
