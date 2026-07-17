-- CreateEnum
CREATE TYPE "spy_party"."RoomStatus" AS ENUM ('LOBBY', 'IN_PROGRESS', 'COMPLETED');

-- CreateEnum
CREATE TYPE "spy_party"."MatchPhase" AS ENUM ('DEALING', 'DESCRIBING', 'VOTING', 'ELIMINATION', 'MATCH_END');

-- CreateEnum
CREATE TYPE "spy_party"."PlayerRole" AS ENUM ('CIVILIAN', 'SPY', 'MR_WHITE');

-- CreateEnum
CREATE TYPE "spy_party"."PlayerStatus" AS ENUM ('ALIVE', 'ELIMINATED');

-- CreateEnum
CREATE TYPE "spy_party"."WinnerSide" AS ENUM ('CIVILIANS', 'SPIES', 'MR_WHITE', 'NONE');

-- CreateTable
CREATE TABLE "spy_party"."Room" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "status" "spy_party"."RoomStatus" NOT NULL DEFAULT 'LOBBY',
    "hostUserId" TEXT NOT NULL,
    "topicSlug" TEXT,
    "spyCount" INTEGER NOT NULL DEFAULT 1,
    "gameLocale" TEXT NOT NULL DEFAULT 'vi',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "Room_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "spy_party"."Player" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "userId" TEXT,
    "isHost" BOOLEAN NOT NULL DEFAULT false,
    "seatOrder" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Player_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "spy_party"."Match" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "phase" "spy_party"."MatchPhase" NOT NULL DEFAULT 'DEALING',
    "roundNumber" INTEGER NOT NULL DEFAULT 1,
    "civilianWord" TEXT,
    "spyWord" TEXT,
    "seed" TEXT NOT NULL,
    "winnerSide" "spy_party"."WinnerSide",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),

    CONSTRAINT "Match_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "spy_party"."MatchPlayer" (
    "id" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "role" "spy_party"."PlayerRole" NOT NULL,
    "word" TEXT,
    "status" "spy_party"."PlayerStatus" NOT NULL DEFAULT 'ALIVE',
    "eliminatedRound" INTEGER,

    CONSTRAINT "MatchPlayer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "spy_party"."Clue" (
    "id" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "roundNumber" INTEGER NOT NULL,
    "playerId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Clue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "spy_party"."Vote" (
    "id" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "roundNumber" INTEGER NOT NULL,
    "voterPlayerId" TEXT NOT NULL,
    "targetPlayerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Vote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Room_code_key" ON "spy_party"."Room"("code");

-- CreateIndex
CREATE INDEX "Room_status_idx" ON "spy_party"."Room"("status");

-- CreateIndex
CREATE INDEX "Room_hostUserId_idx" ON "spy_party"."Room"("hostUserId");

-- CreateIndex
CREATE INDEX "Player_roomId_idx" ON "spy_party"."Player"("roomId");

-- CreateIndex
CREATE UNIQUE INDEX "Player_roomId_displayName_key" ON "spy_party"."Player"("roomId", "displayName");

-- CreateIndex
CREATE UNIQUE INDEX "Player_roomId_seatOrder_key" ON "spy_party"."Player"("roomId", "seatOrder");

-- CreateIndex
CREATE INDEX "Match_roomId_idx" ON "spy_party"."Match"("roomId");

-- CreateIndex
CREATE INDEX "MatchPlayer_matchId_idx" ON "spy_party"."MatchPlayer"("matchId");

-- CreateIndex
CREATE UNIQUE INDEX "MatchPlayer_matchId_playerId_key" ON "spy_party"."MatchPlayer"("matchId", "playerId");

-- CreateIndex
CREATE INDEX "Clue_matchId_roundNumber_idx" ON "spy_party"."Clue"("matchId", "roundNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Clue_matchId_roundNumber_playerId_key" ON "spy_party"."Clue"("matchId", "roundNumber", "playerId");

-- CreateIndex
CREATE INDEX "Vote_matchId_roundNumber_idx" ON "spy_party"."Vote"("matchId", "roundNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Vote_matchId_roundNumber_voterPlayerId_key" ON "spy_party"."Vote"("matchId", "roundNumber", "voterPlayerId");

-- AddForeignKey
ALTER TABLE "spy_party"."Player" ADD CONSTRAINT "Player_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "spy_party"."Room"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "spy_party"."Match" ADD CONSTRAINT "Match_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "spy_party"."Room"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "spy_party"."MatchPlayer" ADD CONSTRAINT "MatchPlayer_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "spy_party"."Match"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "spy_party"."MatchPlayer" ADD CONSTRAINT "MatchPlayer_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "spy_party"."Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "spy_party"."Clue" ADD CONSTRAINT "Clue_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "spy_party"."Match"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "spy_party"."Vote" ADD CONSTRAINT "Vote_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "spy_party"."Match"("id") ON DELETE CASCADE ON UPDATE CASCADE;
