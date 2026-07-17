/**
 * Seeded, deterministic pseudo-randomness for the game engine.
 *
 * Given the same seed, {@link makeRng} produces the same sequence and
 * {@link shuffle} produces the same permutation — this is what lets a match's
 * deal be reproduced from `Match.rngSeed` and keeps engine tests deterministic.
 */

export type Rng = () => number;

/** Hash an arbitrary string seed into a 32-bit unsigned integer (xfnv1a). */
function hashSeed(seed: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/**
 * mulberry32 — a small, fast, well-distributed PRNG. Returns a function that
 * yields floats in [0, 1).
 */
export function makeRng(seed: string): Rng {
  let a = hashSeed(seed);
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Return a new array that is a seeded Fisher–Yates shuffle of `items`. */
export function shuffle<T>(items: readonly T[], rng: Rng): T[] {
  const out = items.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = out[i];
    out[i] = out[j];
    out[j] = tmp;
  }
  return out;
}

/**
 * Generate a fresh opaque seed for a new match. Uses the platform CSPRNG when
 * available (browser and Node both expose `crypto.getRandomValues`), falling
 * back to `Math.random`. Callers pass the returned seed into {@link deal}.
 */
export function randomSeed(): string {
  const g = globalThis as { crypto?: { getRandomValues?: (a: Uint32Array) => Uint32Array } };
  if (g.crypto?.getRandomValues) {
    const buf = new Uint32Array(2);
    g.crypto.getRandomValues(buf);
    return `${buf[0].toString(36)}${buf[1].toString(36)}`;
  }
  return Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
}
