// @vitest-environment node
import { describe, expect, it } from "vitest";
import { makeRng, shuffle } from "./rng";

describe("makeRng", () => {
  it("is deterministic for a given seed", () => {
    const a = makeRng("seed-1");
    const b = makeRng("seed-1");
    const seqA = Array.from({ length: 10 }, () => a());
    const seqB = Array.from({ length: 10 }, () => b());
    expect(seqA).toEqual(seqB);
  });

  it("diverges for different seeds", () => {
    const a = Array.from({ length: 10 }, makeRng("seed-1"));
    const b = Array.from({ length: 10 }, makeRng("seed-2"));
    expect(a).not.toEqual(b);
  });

  it("yields floats in [0, 1)", () => {
    const rng = makeRng("range");
    for (let i = 0; i < 1000; i++) {
      const v = rng();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});

describe("shuffle", () => {
  it("returns the same multiset (a permutation)", () => {
    const input = [1, 2, 3, 4, 5, 6, 7, 8];
    const out = shuffle(input, makeRng("perm"));
    expect(out.slice().sort((x, y) => x - y)).toEqual(input);
  });

  it("is deterministic for a given seed", () => {
    const input = ["a", "b", "c", "d", "e"];
    expect(shuffle(input, makeRng("s"))).toEqual(shuffle(input, makeRng("s")));
  });

  it("does not mutate the input", () => {
    const input = [1, 2, 3];
    const copy = input.slice();
    shuffle(input, makeRng("x"));
    expect(input).toEqual(copy);
  });
});
