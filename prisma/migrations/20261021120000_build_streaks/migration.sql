-- AlterEnum
ALTER TYPE "NotificationKind" ADD VALUE 'STREAK_MILESTONE';

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "activeDays" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "longestStreak" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "streakEnd" DATE,
ADD COLUMN     "streakLength" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "timezone" TEXT;

-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "buildDay" DATE;

-- AlterTable
ALTER TABLE "Post" ADD COLUMN     "buildDay" DATE;

-- AlterTable
ALTER TABLE "Notification" ADD COLUMN     "streakDays" INTEGER;

-- CreateTable
CREATE TABLE "BuildDay" (
    "userId" TEXT NOT NULL,
    "day" DATE NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "BuildDay_pkey" PRIMARY KEY ("userId","day")
);

-- CreateTable
CREATE TABLE "StreakMilestone" (
    "userId" TEXT NOT NULL,
    "days" INTEGER NOT NULL,
    "awardedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StreakMilestone_pkey" PRIMARY KEY ("userId","days")
);

-- CreateIndex
CREATE INDEX "User_streakEnd_idx" ON "User"("streakEnd");

-- AddForeignKey
ALTER TABLE "BuildDay" ADD CONSTRAINT "BuildDay_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StreakMilestone" ADD CONSTRAINT "StreakMilestone_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Backfill: existing posts and projects count as build days (UTC, as no timezones are saved yet).
INSERT INTO "BuildDay" ("userId", "day", "count")
SELECT "userId", "day", count(*)::int FROM (
  SELECT "authorId" AS "userId", ("createdAt" AT TIME ZONE 'UTC')::date AS "day" FROM "Post"
  UNION ALL
  SELECT "ownerId", ("createdAt" AT TIME ZONE 'UTC')::date FROM "Project"
) a
GROUP BY "userId", "day";

UPDATE "Post" SET "buildDay" = ("createdAt" AT TIME ZONE 'UTC')::date;
UPDATE "Project" SET "buildDay" = ("createdAt" AT TIME ZONE 'UTC')::date;

-- Summaries via gaps-and-islands: consecutive days share (day - row_number).
WITH d AS (
  SELECT "userId", "day", "day" - (row_number() OVER (PARTITION BY "userId" ORDER BY "day"))::int AS grp FROM "BuildDay"
), runs AS (
  SELECT "userId", count(*)::int AS len, max("day") AS last FROM d GROUP BY "userId", grp
), agg AS (
  SELECT "userId", max(len) AS longest, sum(len)::int AS active,
         (array_agg(len ORDER BY last DESC))[1] AS cur, max(last) AS lastday
  FROM runs GROUP BY "userId"
)
UPDATE "User" u
SET "longestStreak" = agg.longest, "activeDays" = agg.active, "streakLength" = agg.cur, "streakEnd" = agg.lastday
FROM agg WHERE u.id = agg."userId";
