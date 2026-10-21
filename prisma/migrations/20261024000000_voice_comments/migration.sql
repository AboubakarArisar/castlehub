-- CreateEnum
CREATE TYPE "CommentKind" AS ENUM ('TEXT', 'VOICE');

-- AlterTable
ALTER TABLE "Comment" ADD COLUMN     "audioDuration" DOUBLE PRECISION,
ADD COLUMN     "audioKey" TEXT,
ADD COLUMN     "audioMime" TEXT,
ADD COLUMN     "audioSize" INTEGER,
ADD COLUMN     "kind" "CommentKind" NOT NULL DEFAULT 'TEXT';

-- CreateTable
CREATE TABLE "StorageCleanup" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StorageCleanup_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "StorageCleanup_key_key" ON "StorageCleanup"("key");

