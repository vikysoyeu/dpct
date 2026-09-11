-- Remove technical labels from migrated location photos and rescue-request descriptions.

UPDATE "LocationUpdate"
SET "content" = NULL
WHERE "content" IN (
  'Ảnh hiện trường đã chuyển từ địa điểm',
  'Bổ sung ảnh hiện trường'
)
  OR "content" LIKE 'Upload ảnh:%'
  OR "content" LIKE 'Bổ sung ảnh:%';

UPDATE "Location"
SET "description" = trim(regexp_replace(
  regexp_replace(
    regexp_replace("description", '^Địa chỉ xác nhận:\s*', ''),
    E'\n(Tọa độ chuẩn|Cán bộ gửi|SĐT|Email):.*',
    '',
    'g'
  ),
  E'\n{2,}',
  E'\n',
  'g'
))
WHERE "description" IS NOT NULL
  AND (
    "description" LIKE 'Địa chỉ xác nhận:%'
    OR "description" LIKE '%Tọa độ chuẩn:%'
    OR "description" LIKE '%Cán bộ gửi:%'
    OR "description" LIKE '%SĐT:%'
    OR "description" LIKE '%Email:%'
  );
