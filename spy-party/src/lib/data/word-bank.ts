import "server-only";

import { GameError, makeRng, type WordPair } from "@/lib/game";
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
        // Stable ordering: sortOrder first, then name as a deterministic
        // tiebreak so duplicate sortOrder values never reorder between renders.
        orderBy: [{ sortOrder: "asc" }, { nameVi: "asc" }, { slug: "asc" }],
        select: { slug: true, nameVi: true, nameEn: true, emoji: true },
      });
      if (rows.length > 0) {
        return rows.map((r: { slug: string; nameVi: string; nameEn: string; emoji: string | null }) => ({
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
    // The DB is the source of truth whenever it is configured.
    let pairs: Array<{
      civilianWordVi: string;
      spyWordVi: string;
      civilianWordEn: string;
      spyWordEn: string;
    }> | null = null;
    try {
      pairs = await prisma.wordPair.findMany({
        where: { isActive: true, topic: { slug: topicSlug } },
        select: {
          civilianWordVi: true,
          spyWordVi: true,
          civilianWordEn: true,
          spyWordEn: true,
        },
      });
    } catch {
      // A transient DB error — fall through to the in-repo bank below.
      pairs = null;
    }
    if (pairs && pairs.length > 0) {
      const p = pairs[Math.floor(rng() * pairs.length)];
      return locale === "en"
        ? { civilian: p.civilianWordEn, spy: p.spyWordEn }
        : { civilian: p.civilianWordVi, spy: p.spyWordVi };
    }
    if (pairs && pairs.length === 0) {
      // The topic exists in the picker but has no pairs in the DB. Prefer the
      // in-repo bank for the *same* slug; never silently deal an unrelated
      // topic's words (which would make the whole round nonsensical).
      const local = getTopic(topicSlug);
      if (local) return resolvePair(pickRandomPair(local, rng), locale);
      throw new GameError(`no active word pairs for topic "${topicSlug}"`);
    }
    // pairs === null: DB hiccup — fall through to the offline bank.
  }
  // No DB configured (e.g. CI build / pure offline): use the in-repo bank.
  const topic = getTopic(topicSlug) ?? bankTopics()[0];
  return resolvePair(pickRandomPair(topic, rng), locale);
}
