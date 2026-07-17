/**
 * Pure game-engine types for Spy Party.
 *
 * This module (and everything under `src/lib/game/`) is framework-agnostic and
 * deterministic: no imports from React / Next / Prisma / Clerk / Supabase. The
 * same engine runs offline (client `useReducer`) and online (server maps DB rows
 * to `GameState`, runs the same functions, persists the diff), so the rules can
 * never diverge between modes.
 */

export type Role = "civilian" | "spy" | "mrWhite";

export type PlayerStatus = "alive" | "eliminated";

/** Which side won a finished match (`"none"` while a match is still in play). */
export type Side = "civilians" | "spies" | "mrWhite" | "none";

export type GamePhase =
  | "lobby"
  | "dealing"
  | "describing"
  | "voting"
  | "elimination"
  | "mrWhiteGuess"
  | "roundEnd"
  | "matchEnd";

export interface GameConfig {
  /** Number of spies. Must be >= 1 and leave at least one civilian. */
  spyCount: number;
  /** Number of Mr. White players (0 when the role is disabled). */
  mrWhiteCount: number;
  /** Seconds per describe turn; `undefined` = untimed (Phase 4a wires the UI). */
  turnTimerSeconds?: number;
  /**
   * Max number of describe→vote→eliminate rounds. When reached with an impostor
   * still alive, the impostors win. Phase 1 (single-round MVP) passes `1`.
   */
  maxRounds?: number;
}

/** Minimal player identity supplied to {@link deal}. */
export interface PlayerSetup {
  id: string;
  name: string;
}

export interface PlayerState {
  id: string;
  name: string;
  /** Stable turn-order position (assigned at deal time, never changes). */
  seatOrder: number;
  role: Role;
  /** The dealt secret word; `null` for Mr. White. */
  word: string | null;
  status: PlayerStatus;
  /** Round number in which this player was eliminated, if any. */
  eliminatedRound?: number;
}

/** A confusable civilian/spy word pair, already resolved to one locale. */
export interface WordPair {
  civilian: string;
  spy: string;
}

export interface GameState {
  phase: GamePhase;
  /** 1-based; incremented by {@link startNextRound}. */
  roundNumber: number;
  config: GameConfig;
  players: PlayerState[];
  civilianWord: string;
  spyWord: string;
  winner: Side;
  /** The RNG seed used to deal this match (deterministic / auditable). */
  seed: string;
}

/** Count of alive players by allegiance. */
export interface AliveCounts {
  civilians: number;
  spies: number;
  mrWhite: number;
  /** spies + mrWhite. */
  nonCivilians: number;
  total: number;
}

/** Result of tallying a round's votes. */
export interface VoteTally {
  /** targetPlayerId → number of votes (abstentions excluded). */
  counts: Record<string, number>;
  /** Highest vote count among candidates (0 if everyone abstained). */
  topCount: number;
  /** Player ids tied at {@link topCount}. Length > 1 means a tie. */
  topIds: string[];
  /** True when more than one candidate is tied for the top. */
  isTie: boolean;
}

/** Outcome of evaluating win conditions after an elimination or steal. */
export interface Outcome {
  winner: Side;
  matchOver: boolean;
}

/** Typed error thrown by the engine for invalid configurations. */
export class GameError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GameError";
  }
}
