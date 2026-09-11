DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'NotificationRecipientKind') THEN
    CREATE TYPE "NotificationRecipientKind" AS ENUM ('USER', 'ADMIN');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "Notification" (
    "id" TEXT NOT NULL,
    "recipientKind" "NotificationRecipientKind" NOT NULL,
    "userId" TEXT,
    "adminUserId" TEXT,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "link" TEXT,
    "metadata" JSONB,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "Notification_recipientKind_userId_readAt_createdAt_idx" ON "Notification"("recipientKind", "userId", "readAt", "createdAt");
CREATE INDEX IF NOT EXISTS "Notification_recipientKind_adminUserId_readAt_createdAt_idx" ON "Notification"("recipientKind", "adminUserId", "readAt", "createdAt");
CREATE INDEX IF NOT EXISTS "Notification_type_createdAt_idx" ON "Notification"("type", "createdAt");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Notification_userId_fkey') THEN
    ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Notification_adminUserId_fkey') THEN
    ALTER TABLE "Notification" ADD CONSTRAINT "Notification_adminUserId_fkey" FOREIGN KEY ("adminUserId") REFERENCES "AdminUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
