-- CreateEnum
CREATE TYPE "WallReview" AS ENUM ('NONE', 'PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "WallReportReason" AS ENUM ('INAPPROPRIATE', 'OFFENSIVE', 'SPAM', 'COPIED', 'OTHER');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "wallRestrictedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "WallTile" (
    "id" TEXT NOT NULL,
    "x" INTEGER NOT NULL,
    "y" INTEGER NOT NULL,
    "ownerId" TEXT NOT NULL,
    "draft" JSONB,
    "draftUpdatedAt" TIMESTAMP(3),
    "submittedKey" TEXT,
    "submittedAt" TIMESTAMP(3),
    "review" "WallReview" NOT NULL DEFAULT 'NONE',
    "reviewNote" TEXT,
    "publishedKey" TEXT,
    "publishedAt" TIMESTAMP(3),
    "publishedVersion" INTEGER NOT NULL DEFAULT 0,
    "hiddenAt" TIMESTAMP(3),
    "hiddenReason" TEXT,
    "claimedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WallTile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WallReport" (
    "id" TEXT NOT NULL,
    "tileId" TEXT NOT NULL,
    "reporterId" TEXT NOT NULL,
    "reason" "WallReportReason" NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "WallReport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WallTile_ownerId_key" ON "WallTile"("ownerId");

-- CreateIndex
CREATE INDEX "WallTile_review_idx" ON "WallTile"("review");

-- CreateIndex
CREATE INDEX "WallTile_updatedAt_idx" ON "WallTile"("updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "WallTile_x_y_key" ON "WallTile"("x", "y");

-- CreateIndex
CREATE INDEX "WallReport_resolvedAt_idx" ON "WallReport"("resolvedAt");

-- CreateIndex
CREATE UNIQUE INDEX "WallReport_tileId_reporterId_key" ON "WallReport"("tileId", "reporterId");

-- AddForeignKey
ALTER TABLE "WallTile" ADD CONSTRAINT "WallTile_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WallReport" ADD CONSTRAINT "WallReport_tileId_fkey" FOREIGN KEY ("tileId") REFERENCES "WallTile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WallReport" ADD CONSTRAINT "WallReport_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

