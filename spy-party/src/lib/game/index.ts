/** Public surface of the pure game engine. */
export * from "./types";
export { VOTE_TIMER_SECONDS } from "./constants";
export { makeRng, shuffle, randomSeed, type Rng } from "./rng";
export { deal, validateSetup, MIN_PLAYERS, type DealInput } from "./deal";
export { SCORE, isWinner, scoreMatch, type PlayerScore } from "./scoring";
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
