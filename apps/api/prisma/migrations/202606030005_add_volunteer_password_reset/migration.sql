ALTER TYPE "EmailTemplateTrigger" ADD VALUE IF NOT EXISTS 'VOLUNTEER_PASSWORD_RESET';

CREATE TABLE IF NOT EXISTS "VolunteerPasswordResetCode" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "codeHash" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "usedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "VolunteerPasswordResetCode_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "VolunteerPasswordResetCode_email_codeHash_idx" ON "VolunteerPasswordResetCode"("email", "codeHash");
CREATE INDEX IF NOT EXISTS "VolunteerPasswordResetCode_userId_usedAt_expiresAt_idx" ON "VolunteerPasswordResetCode"("userId", "usedAt", "expiresAt");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'VolunteerPasswordResetCode_userId_fkey') THEN
    ALTER TABLE "VolunteerPasswordResetCode"
      ADD CONSTRAINT "VolunteerPasswordResetCode_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
