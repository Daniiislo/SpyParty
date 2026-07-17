-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "spy_party";

-- CreateEnum
CREATE TYPE "spy_party"."Difficulty" AS ENUM ('EASY', 'MEDIUM', 'HARD');

-- CreateTable
CREATE TABLE "spy_party"."Topic" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "nameVi" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "emoji" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Topic_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "spy_party"."WordPair" (
    "id" TEXT NOT NULL,
    "topicId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "civilianWordVi" TEXT NOT NULL,
    "spyWordVi" TEXT NOT NULL,
    "civilianWordEn" TEXT NOT NULL,
    "spyWordEn" TEXT NOT NULL,
    "difficulty" "spy_party"."Difficulty" NOT NULL DEFAULT 'MEDIUM',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WordPair_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Topic_slug_key" ON "spy_party"."Topic"("slug");

-- CreateIndex
CREATE INDEX "Topic_isActive_sortOrder_idx" ON "spy_party"."Topic"("isActive", "sortOrder");

-- CreateIndex
CREATE INDEX "WordPair_topicId_isActive_idx" ON "spy_party"."WordPair"("topicId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "WordPair_topicId_slug_key" ON "spy_party"."WordPair"("topicId", "slug");

-- AddForeignKey
ALTER TABLE "spy_party"."WordPair" ADD CONSTRAINT "WordPair_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "spy_party"."Topic"("id") ON DELETE CASCADE ON UPDATE CASCADE;
