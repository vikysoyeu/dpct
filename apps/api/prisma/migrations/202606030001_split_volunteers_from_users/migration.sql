-- Split volunteer profile data out of "User" without resetting existing data.

CREATE TABLE "Volunteer" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "status" "VolunteerStatus" NOT NULL DEFAULT 'AVAILABLE',
  "accountStatus" "SystemStatus" NOT NULL DEFAULT 'HOAT_DONG',
  "dateOfBirth" TIMESTAMP(3),
  "gender" TEXT,
  "address" TEXT,
  "city" TEXT,
  "ward" TEXT,
  "skills" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "vehicleType" TEXT,
  "availability" TEXT,
  "experience" TEXT,
  "emergencyContactName" TEXT,
  "emergencyContactPhone" TEXT,
  "teamId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "Volunteer_pkey" PRIMARY KEY ("id")
);

INSERT INTO "Volunteer" (
  "id",
  "userId",
  "status",
  "accountStatus",
  "dateOfBirth",
  "gender",
  "address",
  "city",
  "ward",
  "skills",
  "vehicleType",
  "availability",
  "experience",
  "emergencyContactName",
  "emergencyContactPhone",
  "teamId",
  "createdAt",
  "updatedAt"
)
SELECT
  "id",
  "id",
  COALESCE("status", 'AVAILABLE'::"VolunteerStatus"),
  COALESCE("accountStatus", 'HOAT_DONG'::"SystemStatus"),
  "dateOfBirth",
  "gender",
  "address",
  "city",
  "ward",
  COALESCE("skills", ARRAY[]::TEXT[]),
  "vehicleType",
  "availability",
  "experience",
  "emergencyContactName",
  "emergencyContactPhone",
  "teamId",
  "createdAt",
  "updatedAt"
FROM "User"
WHERE "role" = 'VOLUNTEER';

UPDATE "User"
SET "passwordHash" = COALESCE("passwordHash", '$2b$10$rNkSbhqvx7DQl.N3WFNeAuoyyV13eBEqNgjgx/8AftslSjTsoJ9de')
WHERE "role" = 'VOLUNTEER';

ALTER TABLE "Volunteer" ADD CONSTRAINT "Volunteer_userId_key" UNIQUE ("userId");
CREATE INDEX "Volunteer_accountStatus_idx" ON "Volunteer"("accountStatus");
CREATE INDEX "Volunteer_status_idx" ON "Volunteer"("status");
CREATE INDEX "Volunteer_teamId_idx" ON "Volunteer"("teamId");

ALTER TABLE "Volunteer"
  ADD CONSTRAINT "Volunteer_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Volunteer"
  ADD CONSTRAINT "Volunteer_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "VolunteerTeam"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "VolunteerRequest" DROP CONSTRAINT IF EXISTS "VolunteerRequest_volunteerId_fkey";
ALTER TABLE "VolunteerRequest"
  ADD CONSTRAINT "VolunteerRequest_volunteerId_fkey" FOREIGN KEY ("volunteerId") REFERENCES "Volunteer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "RescueTeamMember" DROP CONSTRAINT IF EXISTS "RescueTeamMember_userId_fkey";
ALTER TABLE "RescueTeamMember"
  ADD CONSTRAINT "RescueTeamMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Volunteer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "User" DROP CONSTRAINT IF EXISTS "User_teamId_fkey";
ALTER TABLE "User"
  DROP COLUMN IF EXISTS "status",
  DROP COLUMN IF EXISTS "accountStatus",
  DROP COLUMN IF EXISTS "dateOfBirth",
  DROP COLUMN IF EXISTS "gender",
  DROP COLUMN IF EXISTS "address",
  DROP COLUMN IF EXISTS "city",
  DROP COLUMN IF EXISTS "ward",
  DROP COLUMN IF EXISTS "skills",
  DROP COLUMN IF EXISTS "vehicleType",
  DROP COLUMN IF EXISTS "availability",
  DROP COLUMN IF EXISTS "experience",
  DROP COLUMN IF EXISTS "emergencyContactName",
  DROP COLUMN IF EXISTS "emergencyContactPhone",
  DROP COLUMN IF EXISTS "teamId";
