ALTER TABLE "User" ADD COLUMN "passwordHash" TEXT,
ADD COLUMN "securityQuestion" TEXT,
ADD COLUMN "securityAnswerHash" TEXT,
ADD COLUMN "resetFailures" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "resetLockedUntil" TIMESTAMP(3);
