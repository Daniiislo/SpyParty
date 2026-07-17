/**
 * Match scoring for the leaderboard. Pure and deterministic — given the final
 * players + winning side, returns per-player points. Constants are centralized
 * so they're easy to tune.
 */
import type { PlayerState, Role, Side } from "./types";

export const SCORE = {
  participation: 10,
  win: 100,
  /** Bonus for a civilian still alive when the civilians win. */
  civilianSurvivor: 20,
  /** Mr. White stealing the win by guessing the civilian word. */
  mrWhiteSteal: 150,
} as const;

/** Whether a role is on the winning side. */
export function isWinner(role: Role, winner: Side): boolean {
  if (winner === "civilians") return role === "civilian";
  if (winner === "spies") return role === "spy" || role === "mrWhite";
  if (winner === "mrWhite") return role === "mrWhite";
  return false;
}

export interface PlayerScore {
  points: number;
  isWinner: boolean;
}

/** Score every player for a finished match. */
export function scoreMatch(
  players: readonly PlayerState[],
  winner: Side,
): Record<string, PlayerScore> {
  const out: Record<string, PlayerScore> = {};
  for (const p of players) {
    const won = isWinner(p.role, winner);
    let points = SCORE.participation;
    if (won) points += SCORE.win;
    if (winner === "civilians" && p.role === "civilian" && p.status === "alive") {
      points += SCORE.civilianSurvivor;
    }
    if (winner === "mrWhite" && p.role === "mrWhite") {
      points += SCORE.mrWhiteSteal;
    }
    out[p.id] = { points, isWinner: won };
  }
  return out;
}
