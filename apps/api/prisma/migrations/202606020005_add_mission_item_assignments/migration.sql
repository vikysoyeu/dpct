-- CreateTable
CREATE TABLE "MissionItemAssignment" (
    "missionId" TEXT NOT NULL,
    "itemCategoryId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MissionItemAssignment_pkey" PRIMARY KEY ("missionId","itemCategoryId")
);

-- CreateIndex
CREATE INDEX "MissionItemAssignment_itemCategoryId_idx" ON "MissionItemAssignment"("itemCategoryId");

-- AddForeignKey
ALTER TABLE "MissionItemAssignment" ADD CONSTRAINT "MissionItemAssignment_missionId_fkey" FOREIGN KEY ("missionId") REFERENCES "Mission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MissionItemAssignment" ADD CONSTRAINT "MissionItemAssignment_itemCategoryId_fkey" FOREIGN KEY ("itemCategoryId") REFERENCES "ItemCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;
