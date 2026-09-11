/*
  Warnings:

  - You are about to drop the column `notes` on the `Mission` table. All the data in the column will be lost.
  - You are about to drop the column `responsibleName` on the `Mission` table. All the data in the column will be lost.
  - You are about to drop the column `responsiblePhone` on the `Mission` table. All the data in the column will be lost.
  - You are about to drop the column `vehicleName` on the `Mission` table. All the data in the column will be lost.
  - You are about to drop the column `vehiclePlate` on the `Mission` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Mission" DROP COLUMN "notes",
DROP COLUMN "responsibleName",
DROP COLUMN "responsiblePhone",
DROP COLUMN "vehicleName",
DROP COLUMN "vehiclePlate";

-- CreateTable
CREATE TABLE "Transportation" (
    "id" TEXT NOT NULL,
    "missionId" TEXT NOT NULL,
    "vehicleType" TEXT NOT NULL,
    "vehiclePlate" TEXT NOT NULL,
    "driverName" TEXT NOT NULL,
    "driverPhone" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Transportation_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Transportation" ADD CONSTRAINT "Transportation_missionId_fkey" FOREIGN KEY ("missionId") REFERENCES "Mission"("id") ON DELETE CASCADE ON UPDATE CASCADE;
