/**
 * Seed the word-pair bank into Postgres from the in-repo bilingual bank
 * (`src/lib/game/word-bank.ts`), so the same curated data backs both the offline
 * fallback and the database. Idempotent: re-running upserts by stable slug.
 *
 * Run via `prisma db seed` (configured in prisma.config.ts) or
 * `npx tsx prisma/seed.ts`.
 */
import { config } from "dotenv";

config({ path: [".env.local", ".env"] });

import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "../src/generated/prisma/client";
import { WORD_BANK } from "../src/lib/game/word-bank";

const url = process.env.DIRECT_URL || process.env.DATABASE_URL;
if (!url) {
  throw new Error("DATABASE_URL or DIRECT_URL is required to seed.");
}

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });

async function main() {
  let topics = 0;
  let pairs = 0;
  for (const [i, topic] of WORD_BANK.entries()) {
    const row = await prisma.topic.upsert({
      where: { slug: topic.slug },
      create: {
        slug: topic.slug,
        nameVi: topic.nameVi,
        nameEn: topic.nameEn,
        emoji: topic.emoji,
        sortOrder: i,
      },
      update: {
        nameVi: topic.nameVi,
        nameEn: topic.nameEn,
        emoji: topic.emoji,
        sortOrder: i,
      },
    });
    topics++;

    for (const [j, pair] of topic.pairs.entries()) {
      const slug = `${topic.slug}-${j}`;
      await prisma.wordPair.upsert({
        where: { topicId_slug: { topicId: row.id, slug } },
        create: {
          topicId: row.id,
          slug,
          civilianWordVi: pair.civilianVi,
          spyWordVi: pair.spyVi,
          civilianWordEn: pair.civilianEn,
          spyWordEn: pair.spyEn,
        },
        update: {
          civilianWordVi: pair.civilianVi,
          spyWordVi: pair.spyVi,
          civilianWordEn: pair.civilianEn,
          spyWordEn: pair.spyEn,
        },
      });
      pairs++;
    }
  }
  console.log(`Seeded ${topics} topics and ${pairs} word pairs.`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
