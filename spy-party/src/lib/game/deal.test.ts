// @vitest-environment node
import { describe, expect, it } from "vitest";
import { deal, validateSetup, type DealInput } from "./deal";
import { GameError, type GameConfig, type PlayerSetup } from "./types";

const PLAYERS: PlayerSetup[] = [
  { id: "p1", name: "Alpha" },
  { id: "p2", name: "Bravo" },
  { id: "p3", name: "Charlie" },
  { id: "p4", name: "Delta" },
  { id: "p5", name: "Echo" },
];

const PAIR = { civilian: "Coffee", spy: "Milk tea" };

function makeInput(config: GameConfig, seed = "seed", players = PLAYERS): DealInput {
  return { players, config, wordPair: PAIR, seed };
}

describe("validateSetup", () => {
  it("rejects too few players", () => {
    expect(() => validateSetup(2, { spyCount: 1, mrWhiteCount: 0 })).toThrow(GameError);
  });
  it("rejects spyCount < 1", () => {
    expect(() => validateSetup(5, { spyCount: 0, mrWhiteCount: 0 })).toThrow(GameError);
  });
  it("rejects impostors at parity", () => {
    // 4 players, 2 spies → 2 civilians = parity → invalid.
    expect(() => validateSetup(4, { spyCount: 2, mrWhiteCount: 0 })).toThrow(GameError);
  });
  it("rejects impostors >= players", () => {
    expect(() => validateSetup(3, { spyCount: 2, mrWhiteCount: 1 })).toThrow(GameError);
  });
  it("accepts a valid setup", () => {
    expect(() => validateSetup(5, { spyCount: 1, mrWhiteCount: 1 })).not.toThrow();
  });
});

describe("deal", () => {
  it("assigns the exact requested role counts", () => {
    const state = deal(makeInput({ spyCount: 1, mrWhiteCount: 1, maxRounds: 3 }));
    const roles = state.players.map((p) => p.role);
    expect(roles.filter((r) => r === "spy")).toHaveLength(1);
    expect(roles.filter((r) => r === "mrWhite")).toHaveLength(1);
    expect(roles.filter((r) => r === "civilian")).toHaveLength(3);
  });

  it("gives civilians the civilian word, spies the spy word, Mr. White none", () => {
    const state = deal(makeInput({ spyCount: 1, mrWhiteCount: 1 }));
    for (const p of state.players) {
      if (p.role === "civilian") expect(p.word).toBe(PAIR.civilian);
      else if (p.role === "spy") expect(p.word).toBe(PAIR.spy);
      else expect(p.word).toBeNull();
    }
  });

  it("preserves input order as seatOrder", () => {
    const state = deal(makeInput({ spyCount: 1, mrWhiteCount: 0 }));
    expect(state.players.map((p) => p.id)).toEqual(PLAYERS.map((p) => p.id));
    expect(state.players.map((p) => p.seatOrder)).toEqual([0, 1, 2, 3, 4]);
  });

  it("is deterministic for a given seed", () => {
    const a = deal(makeInput({ spyCount: 1, mrWhiteCount: 0 }, "same"));
    const b = deal(makeInput({ spyCount: 1, mrWhiteCount: 0 }, "same"));
    expect(a.players.map((p) => p.role)).toEqual(b.players.map((p) => p.role));
  });

  it("starts in describing / round 1 with no winner", () => {
    const state = deal(makeInput({ spyCount: 1, mrWhiteCount: 0 }));
    expect(state.phase).toBe("describing");
    expect(state.roundNumber).toBe(1);
    expect(state.winner).toBe("none");
  });
});
