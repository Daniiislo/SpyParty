/**
 * Round resolution & win conditions — pure functions over {@link GameState}.
 *
 * All functions are side-effect-free and return new state rather than mutating
 * the input, so the same logic is safe to run in a client reducer (offline) or a
 * server transaction (online).
 */

import {
  type AliveCounts,
  type GameState,
  type Outcome,
  type PlayerState,
  type Side,
  type VoteTally,
} from "./types";

/** Alive players in stable turn order (by seatOrder). */
export function describeOrder(state: GameState): PlayerState[] {
  return state.players
    .filter((p) => p.status === "alive")
    .sort((a, b) => a.seatOrder - b.seatOrder);
}

/** Count alive players by allegiance. */
export function aliveCounts(state: GameState): AliveCounts {
  let civilians = 0;
  let spies = 0;
  let mrWhite = 0;
  for (const p of state.players) {
    if (p.status !== "alive") continue;
    if (p.role === "civilian") civilians++;
    else if (p.role === "spy") spies++;
    else mrWhite++;
  }
  return {
    civilians,
    spies,
    mrWhite,
    nonCivilians: spies + mrWhite,
    total: civilians + spies + mrWhite,
  };
}

/**
 * Tally a round's votes. `votes` maps voterId → targetId (or `null` to abstain).
 * Only votes for alive candidates are counted. Ties are reported, not resolved —
 * the caller drives the sudden-death revote (see {@link resolveRevote}).
 */
export function tallyVotes(
  votes: Record<string, string | null>,
  state: GameState,
): VoteTally {
  const aliveIds = new Set(
    state.players.filter((p) => p.status === "alive").map((p) => p.id),
  );
  const counts: Record<string, number> = {};
  for (const target of Object.values(votes)) {
    if (target && aliveIds.has(target)) {
      counts[target] = (counts[target] ?? 0) + 1;
    }
  }

  let topCount = 0;
  for (const c of Object.values(counts)) if (c > topCount) topCount = c;
  const topIds = Object.keys(counts).filter((id) => counts[id] === topCount);

  return {
    counts,
    topCount,
    // No votes at all → nobody is "top".
    topIds: topCount === 0 ? [] : topIds,
    isTie: topCount > 0 && topIds.length > 1,
  };
}

/**
 * Decide who (if anyone) is eliminated after the initial vote.
 * - Single leader → that player.
 * - Tie → `null` + `needsRevote: true` (caller runs one sudden-death revote).
 * - No votes → `null`.
 */
export function resolveVote(tally: VoteTally): {
  eliminatedId: string | null;
  needsRevote: boolean;
} {
  if (tally.topIds.length === 1) {
    return { eliminatedId: tally.topIds[0], needsRevote: false };
  }
  return { eliminatedId: null, needsRevote: tally.isTie };
}

/**
 * Resolve a sudden-death revote among the previously-tied candidates. If it
 * produces a single leader that player is eliminated; if it ties again, nobody
 * is eliminated this round (deterministic, loop-free).
 */
export function resolveRevote(tally: VoteTally): { eliminatedId: string | null } {
  return { eliminatedId: tally.topIds.length === 1 ? tally.topIds[0] : null };
}

/** Return new state with `playerId` marked eliminated in the current round. */
export function applyElimination(
  state: GameState,
  playerId: string | null,
): GameState {
  if (!playerId) return state;
  return {
    ...state,
    players: state.players.map((p) =>
      p.id === playerId
        ? { ...p, status: "eliminated", eliminatedRound: state.roundNumber }
        : p,
    ),
  };
}

/**
 * Evaluate win conditions after an elimination.
 * - Civilians win when no impostors remain.
 * - Impostors win at parity (nonCivilians >= civilians).
 * - `maxRounds` exhausted with an impostor alive → impostors win (they evaded).
 */
export function evaluateOutcome(state: GameState): Outcome {
  const a = aliveCounts(state);
  if (a.nonCivilians === 0) return { winner: "civilians", matchOver: true };
  if (a.nonCivilians >= a.civilians) return { winner: "spies", matchOver: true };
  if (state.config.maxRounds != null && state.roundNumber >= state.config.maxRounds) {
    return { winner: "spies", matchOver: true };
  }
  return { winner: "none", matchOver: false };
}

/** Apply an {@link Outcome} to state (sets winner + `matchEnd` when over). */
export function applyOutcome(state: GameState, outcome: Outcome): GameState {
  if (!outcome.matchOver) return state;
  return { ...state, winner: outcome.winner, phase: "matchEnd" };
}

/** Advance to the next describe round (used by multi-round play). */
export function startNextRound(state: GameState): GameState {
  return {
    ...state,
    roundNumber: state.roundNumber + 1,
    phase: "describing",
  };
}

/**
 * Normalize a word for tolerant comparison: trim, lowercase, collapse internal
 * whitespace, and fold Vietnamese diacritics (so "Cà phê" matches "ca phe").
 */
export function normalizeWord(word: string): string {
  return word
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // strip combining diacritical marks
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/** Whether Mr. White's guess matches the civilian word (diacritic-folded). */
export function checkMrWhiteGuess(guess: string, civilianWord: string): boolean {
  return normalizeWord(guess) === normalizeWord(civilianWord);
}

/** Convenience: is a given side a civilian win? (used for UI theming). */
export function isCivilianWin(side: Side): boolean {
  return side === "civilians";
}
