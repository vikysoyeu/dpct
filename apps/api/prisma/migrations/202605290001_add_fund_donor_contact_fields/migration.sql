-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('VICTIM', 'VOLUNTEER', 'COORDINATOR', 'ADMIN', 'ADMIN_TNV', 'ADMIN_YCCT', 'ADMIN_KHO');

-- CreateEnum
CREATE TYPE "LocationType" AS ENUM ('STAGING_AREA', 'VICTIM_AREA', 'TRANSIT_POINT', 'URGENT_NEED', 'NEED_POINT', 'BLOCKED_ROAD', 'FOOD_SUPPORT', 'REST_STOP');

-- CreateEnum
CREATE TYPE "LocationStatus" AS ENUM ('PENDING', 'ACTIVE', 'DONE', 'EXPIRED');

-- CreateEnum
CREATE TYPE "NeedCategory" AS ENUM ('MANPOWER', 'FOOD', 'MEDICINE', 'EQUIPMENT', 'VEHICLE', 'OTHER');

-- CreateEnum
CREATE TYPE "NeedStatus" AS ENUM ('UNMET', 'PARTIAL', 'MET');

-- CreateEnum
CREATE TYPE "VolunteerStatus" AS ENUM ('AVAILABLE', 'ON_MISSION', 'RESTING');

-- CreateEnum
CREATE TYPE "VehicleType" AS ENUM ('TRUCK', 'MOTORBIKE', 'BOAT', 'DRONE', 'OTHER');

-- CreateEnum
CREATE TYPE "VehicleStatus" AS ENUM ('AVAILABLE', 'IN_USE', 'MAINTENANCE');

