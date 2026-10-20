-- CreateTable
CREATE TABLE "Discovery" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "builderId" TEXT,
    "projectId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Discovery_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Discovery_userId_builderId_key" ON "Discovery"("userId", "builderId");

-- CreateIndex
CREATE UNIQUE INDEX "Discovery_userId_projectId_key" ON "Discovery"("userId", "projectId");

-- AddForeignKey
ALTER TABLE "Discovery" ADD CONSTRAINT "Discovery_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Discovery" ADD CONSTRAINT "Discovery_builderId_fkey" FOREIGN KEY ("builderId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Discovery" ADD CONSTRAINT "Discovery_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

