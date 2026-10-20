-- AlterTable
ALTER TABLE "User" ADD COLUMN     "cityId" INTEGER,
ADD COLUMN     "countryCode" TEXT,
ADD COLUMN     "onWorldMap" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "User_onWorldMap_countryCode_idx" ON "User"("onWorldMap", "countryCode");

