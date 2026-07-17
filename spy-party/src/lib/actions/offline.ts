"use server";

import { getOfflinePair } from "@/lib/data/word-bank";
import type { WordPair } from "@/lib/game";
import type { BankLocale } from "@/lib/game/word-bank";

/**
 * Deal a word pair for the offline setup. A thin server action wrapper so the
 * client form can request a DB-backed pair without shipping the whole word bank
 * (and other players' words) to the browser.
 */
export async function dealOfflinePair(
  topicSlug: string,
  locale: BankLocale,
  seed: string,
): Promise<WordPair> {
  return getOfflinePair(topicSlug, locale, seed);
}
