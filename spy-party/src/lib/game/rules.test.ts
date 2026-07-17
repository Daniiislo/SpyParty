// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
  aliveCounts,
  applyElimination,
  applyOutcome,
  checkMrWhiteGuess,
  describeOrder,
  evaluateOutcome,
  normalizeWord,
  resolveRevote,
  resolveVote,
  startNextRound,
  tallyVotes,
} from "./rules";
import type { GameConfig, GameState, PlayerState, Role } from "./types";

/** Build a test state from a role list; player ids are p0, p1, … */
function makeState(roles: Role[], config: Partial<GameConfig> = {}): GameState {
  const players: PlayerState[] = roles.map((role, i) => ({
    id: `p${i}`,
    name: `P${i}`,
    seatOrder: i,
    role,
    word: role === "civilian" ? "cat" : role === "spy" ? "dog" : null,
    status: "alive",
  }));
  return {
    phase: "describing",
    roundNumber: 1,
    config: { spyCount: 1, mrWhiteCount: 0, maxRounds: 3, ...config },
    players,
    civilianWord: "Cà phê",
    spyWord: "Trà sữa",
    winner: "none",
    seed: "test",
  };
}

describe("describeOrder", () => {
  it("returns alive players in seat order", () => {
    const s = applyElimination(makeState(["civilian", "spy", "civilian", "civilian"]), "p1");
    expect(describeOrder(s).map((p) => p.id)).toEqual(["p0", "p2", "p3"]);
  });
});

describe("tallyVotes / resolveVote", () => {
  const state = makeState(["civilian", "spy", "civilian", "civilian"]);

  it("counts votes for alive targets and finds a single leader", () => {
    const tally = tallyVotes({ p0: "p1", p2: "p1", p3: "p0", p1: null }, state);
    expect(tally.counts).toEqual({ p1: 2, p0: 1 });
    expect(tally.topCount).toBe(2);
    expect(tally.isTie).toBe(false);
    expect(resolveVote(tally)).toEqual({ eliminatedId: "p1", needsRevote: false });
  });

  it("ignores abstentions", () => {
    const tally = tallyVotes({ p0: null, p1: null, p2: "p3", p3: null }, state);
    expect(tally.counts).toEqual({ p3: 1 });
    expect(resolveVote(tally).eliminatedId).toBe("p3");
  });

  it("flags a tie and requests a revote", () => {
    const tally = tallyVotes({ p0: "p1", p1: "p0", p2: "p3", p3: "p2" }, state);
    expect(tally.isTie).toBe(true);
    expect(resolveVote(tally)).toEqual({ eliminatedId: null, needsRevote: true });
  });

  it("eliminates nobody when everyone abstains", () => {
    const tally = tallyVotes({ p0: null, p1: null, p2: null, p3: null }, state);
    expect(tally.topIds).toEqual([]);
    expect(resolveVote(tally)).toEqual({ eliminatedId: null, needsRevote: false });
  });
});

describe("resolveRevote", () => {
  const state = makeState(["civilian", "spy", "civilian", "civilian"]);
  it("eliminates the revote leader", () => {
    const tally = tallyVotes({ p0: "p1", p2: "p1", p3: "p0" }, state);
    expect(resolveRevote(tally)).toEqual({ eliminatedId: "p1" });
  });
  it("eliminates nobody when the revote ties again", () => {
    const tally = tallyVotes({ p0: "p1", p1: "p0" }, state);
    expect(resolveRevote(tally)).toEqual({ eliminatedId: null });
  });
});

describe("applyElimination", () => {
  it("marks the player eliminated in the current round", () => {
    const s = applyElimination(makeState(["civilian", "spy", "civilian"]), "p1");
    const p1 = s.players.find((p) => p.id === "p1")!;
    expect(p1.status).toBe("eliminated");
    expect(p1.eliminatedRound).toBe(1);
  });
  it("is a no-op for a null id", () => {
    const before = makeState(["civilian", "spy", "civilian"]);
    expect(applyElimination(before, null)).toBe(before);
  });
});

describe("evaluateOutcome", () => {
  it("civilians win when the last spy is out (single round)", () => {
    // 4 players 1 spy, spy (p1) voted out round 1.
    const s = applyElimination(makeState(["civilian", "spy", "civilian", "civilian"]), "p1");
    expect(evaluateOutcome(s)).toEqual({ winner: "civilians", matchOver: true });
  });

  it("spies win at parity", () => {
    // 4 players 1 spy; two civilians eliminated → 1 civ vs 1 spy = parity.
    let s = makeState(["civilian", "spy", "civilian", "civilian"]);
    s = applyElimination(s, "p0");
    s = applyElimination(s, "p2");
    expect(evaluateOutcome(s)).toEqual({ winner: "spies", matchOver: true });
  });

  it("spies win when maxRounds is exhausted with a spy alive", () => {
    // Single-round MVP: nobody useful eliminated, round 1 == maxRounds 1.
    const s = makeState(["civilian", "spy", "civilian", "civilian"], { maxRounds: 1 });
    expect(evaluateOutcome(s)).toEqual({ winner: "spies", matchOver: true });
  });

  it("continues when a civilian is out but the match is unresolved", () => {
    const s = applyElimination(
      makeState(["civilian", "spy", "civilian", "civilian", "civilian"], { maxRounds: 5 }),
      "p0",
    );
    expect(evaluateOutcome(s)).toEqual({ winner: "none", matchOver: false });
  });

  it("counts Mr. White as a non-civilian for parity", () => {
    // 5 players: 1 spy + 1 mrWhite + 3 civ. Eliminate 2 civilians → 2 non-civ vs 1 civ.
    let s = makeState(["civilian", "spy", "mrWhite", "civilian", "civilian"], {
      spyCount: 1,
      mrWhiteCount: 1,
      maxRounds: 5,
    });
    s = applyElimination(s, "p0");
    s = applyElimination(s, "p3");
    expect(evaluateOutcome(s).winner).toBe("spies");
  });
});

describe("applyOutcome / startNextRound", () => {
  it("sets winner and matchEnd when over", () => {
    const s = applyOutcome(makeState(["civilian", "spy", "civilian"]), {
      winner: "civilians",
      matchOver: true,
    });
    expect(s.phase).toBe("matchEnd");
    expect(s.winner).toBe("civilians");
  });
  it("advances the round when continuing", () => {
    const s = startNextRound(makeState(["civilian", "spy", "civilian", "civilian"]));
    expect(s.roundNumber).toBe(2);
    expect(s.phase).toBe("describing");
  });
});

describe("normalizeWord / checkMrWhiteGuess", () => {
  it("folds Vietnamese diacritics and case/whitespace", () => {
    expect(normalizeWord("  Cà   PHÊ ")).toBe("ca phe");
    expect(normalizeWord("Đà Nẵng")).toBe("da nang");
  });
  it("matches a diacritic-insensitive guess", () => {
    expect(checkMrWhiteGuess("ca phe", "Cà phê")).toBe(true);
    expect(checkMrWhiteGuess("tra sua", "Cà phê")).toBe(false);
  });
});

describe("aliveCounts", () => {
  it("tallies allegiances", () => {
    const c = aliveCounts(makeState(["civilian", "spy", "mrWhite", "civilian"]));
    expect(c).toMatchObject({ civilians: 2, spies: 1, mrWhite: 1, nonCivilians: 2, total: 4 });
  });
});
