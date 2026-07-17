/**
 * In-repo bilingual (VI/EN) word bank — a Phase-1 bootstrap so the offline MVP
 * plays without a database. Phase 2 replaces this with Postgres-backed
 * `Topic`/`WordPair` rows read through a server action; the resolved shape
 * ({@link import("./types").WordPair}) stays the same, so the engine and UI don't
 * change when the source flips.
 *
 * Each pair is a *confusable* civilian/spy pair — close enough to be ambiguous
 * during description, distinct enough to be guessable.
 */

import type { Rng } from "./rng";
import type { WordPair } from "./types";

export type BankLocale = "vi" | "en";

export interface BankWordPair {
  civilianVi: string;
  spyVi: string;
  civilianEn: string;
  spyEn: string;
}

export interface BankTopic {
  slug: string;
  nameVi: string;
  nameEn: string;
  emoji: string;
  pairs: BankWordPair[];
}

export const WORD_BANK: BankTopic[] = [
  {
    slug: "drinks",
    nameVi: "Đồ uống",
    nameEn: "Drinks",
    emoji: "🥤",
    pairs: [
      { civilianVi: "Cà phê", spyVi: "Trà sữa", civilianEn: "Coffee", spyEn: "Milk tea" },
      { civilianVi: "Bia", spyVi: "Rượu vang", civilianEn: "Beer", spyEn: "Wine" },
      { civilianVi: "Nước cam", spyVi: "Nước chanh", civilianEn: "Orange juice", spyEn: "Lemonade" },
      { civilianVi: "Trà đá", spyVi: "Nước lọc", civilianEn: "Iced tea", spyEn: "Water" },
    ],
  },
  {
    slug: "animals",
    nameVi: "Động vật",
    nameEn: "Animals",
    emoji: "🐯",
    pairs: [
      { civilianVi: "Hổ", spyVi: "Báo", civilianEn: "Tiger", spyEn: "Leopard" },
      { civilianVi: "Cá sấu", spyVi: "Thằn lằn", civilianEn: "Crocodile", spyEn: "Lizard" },
      { civilianVi: "Chó", spyVi: "Sói", civilianEn: "Dog", spyEn: "Wolf" },
      { civilianVi: "Ong", spyVi: "Ruồi", civilianEn: "Bee", spyEn: "Fly" },
    ],
  },
  {
    slug: "places",
    nameVi: "Địa điểm",
    nameEn: "Places",
    emoji: "🏙️",
    pairs: [
      { civilianVi: "Bệnh viện", spyVi: "Nhà thuốc", civilianEn: "Hospital", spyEn: "Pharmacy" },
      { civilianVi: "Rạp phim", spyVi: "Nhà hát", civilianEn: "Cinema", spyEn: "Theater" },
      { civilianVi: "Bãi biển", spyVi: "Hồ bơi", civilianEn: "Beach", spyEn: "Swimming pool" },
      { civilianVi: "Sân bay", spyVi: "Bến xe", civilianEn: "Airport", spyEn: "Bus station" },
    ],
  },
  {
    slug: "food",
    nameVi: "Món ăn",
    nameEn: "Food",
    emoji: "🍜",
    pairs: [
      { civilianVi: "Phở", spyVi: "Bún bò", civilianEn: "Pho", spyEn: "Beef noodle soup" },
      { civilianVi: "Bánh mì", spyVi: "Bánh bao", civilianEn: "Banh mi", spyEn: "Steamed bun" },
      { civilianVi: "Pizza", spyVi: "Bánh xèo", civilianEn: "Pizza", spyEn: "Pancake" },
      { civilianVi: "Sushi", spyVi: "Gỏi cuốn", civilianEn: "Sushi", spyEn: "Spring roll" },
    ],
  },
  {
    slug: "jobs",
    nameVi: "Nghề nghiệp",
    nameEn: "Jobs",
    emoji: "🕵️",
    pairs: [
      { civilianVi: "Bác sĩ", spyVi: "Y tá", civilianEn: "Doctor", spyEn: "Nurse" },
      { civilianVi: "Cảnh sát", spyVi: "Bảo vệ", civilianEn: "Police officer", spyEn: "Security guard" },
      { civilianVi: "Giáo viên", spyVi: "Gia sư", civilianEn: "Teacher", spyEn: "Tutor" },
      { civilianVi: "Đầu bếp", spyVi: "Phục vụ", civilianEn: "Chef", spyEn: "Waiter" },
    ],
  },
];

/** All topics (stable order). */
export function getTopics(): BankTopic[] {
  return WORD_BANK;
}

/** Look up a topic by slug. */
export function getTopic(slug: string): BankTopic | undefined {
  return WORD_BANK.find((t) => t.slug === slug);
}

/** Resolve a bank pair to a single locale's {@link WordPair}. */
export function resolvePair(pair: BankWordPair, locale: BankLocale): WordPair {
  return locale === "en"
    ? { civilian: pair.civilianEn, spy: pair.spyEn }
    : { civilian: pair.civilianVi, spy: pair.spyVi };
}

/** Pick a random pair from a topic using the engine's seeded RNG. */
export function pickRandomPair(topic: BankTopic, rng: Rng): BankWordPair {
  return topic.pairs[Math.floor(rng() * topic.pairs.length)];
}

/** A topic's display name in the given locale. */
export function topicName(topic: BankTopic, locale: BankLocale): string {
  return locale === "en" ? topic.nameEn : topic.nameVi;
}
