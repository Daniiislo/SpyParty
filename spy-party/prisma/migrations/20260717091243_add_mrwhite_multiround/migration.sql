-- AlterEnum
ALTER TYPE "spy_party"."MatchPhase" ADD VALUE 'MR_WHITE_GUESS';

-- AlterTable
ALTER TABLE "spy_party"."Match" ADD COLUMN     "pendingMrWhitePlayerId" TEXT;

-- AlterTable
ALTER TABLE "spy_party"."Room" ADD COLUMN     "mrWhiteCount" INTEGER NOT NULL DEFAULT 0;
