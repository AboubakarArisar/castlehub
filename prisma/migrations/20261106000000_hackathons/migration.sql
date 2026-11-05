-- CreateEnum
CREATE TYPE "HackathonOverride" AS ENUM ('OPEN', 'CLOSED');

-- CreateTable
CREATE TABLE "Hackathon" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT,
    "brief" TEXT NOT NULL DEFAULT '',
    "theme" TEXT,
    "rules" TEXT,
    "prizes" TEXT,
    "coverUrl" TEXT,
    "linkUrl" TEXT,
    "opensAt" TIMESTAMP(3),
    "closesAt" TIMESTAMP(3),
    "override" "HackathonOverride",
    "publishedAt" TIMESTAMP(3),
    "archivedAt" TIMESTAMP(3),
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Hackathon_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HackathonSubmission" (
    "id" TEXT NOT NULL,
    "hackathonId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "tagline" TEXT,
    "description" TEXT,
    "demoUrl" TEXT,
    "repoUrl" TEXT,
    "videoUrl" TEXT,
    "coverUrl" TEXT,
    "images" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "tech" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "featuredAt" TIMESTAMP(3),
    "withdrawnAt" TIMESTAMP(3),
    "hiddenAt" TIMESTAMP(3),
    "hiddenReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HackathonSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Hackathon_slug_key" ON "Hackathon"("slug");

-- CreateIndex
CREATE INDEX "Hackathon_publishedAt_closesAt_idx" ON "Hackathon"("publishedAt", "closesAt");

-- CreateIndex
CREATE INDEX "HackathonSubmission_hackathonId_createdAt_idx" ON "HackathonSubmission"("hackathonId", "createdAt");

-- CreateIndex
CREATE INDEX "HackathonSubmission_authorId_createdAt_idx" ON "HackathonSubmission"("authorId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "HackathonSubmission_hackathonId_authorId_key" ON "HackathonSubmission"("hackathonId", "authorId");

-- AddForeignKey
ALTER TABLE "HackathonSubmission" ADD CONSTRAINT "HackathonSubmission_hackathonId_fkey" FOREIGN KEY ("hackathonId") REFERENCES "Hackathon"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HackathonSubmission" ADD CONSTRAINT "HackathonSubmission_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

