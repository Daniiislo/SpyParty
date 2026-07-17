// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
  applyElimination,
  checkMrWhiteGuess,
  deal,
  evaluateOutcome,
  startNextRound,
  type PlayerSetup,
} from "./index";

const FIVE: PlayerSetup[] = ["a", "b", "c", "d", "e"].map((x) => ({ id: x, name: x }));

describe("multi-round", () => {
  it("continues after eliminating a civilian, ends when the spy is out", () => {
    let s = deal({
      players: FIVE,
      config: { spyCount: 1, mrWhiteCount: 0, maxRounds: 5 },
      wordPair: { civilian: "Coffee", spy: "Tea" },
      seed: "mr-1",
    });
    const spy = s.players.find((p) => p.role === "spy")!;
    const civ = s.players.find((p) => p.role === "civilian")!;

    // Round 1: eliminate a civilian → not over.
    s = applyElimination(s, civ.id);
    expect(evaluateOutcome(s).matchOver).toBe(false);
    s = startNextRound(s);
    expect(s.roundNumber).toBe(2);

    // Round 2: eliminate the spy → civilians win.
    s = applyElimination(s, spy.id);
    expect(evaluateOutcome(s)).toEqual({ winner: "civilians", matchOver: true });
  });
});

describe("Mr. White (multi-round)", () => {
  it("is dealt no word and can steal with a correct guess", () => {
    const s = deal({
      players: FIVE,
      config: { spyCount: 1, mrWhiteCount: 1, maxRounds: 5 },
      wordPair: { civilian: "Cà phê", spy: "Trà" },
      seed: "mr-2",
    });
    const mw = s.players.find((p) => p.role === "mrWhite")!;
    expect(mw.word).toBeNull();
    expect(checkMrWhiteGuess("ca phe", s.civilianWord)).toBe(true);
    expect(checkMrWhiteGuess("tra", s.civilianWord)).toBe(false);
  });
});
