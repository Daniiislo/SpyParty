/** Public surface of the pure game engine. */
export * from "./types";
export { makeRng, shuffle, randomSeed, type Rng } from "./rng";
export { deal, validateSetup, MIN_PLAYERS, type DealInput } from "./deal";
export {
  aliveCounts,
  applyElimination,
  applyOutcome,
  checkMrWhiteGuess,
  describeOrder,
  evaluateOutcome,
  isCivilianWin,
  normalizeWord,
  resolveRevote,
  resolveVote,
  startNextRound,
  tallyVotes,
} from "./rules";
