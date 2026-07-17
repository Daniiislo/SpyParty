/**
 * Role & word dealing — the deterministic heart of match setup.
 *
 * Given players, config, a locale-resolved word pair, and a seed, {@link deal}
 * assigns roles (civilian / spy / Mr. White) and words. The word pair is chosen
 * outside the engine (from the DB or the in-repo word bank), so this module
 * stays free of any I/O.
 */

import { makeRng, shuffle } from "./rng";
import {
  GameError,
  type GameConfig,
  type GameState,
  type PlayerSetup,
  type PlayerState,
  type Role,
  type WordPair,
} from "./types";

export interface DealInput {
  players: PlayerSetup[];
  config: GameConfig;
  wordPair: WordPair;
  seed: string;
}

/** Minimum players for a meaningful game (at least 1 spy + 2 civilians). */
export const MIN_PLAYERS = 3;

/**
 * Validate a config against a player count. Throws {@link GameError} with a
 * stable, machine-readable message on any violation. Exposed so the setup UI
 * can validate before dealing.
 */
export function validateSetup(playerCount: number, config: GameConfig): void {
  const spyCount = config.spyCount;
  const mrWhiteCount = config.mrWhiteCount;

  if (!Number.isInteger(playerCount) || playerCount < MIN_PLAYERS) {
    throw new GameError(`playerCount must be an integer >= ${MIN_PLAYERS}`);
  }
  if (!Number.isInteger(spyCount) || spyCount < 1) {
    throw new GameError("spyCount must be an integer >= 1");
  }
  if (!Number.isInteger(mrWhiteCount) || mrWhiteCount < 0) {
    throw new GameError("mrWhiteCount must be an integer >= 0");
  }
  const impostors = spyCount + mrWhiteCount;
  // At least one civilian must remain, and impostors must not start at parity
  // (that would mean they have already won before the first round).
  if (impostors >= playerCount) {
    throw new GameError("too many impostors: need at least one civilian");
  }
  const civilians = playerCount - impostors;
  if (impostors >= civilians) {
    throw new GameError("impostors must not start at or above parity with civilians");
  }
}

/**
 * Deal roles and words. Returns a fresh {@link GameState} in the `describing`
 * phase of round 1. Deterministic for a given `seed`.
 */
export function deal(input: DealInput): GameState {
  const { players, config, wordPair, seed } = input;
  validateSetup(players.length, config);

  const rng = makeRng(seed);
  // Shuffle a list of seat indices, then hand out roles by position in the
  // shuffle. seatOrder stays the original input order (drives turn order); only
  // the role assignment is randomized.
  const order = shuffle(
    players.map((_, i) => i),
    rng,
  );

  const roleByIndex = new Array<Role>(players.length).fill("civilian");
  let cursor = 0;
  for (let i = 0; i < config.spyCount; i++) roleByIndex[order[cursor++]] = "spy";
  for (let i = 0; i < config.mrWhiteCount; i++) roleByIndex[order[cursor++]] = "mrWhite";

  const dealt: PlayerState[] = players.map((p, i) => {
    const role = roleByIndex[i];
    const word =
      role === "civilian" ? wordPair.civilian : role === "spy" ? wordPair.spy : null;
    return {
      id: p.id,
      name: p.name,
      seatOrder: i,
      role,
      word,
      status: "alive",
    };
  });

  return {
    phase: "describing",
    roundNumber: 1,
    config,
    players: dealt,
    civilianWord: wordPair.civilian,
    spyWord: wordPair.spy,
    winner: "none",
    seed,
  };
}
