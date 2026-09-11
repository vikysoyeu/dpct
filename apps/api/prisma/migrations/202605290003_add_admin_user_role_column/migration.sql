ALTER TABLE "AdminUser" ADD COLUMN IF NOT EXISTS "role" "UserRole" NOT NULL DEFAULT 'ADMIN';

UPDATE "AdminUser"
SET "role" = 'ADMIN'
WHERE "username" = 'admin';