-- CreateEnum
CREATE TYPE "AssignmentStatus" AS ENUM ('PENDING', 'ACTIVE', 'DONE', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PartnerType" AS ENUM ('DONOR', 'TRANSPORT', 'FOOD', 'SPONSOR');

-- CreateEnum
CREATE TYPE "SystemStatus" AS ENUM ('HOAT_DONG', 'TAM_DUNG', 'KHOA', 'CHO_DUYET');

-- CreateEnum
CREATE TYPE "TeamMemberRole" AS ENUM ('DOI_TRUONG', 'DOI_PHO', 'THANH_VIEN', 'CONG_TAC_VIEN');

-- CreateEnum
CREATE TYPE "PriorityLevel" AS ENUM ('THAP', 'TRUNG_BINH', 'CAO', 'KHAN_CAP');

-- CreateEnum
CREATE TYPE "RequestStatus" AS ENUM ('CHO_TIEP_NHAN', 'DANG_XU_LY', 'HOAN_THANH', 'HUY_BO');

-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('THU', 'CHI');

-- CreateEnum
CREATE TYPE "TransactionStatus" AS ENUM ('THANH_CONG', 'THAT_BAI', 'CHO_DOI_SOAT');

-- CreateEnum
CREATE TYPE "TransactionMethod" AS ENUM ('BANK_TRANSFER', 'CASH');

-- CreateEnum
CREATE TYPE "NotificationRecipientKind" AS ENUM ('USER', 'ADMIN');

-- CreateEnum
CREATE TYPE "EmailTemplateTrigger" AS ENUM ('RESCUE_REQUEST_SUBMITTED', 'RESCUE_REQUEST_APPROVED', 'SPONSORSHIP_SUBMITTED', 'SPONSORSHIP_APPROVED', 'VOLUNTEER_JOIN_REQUEST_SUBMITTED', 'VOLUNTEER_JOIN_REQUEST_APPROVED', 'VOLUNTEER_ACCOUNT_APPROVED', 'DONATION_CONFIRMED');

-- CreateEnum
CREATE TYPE "EmailDeliveryStatus" AS ENUM ('PENDING', 'SENT', 'FAILED', 'SKIPPED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "username" TEXT,
    "passwordHash" TEXT,
    "email" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'VICTIM',
    "status" "VolunteerStatus" NOT NULL DEFAULT 'AVAILABLE',
    "accountStatus" "SystemStatus" NOT NULL DEFAULT 'HOAT_DONG',
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "dateOfBirth" TIMESTAMP(3),
    "gender" TEXT,
    "address" TEXT,
    "city" TEXT,
    "ward" TEXT,
    "skills" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "vehicleType" TEXT,
    "availability" TEXT,
    "experience" TEXT,
    "emergencyContactName" TEXT,
    "emergencyContactPhone" TEXT,
    "teamId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VolunteerTeam" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "city" TEXT,
    "ward" TEXT,
    "description" TEXT,
    "status" "SystemStatus" NOT NULL DEFAULT 'HOAT_DONG',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VolunteerTeam_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Location" (
    "id" TEXT NOT NULL,
    "type" "LocationType" NOT NULL,
    "status" "LocationStatus" NOT NULL DEFAULT 'PENDING',
    "priority" "PriorityLevel" NOT NULL DEFAULT 'TRUNG_BINH',
    "name" TEXT NOT NULL,
    "description" TEXT,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "urgency" INTEGER NOT NULL DEFAULT 1,
    "imageUrls" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "expiresAt" TIMESTAMP(3),
    "reportedById" TEXT,
    "verifiedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Location_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Need" (
    "id" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "category" "NeedCategory" NOT NULL,
    "item" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unit" TEXT NOT NULL,
    "status" "NeedStatus" NOT NULL DEFAULT 'UNMET',
    "priority" "PriorityLevel" NOT NULL DEFAULT 'TRUNG_BINH',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Need_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vehicle" (
    "id" TEXT NOT NULL,
    "type" "VehicleType" NOT NULL,
    "name" TEXT NOT NULL,
    "capacity" TEXT,
    "plateNumber" TEXT,
    "status" "VehicleStatus" NOT NULL DEFAULT 'AVAILABLE',
    "currentLocationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Vehicle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryItem" (
    "id" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "item" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unit" TEXT NOT NULL,
    "lastUpdatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InventoryItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Assignment" (
    "id" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "volunteerId" TEXT,
    "vehicleId" TEXT,
    "taskNote" TEXT,
    "status" "AssignmentStatus" NOT NULL DEFAULT 'PENDING',
    "priority" "PriorityLevel" NOT NULL DEFAULT 'TRUNG_BINH',
    "assignedById" TEXT,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Assignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Partner" (
    "id" TEXT NOT NULL,
    "type" "PartnerType" NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "note" TEXT,
    "commitment" TEXT,
    "address" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Partner_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Role" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "Role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserRoleLink" (
    "userId" TEXT NOT NULL,
    "roleId" INTEGER NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserRoleLink_pkey" PRIMARY KEY ("userId","roleId")
);

-- CreateTable
CREATE TABLE "LocationUpdate" (
    "id" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "imageUrl" TEXT,
    "content" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LocationUpdate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RescueRequest" (
    "id" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "submittedById" TEXT,
    "name" TEXT NOT NULL,
    "content" TEXT,
    "priority" "PriorityLevel" NOT NULL DEFAULT 'TRUNG_BINH',
    "status" "RequestStatus" NOT NULL DEFAULT 'CHO_TIEP_NHAN',
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "requesterName" TEXT,
    "requesterPhone" TEXT,
    "requesterEmail" TEXT,

    CONSTRAINT "RescueRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VolunteerRequest" (
    "id" TEXT NOT NULL,
    "volunteerId" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "status" "RequestStatus" NOT NULL DEFAULT 'CHO_TIEP_NHAN',
    "note" TEXT,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VolunteerRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Mission" (
    "id" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "requestId" TEXT,
    "name" TEXT NOT NULL,
    "missionType" TEXT,
    "priority" "PriorityLevel" NOT NULL DEFAULT 'TRUNG_BINH',
    "status" "RequestStatus" NOT NULL DEFAULT 'CHO_TIEP_NHAN',
    "vehicleName" TEXT,
    "vehiclePlate" TEXT,
    "notes" TEXT,
    "responsibleName" TEXT,
    "responsiblePhone" TEXT,
    "startedAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),

    CONSTRAINT "Mission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RescueTeam" (
    "id" TEXT NOT NULL,
    "missionId" TEXT,
    "name" TEXT NOT NULL,
    "type" TEXT,
    "status" "SystemStatus" NOT NULL DEFAULT 'HOAT_DONG',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RescueTeam_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RescueTeamMember" (
    "userId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "role" "TeamMemberRole" NOT NULL DEFAULT 'THANH_VIEN',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RescueTeamMember_pkey" PRIMARY KEY ("userId","teamId")
);

-- CreateTable
CREATE TABLE "ItemCategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "groupName" TEXT,
    "unit" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ItemCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CollectionPoint" (
    "id" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "missionId" TEXT,
    "name" TEXT NOT NULL,
    "capacity" INTEGER NOT NULL DEFAULT 0,
    "managerName" TEXT,
    "managerPhone" TEXT,
    "managerEmail" TEXT,
    "openedAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "status" "SystemStatus" NOT NULL DEFAULT 'HOAT_DONG',

    CONSTRAINT "CollectionPoint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockLevel" (
    "collectionPointId" TEXT NOT NULL,
    "itemCategoryId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "StockLevel_pkey" PRIMARY KEY ("collectionPointId","itemCategoryId")
);

-- CreateTable
CREATE TABLE "Donor" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "address" TEXT,
    "type" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Donor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DonorGoods" (
    "donorId" TEXT NOT NULL,
    "itemCategoryId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unit" TEXT NOT NULL,
    "status" "RequestStatus" NOT NULL DEFAULT 'HOAN_THANH',

    CONSTRAINT "DonorGoods_pkey" PRIMARY KEY ("donorId","itemCategoryId")
);

-- CreateTable
CREATE TABLE "FundTransaction" (
    "id" TEXT NOT NULL,
    "sepayId" VARCHAR(100),
    "donorId" TEXT,
    "approvedById" TEXT,
    "requestId" TEXT,
    "donorName" VARCHAR(100),
    "donorPhone" VARCHAR(150),
    "donorEmail" VARCHAR(150),
    "type" "TransactionType" NOT NULL,
    "method" "TransactionMethod" NOT NULL DEFAULT 'BANK_TRANSFER',
    "amount" BIGINT NOT NULL DEFAULT 0,
    "transactedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "content" TEXT,
    "status" "TransactionStatus" NOT NULL DEFAULT 'THANH_CONG',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FundTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminUser" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'ADMIN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdminUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
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

-- CreateTable
CREATE TABLE "EmailTemplate" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "trigger" "EmailTemplateTrigger",
    "name" TEXT NOT NULL,
    "description" TEXT,
    "subject" TEXT NOT NULL,
    "htmlBody" TEXT NOT NULL,
    "textBody" TEXT,
    "fromName" TEXT,
    "replyTo" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "variables" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmailTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailLog" (
    "id" TEXT NOT NULL,
    "templateId" TEXT,
    "trigger" "EmailTemplateTrigger" NOT NULL,
    "status" "EmailDeliveryStatus" NOT NULL DEFAULT 'PENDING',
    "recipientEmail" TEXT NOT NULL,
    "recipientName" TEXT,
    "subject" TEXT NOT NULL,
    "htmlBody" TEXT,
    "textBody" TEXT,
    "resendEmailId" TEXT,
    "idempotencyKey" TEXT,
    "errorMessage" TEXT,
    "metadata" JSONB,
    "recipientUserId" TEXT,
    "donorId" TEXT,
    "rescueRequestId" TEXT,
    "volunteerRequestId" TEXT,
    "fundTransactionId" TEXT,
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmailLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_phone_key" ON "User"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "Vehicle_plateNumber_key" ON "Vehicle"("plateNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Role_name_key" ON "Role"("name");

-- CreateIndex
CREATE UNIQUE INDEX "VolunteerRequest_volunteerId_requestId_key" ON "VolunteerRequest"("volunteerId", "requestId");

-- CreateIndex
CREATE UNIQUE INDEX "FundTransaction_sepayId_key" ON "FundTransaction"("sepayId");

-- CreateIndex
CREATE UNIQUE INDEX "AdminUser_username_key" ON "AdminUser"("username");

-- CreateIndex
CREATE INDEX "Notification_recipientKind_userId_readAt_createdAt_idx" ON "Notification"("recipientKind", "userId", "readAt", "createdAt");

-- CreateIndex
CREATE INDEX "Notification_recipientKind_adminUserId_readAt_createdAt_idx" ON "Notification"("recipientKind", "adminUserId", "readAt", "createdAt");

-- CreateIndex
CREATE INDEX "Notification_type_createdAt_idx" ON "Notification"("type", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "EmailTemplate_slug_key" ON "EmailTemplate"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "EmailTemplate_trigger_key" ON "EmailTemplate"("trigger");

-- CreateIndex
CREATE INDEX "EmailTemplate_enabled_trigger_idx" ON "EmailTemplate"("enabled", "trigger");

-- CreateIndex
CREATE UNIQUE INDEX "EmailLog_idempotencyKey_key" ON "EmailLog"("idempotencyKey");

-- CreateIndex
CREATE INDEX "EmailLog_trigger_status_createdAt_idx" ON "EmailLog"("trigger", "status", "createdAt");

-- CreateIndex
CREATE INDEX "EmailLog_recipientEmail_createdAt_idx" ON "EmailLog"("recipientEmail", "createdAt");

-- CreateIndex
CREATE INDEX "EmailLog_rescueRequestId_idx" ON "EmailLog"("rescueRequestId");

-- CreateIndex
CREATE INDEX "EmailLog_volunteerRequestId_idx" ON "EmailLog"("volunteerRequestId");

-- CreateIndex
CREATE INDEX "EmailLog_fundTransactionId_idx" ON "EmailLog"("fundTransactionId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "VolunteerTeam"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Location" ADD CONSTRAINT "Location_reportedById_fkey" FOREIGN KEY ("reportedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Location" ADD CONSTRAINT "Location_verifiedById_fkey" FOREIGN KEY ("verifiedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Need" ADD CONSTRAINT "Need_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vehicle" ADD CONSTRAINT "Vehicle_currentLocationId_fkey" FOREIGN KEY ("currentLocationId") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryItem" ADD CONSTRAINT "InventoryItem_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryItem" ADD CONSTRAINT "InventoryItem_lastUpdatedById_fkey" FOREIGN KEY ("lastUpdatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assignment" ADD CONSTRAINT "Assignment_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assignment" ADD CONSTRAINT "Assignment_volunteerId_fkey" FOREIGN KEY ("volunteerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assignment" ADD CONSTRAINT "Assignment_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assignment" ADD CONSTRAINT "Assignment_assignedById_fkey" FOREIGN KEY ("assignedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserRoleLink" ADD CONSTRAINT "UserRoleLink_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserRoleLink" ADD CONSTRAINT "UserRoleLink_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LocationUpdate" ADD CONSTRAINT "LocationUpdate_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LocationUpdate" ADD CONSTRAINT "LocationUpdate_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RescueRequest" ADD CONSTRAINT "RescueRequest_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RescueRequest" ADD CONSTRAINT "RescueRequest_submittedById_fkey" FOREIGN KEY ("submittedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VolunteerRequest" ADD CONSTRAINT "VolunteerRequest_volunteerId_fkey" FOREIGN KEY ("volunteerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VolunteerRequest" ADD CONSTRAINT "VolunteerRequest_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "RescueRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Mission" ADD CONSTRAINT "Mission_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Mission" ADD CONSTRAINT "Mission_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "RescueRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RescueTeam" ADD CONSTRAINT "RescueTeam_missionId_fkey" FOREIGN KEY ("missionId") REFERENCES "Mission"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RescueTeamMember" ADD CONSTRAINT "RescueTeamMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RescueTeamMember" ADD CONSTRAINT "RescueTeamMember_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "RescueTeam"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CollectionPoint" ADD CONSTRAINT "CollectionPoint_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CollectionPoint" ADD CONSTRAINT "CollectionPoint_missionId_fkey" FOREIGN KEY ("missionId") REFERENCES "Mission"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockLevel" ADD CONSTRAINT "StockLevel_collectionPointId_fkey" FOREIGN KEY ("collectionPointId") REFERENCES "CollectionPoint"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockLevel" ADD CONSTRAINT "StockLevel_itemCategoryId_fkey" FOREIGN KEY ("itemCategoryId") REFERENCES "ItemCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DonorGoods" ADD CONSTRAINT "DonorGoods_donorId_fkey" FOREIGN KEY ("donorId") REFERENCES "Donor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DonorGoods" ADD CONSTRAINT "DonorGoods_itemCategoryId_fkey" FOREIGN KEY ("itemCategoryId") REFERENCES "ItemCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FundTransaction" ADD CONSTRAINT "FundTransaction_donorId_fkey" FOREIGN KEY ("donorId") REFERENCES "Donor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FundTransaction" ADD CONSTRAINT "FundTransaction_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FundTransaction" ADD CONSTRAINT "FundTransaction_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "RescueRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_adminUserId_fkey" FOREIGN KEY ("adminUserId") REFERENCES "AdminUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailLog" ADD CONSTRAINT "EmailLog_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "EmailTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailLog" ADD CONSTRAINT "EmailLog_recipientUserId_fkey" FOREIGN KEY ("recipientUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailLog" ADD CONSTRAINT "EmailLog_donorId_fkey" FOREIGN KEY ("donorId") REFERENCES "Donor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailLog" ADD CONSTRAINT "EmailLog_rescueRequestId_fkey" FOREIGN KEY ("rescueRequestId") REFERENCES "RescueRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailLog" ADD CONSTRAINT "EmailLog_volunteerRequestId_fkey" FOREIGN KEY ("volunteerRequestId") REFERENCES "VolunteerRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailLog" ADD CONSTRAINT "EmailLog_fundTransactionId_fkey" FOREIGN KEY ("fundTransactionId") REFERENCES "FundTransaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;
