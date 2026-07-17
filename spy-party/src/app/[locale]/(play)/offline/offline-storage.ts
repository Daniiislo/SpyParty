import type { GameConfig, PlayerSetup, WordPair } from "@/lib/game";

/** sessionStorage key handing the dealt setup from `/offline` to `/offline/play`. */
export const OFFLINE_SETUP_KEY = "spy-party:offline-setup";

/**
 * The offline setup produced by the setup screen and consumed by the play
 * screen. Deliberately plain/serializable — offline state never leaves the
 * device (no server, no DB). The `seed` makes the deal reproducible so a refresh
 * re-deals the same roles.
 */
export interface OfflineSetup {
  players: PlayerSetup[];
  config: GameConfig;
  /** Locale-resolved word pair chosen at setup time. */
  wordPair: WordPair;
  /** Localized topic display name (for the reveal card). */
  topicName: string;
  seed: string;
}

/** Read + parse the stored setup, or `null` if absent/invalid. */
export function readOfflineSetup(): OfflineSetup | null {
  if (typeof window === "undefined") return null;
  const raw = window.sessionStorage.getItem(OFFLINE_SETUP_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as OfflineSetup;
  } catch {
    return null;
  }
}
