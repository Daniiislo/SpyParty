import "server-only";

import { makeRng, type WordPair } from "@/lib/game";
import {
  getTopic,
  getTopics as bankTopics,
  pickRandomPair,
  resolvePair,
  topicName,
  type BankLocale,
} from "@/lib/game/word-bank";

/** A topic as shown in the setup picker (locale-resolved name). */
export interface TopicOption {
  slug: string;
  name: string;
  emoji: string;
}

/**
 * Load Prisma only when a database is actually configured. Guarding on
 * `DATABASE_URL` keeps `@/lib/prisma` (whose client is built at import time) out
 * of environments without a DB — e.g. CI's `next build` — so the app still
 * builds and plays offline via the in-repo word bank.
 */
async function tryPrisma() {
  if (!process.env.DATABASE_URL) return null;
  try {
    const { prisma } = await import("@/lib/prisma");
    return prisma;
  } catch {
    return null;
  }
}

/** Topics for the setup picker — from Postgres, falling back to the in-repo bank. */
export async function getOfflineTopics(locale: BankLocale): Promise<TopicOption[]> {
  const prisma = await tryPrisma();
  if (prisma) {
    try {
      const rows = await prisma.topic.findMany({
        where: { isActive: true },
        orderBy: { sortOrder: "asc" },
        select: { slug: true, nameVi: true, nameEn: true, emoji: true },
      });
      if (rows.length > 0) {
        return rows.map((r) => ({
          slug: r.slug,
          name: locale === "en" ? r.nameEn : r.nameVi,
          emoji: r.emoji ?? "🗂️",
        }));
      }
    } catch {
      // fall through to the in-repo bank
    }
  }
  return bankTopics().map((t) => ({
    slug: t.slug,
    name: topicName(t, locale),
    emoji: t.emoji,
  }));
}

/**
 * Deal one locale-resolved word pair for a topic — from Postgres, falling back
 * to the in-repo bank. Deterministic for a given `seed`.
 */
export async function getOfflinePair(
  topicSlug: string,
  locale: BankLocale,
  seed: string,
): Promise<WordPair> {
  const rng = makeRng(`${seed}:pair`);
  const prisma = await tryPrisma();
  if (prisma) {
    try {
      const pairs = await prisma.wordPair.findMany({
        where: { isActive: true, topic: { slug: topicSlug } },
        select: {
          civilianWordVi: true,
          spyWordVi: true,
          civilianWordEn: true,
          spyWordEn: true,
        },
      });
      if (pairs.length > 0) {
        const p = pairs[Math.floor(rng() * pairs.length)];
        return locale === "en"
          ? { civilian: p.civilianWordEn, spy: p.spyWordEn }
          : { civilian: p.civilianWordVi, spy: p.spyWordVi };
      }
    } catch {
      // fall through to the in-repo bank
    }
  }
  const topic = getTopic(topicSlug) ?? bankTopics()[0];
  return resolvePair(pickRandomPair(topic, rng), locale);
}
