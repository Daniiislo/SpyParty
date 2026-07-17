// @vitest-environment node
import { describe, expect, it } from "vitest";
import { SCORE, isWinner, scoreMatch } from "./scoring";
import type { PlayerState, Role } from "./types";

function player(id: string, role: Role, status: "alive" | "eliminated" = "alive"): PlayerState {
  return { id, name: id, seatOrder: 0, role, word: null, status };
}

describe("isWinner", () => {
  it("attributes wins to the right side", () => {
    expect(isWinner("civilian", "civilians")).toBe(true);
    expect(isWinner("spy", "civilians")).toBe(false);
    expect(isWinner("spy", "spies")).toBe(true);
    expect(isWinner("mrWhite", "spies")).toBe(true);
    expect(isWinner("mrWhite", "mrWhite")).toBe(true);
    expect(isWinner("civilian", "mrWhite")).toBe(false);
  });
});

describe("scoreMatch", () => {
  it("civilians win: winners + survivor bonus", () => {
    const s = scoreMatch(
      [player("c1", "civilian"), player("c2", "civilian", "eliminated"), player("s1", "spy")],
      "civilians",
    );
    expect(s.c1).toEqual({
      points: SCORE.participation + SCORE.win + SCORE.civilianSurvivor,
      isWinner: true,
    });
    expect(s.c2.points).toBe(SCORE.participation + SCORE.win); // eliminated → no survivor bonus
    expect(s.s1).toEqual({ points: SCORE.participation, isWinner: false });
  });

  it("Mr. White steal awards the steal bonus", () => {
    const s = scoreMatch([player("m", "mrWhite"), player("c", "civilian")], "mrWhite");
    expect(s.m).toEqual({
      points: SCORE.participation + SCORE.win + SCORE.mrWhiteSteal,
      isWinner: true,
    });
    expect(s.c.isWinner).toBe(false);
  });
});
