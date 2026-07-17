-- AlterTable
ALTER TABLE "spy_party"."MatchPlayer" ADD COLUMN     "isWinner" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "pointsAwarded" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "spy_party"."LeaderboardStat" (
    "id" TEXT NOT NULL,
    "clerkUserId" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "gamesPlayed" INTEGER NOT NULL DEFAULT 0,
    "gamesWon" INTEGER NOT NULL DEFAULT 0,
    "totalPoints" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LeaderboardStat_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LeaderboardStat_clerkUserId_key" ON "spy_party"."LeaderboardStat"("clerkUserId");

-- CreateIndex
CREATE INDEX "LeaderboardStat_totalPoints_idx" ON "spy_party"."LeaderboardStat"("totalPoints");
