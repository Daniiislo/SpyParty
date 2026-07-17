-- CreateEnum
CREATE TYPE "spy_party"."RoomMode" AS ENUM ('ONLINE', 'OFFLINE');

-- DropIndex
DROP INDEX "spy_party"."Clue_matchId_roundNumber_playerId_key";

-- AlterTable
ALTER TABLE "spy_party"."Clue" ADD COLUMN     "describeRound" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "spy_party"."Match" ADD COLUMN     "currentTurnPlayerId" TEXT,
ADD COLUMN     "describeRound" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "spy_party"."MatchPlayer" ADD COLUMN     "ready" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "spy_party"."Room" ADD COLUMN     "describeRounds" INTEGER NOT NULL DEFAULT 2,
ADD COLUMN     "maxPlayers" INTEGER NOT NULL DEFAULT 10,
ADD COLUMN     "mode" "spy_party"."RoomMode" NOT NULL DEFAULT 'ONLINE';

-- CreateIndex
CREATE UNIQUE INDEX "Clue_matchId_roundNumber_describeRound_playerId_key" ON "spy_party"."Clue"("matchId", "roundNumber", "describeRound", "playerId");
