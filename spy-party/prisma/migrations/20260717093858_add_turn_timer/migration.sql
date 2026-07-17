-- AlterTable
ALTER TABLE "spy_party"."Match" ADD COLUMN     "deadlineAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "spy_party"."Room" ADD COLUMN     "turnTimerSeconds" INTEGER;
