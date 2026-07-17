import "server-only";

import { auth } from "@clerk/nextjs/server";

import { prisma } from "@/lib/prisma";
import { readGuestPlayerId } from "@/lib/auth/guest-session";
import type { Role } from "@/lib/game";
import { getTopic, topicName as bankTopicName } from "@/lib/game/word-bank";

export type PublicPhase =
  | "lobby"
  | "dealing"
  | "describing"
  | "voting"
  | "elimination"
  | "mrWhiteGuess"
  | "matchEnd";

export interface PublicPlayer {
  id: string;
  name: string;
  seatOrder: number;
  isHost: boolean;
  /** Alive/eliminated once a match is running; `null` in the lobby. */
  alive: boolean | null;
  /** All clues this player has given, in order across every describe round. */
  clues: string[];
  /** Has viewed their word (gates the start of describing). */
  ready: boolean;
  hasVoted: boolean;
  /** Revealed only at match end — never leak roles mid-game. */
  revealedRole: Role | null;
}

export interface RoomState {
  roomId: string;
  code: string;
  mode: "online" | "offline";
  status: "LOBBY" | "IN_PROGRESS" | "COMPLETED";
  phase: PublicPhase;
  roundNumber: number;
  describeRound: number;
  describeRounds: number;
  hostUserId: string;
  spyCount: number;
  mrWhiteCount: number;
  blindMode: boolean;
  maxPlayers: number;
  topicSlug: string | null;
  topicName: string | null;
  players: PublicPlayer[];
  /** True once every alive player has seen their word (DEALING gate). */
  allReady: boolean;
  /** Whose turn to describe. */
  currentTurnPlayerId: string | null;
  /** Vote tally by targetId — present from the voting phase onward. */
  tally: Record<string, number> | null;
  /** Who voted for whom this round (voting phase onward). null target = abstain. */
  votes: { voterId: string; targetId: string | null }[];
  eliminatedPlayerId: string | null;
  /** In the mrWhiteGuess phase, the eliminated Mr. White who may steal the win. */
  pendingMrWhiteId: string | null;
  winner: "civilians" | "spies" | "mrWhite" | "none" | null;
  /** Revealed only at match end. */
  civilianWord: string | null;
  spyWord: string | null;
  /** Absolute deadline (epoch ms) for the current timed phase, or null. */
  deadlineAt: number | null;
  /** Configured per-turn seconds (so the client shows the full duration). */
  turnTimerSeconds: number | null;
  /** Server clock (epoch ms) at fetch time, for client countdown skew. */
  serverNow: number;
  me: { playerId: string | null; isHost: boolean; signedIn: boolean };
}

export interface MyCard {
  /** The player's role, or `null` while blind mode hides it (until match end). */
  role: Role | null;
  word: string | null;
  /** True when the room is in blind mode and the role is intentionally hidden. */
  blind: boolean;
}

const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

/** Generate a 6-char join code from an unambiguous alphabet (no 0/O/1/I/L). */
export function generateCode(): string {
  const bytes = new Uint8Array(6);
  crypto.getRandomValues(bytes);
  let out = "";
  for (let i = 0; i < 6; i++) out += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length];
  return out;
}

function mapRole(role: "CIVILIAN" | "SPY" | "MR_WHITE"): Role {
  return role === "SPY" ? "spy" : role === "MR_WHITE" ? "mrWhite" : "civilian";
}

function mapWinner(
  side: "CIVILIANS" | "SPIES" | "MR_WHITE" | "NONE" | null,
): RoomState["winner"] {
  if (!side) return null;
  return side === "CIVILIANS"
    ? "civilians"
    : side === "SPIES"
      ? "spies"
      : side === "MR_WHITE"
        ? "mrWhite"
        : "none";
}

/** Fetch a room + its latest match with everything needed to build state. */
export async function loadRoom(code: string) {
  return prisma.room.findUnique({
    where: { code: code.toUpperCase() },
    include: {
      players: { orderBy: { seatOrder: "asc" } },
      matches: {
        orderBy: { createdAt: "desc" },
        take: 1,
        include: { matchPlayers: true, clues: true, votes: true },
      },
    },
  });
}

type LoadedRoom = NonNullable<Awaited<ReturnType<typeof loadRoom>>>;

/** Resolve who the caller is within a room (host via Clerk, or guest cookie). */
export async function resolveCaller(room: LoadedRoom): Promise<{
  playerId: string | null;
  isHost: boolean;
  signedIn: boolean;
}> {
  const { userId } = await auth();
  if (userId) {
    const hostPlayer = room.players.find((p) => p.userId === userId);
    if (hostPlayer)
      return { playerId: hostPlayer.id, isHost: hostPlayer.isHost, signedIn: true };
  }
  const guestPid = await readGuestPlayerId(room.code, room.id);
  if (guestPid) {
    const p = room.players.find((pl) => pl.id === guestPid);
    if (p) return { playerId: p.id, isHost: p.isHost, signedIn: !!userId };
  }
  return { playerId: null, isHost: false, signedIn: !!userId };
}

/** Build the secret-free public state for a room (or `null` if it doesn't exist). */
export async function getRoomState(code: string): Promise<RoomState | null> {
  const room = await loadRoom(code);
  if (!room) return null;

  const me = await resolveCaller(room);
  const match = room.matches[0] ?? null;
  const round = match?.roundNumber ?? 1;

  const phase: PublicPhase =
    room.status === "LOBBY" || !match
      ? "lobby"
      : match.phase === "DEALING"
        ? "dealing"
        : match.phase === "DESCRIBING"
          ? "describing"
          : match.phase === "VOTING"
            ? "voting"
            : match.phase === "ELIMINATION"
              ? "elimination"
              : match.phase === "MR_WHITE_GUESS"
                ? "mrWhiteGuess"
                : "matchEnd";

  const atEnd = phase === "matchEnd";

  // Full clue history per player, ordered across every round / describe round.
  const cluesByPlayer = new Map<string, string[]>();
  const orderedClues = [...(match?.clues ?? [])].sort(
    (a, b) =>
      a.roundNumber - b.roundNumber ||
      a.describeRound - b.describeRound ||
      a.createdAt.getTime() - b.createdAt.getTime(),
  );
  for (const c of orderedClues) {
    const list = cluesByPlayer.get(c.playerId) ?? [];
    list.push(c.text);
    cluesByPlayer.set(c.playerId, list);
  }

  const votesThisRound = (match?.votes ?? []).filter((v) => v.roundNumber === round);
  const votedPlayerIds = new Set(votesThisRound.map((v) => v.voterPlayerId));
  const mpByPlayer = new Map((match?.matchPlayers ?? []).map((mp) => [mp.playerId, mp]));

  let aliveReady = 0;
  let aliveTotal = 0;
  const players: PublicPlayer[] = room.players.map((p) => {
    const mp = mpByPlayer.get(p.id);
    const alive = mp ? mp.status === "ALIVE" : null;
    if (mp && mp.status === "ALIVE") {
      aliveTotal++;
      if (mp.ready) aliveReady++;
    }
    return {
      id: p.id,
      name: p.displayName,
      seatOrder: p.seatOrder,
      isHost: p.isHost,
      alive,
      clues: cluesByPlayer.get(p.id) ?? [],
      ready: mp?.ready ?? false,
      hasVoted: votedPlayerIds.has(p.id),
      revealedRole: atEnd && mp ? mapRole(mp.role) : null,
    };
  });

  const currentTurnPlayerId =
    phase === "describing" ? (match?.currentTurnPlayerId ?? null) : null;

  let tally: Record<string, number> | null = null;
  if (phase === "voting" || phase === "elimination" || atEnd) {
    tally = {};
    for (const v of votesThisRound) {
      if (v.targetPlayerId) tally[v.targetPlayerId] = (tally[v.targetPlayerId] ?? 0) + 1;
    }
  }

  const eliminatedMp = (match?.matchPlayers ?? []).find(
    (mp) => mp.eliminatedRound === round,
  );

  return {
    roomId: room.id,
    code: room.code,
    mode: room.mode === "OFFLINE" ? "offline" : "online",
    status: room.status,
    phase,
    roundNumber: round,
    describeRound: match?.describeRound ?? 1,
    describeRounds: room.describeRounds,
    hostUserId: room.hostUserId,
    spyCount: room.spyCount,
    mrWhiteCount: room.mrWhiteCount,
    blindMode: room.blindMode,
    maxPlayers: room.maxPlayers,
    topicSlug: room.topicSlug,
    topicName: (() => {
      if (!room.topicSlug) return null;
      const t = getTopic(room.topicSlug);
      return t ? bankTopicName(t, room.gameLocale === "en" ? "en" : "vi") : null;
    })(),
    players,
    allReady: aliveTotal > 0 && aliveReady === aliveTotal,
    currentTurnPlayerId,
    tally,
    votes:
      phase === "voting" || phase === "elimination" || atEnd
        ? votesThisRound.map((v) => ({
            voterId: v.voterPlayerId,
            targetId: v.targetPlayerId ?? null,
          }))
        : [],
    eliminatedPlayerId:
      phase === "elimination" || phase === "mrWhiteGuess" || atEnd
        ? (eliminatedMp?.playerId ?? null)
        : null,
    pendingMrWhiteId:
      phase === "mrWhiteGuess" ? (match?.pendingMrWhitePlayerId ?? null) : null,
    winner: atEnd ? mapWinner(match?.winnerSide ?? null) : null,
    civilianWord: atEnd ? (match?.civilianWord ?? null) : null,
    spyWord: atEnd ? (match?.spyWord ?? null) : null,
    deadlineAt:
      (phase === "describing" || phase === "voting") && match?.deadlineAt
        ? new Date(match.deadlineAt).getTime()
        : null,
    turnTimerSeconds: room.turnTimerSeconds,
    serverNow: Date.now(),
    me,
  };
}

/** The caller's own dealt card (role + word). Never returns other players' words. */
export async function getMyCard(code: string): Promise<MyCard | null> {
  const room = await loadRoom(code);
  if (!room) return null;
  const me = await resolveCaller(room);
  if (!me.playerId) return null;
  const match = room.matches[0];
  if (!match) return null;
  const mp = match.matchPlayers.find((x) => x.playerId === me.playerId);
  if (!mp) return null;
  // In blind mode we never send the role to the client until the match ends, so
  // the player genuinely cannot know whether they are the spy.
  const blind = room.blindMode && match.phase !== "MATCH_END";
  return {
    role: blind ? null : mapRole(mp.role),
    word: mp.word,
    blind,
  };
}

export interface RoomConfig {
  hostUserId: string;
  status: "LOBBY" | "IN_PROGRESS" | "COMPLETED";
  mode: "online" | "offline";
  topicSlug: string | null;
  spyCount: number;
  mrWhiteCount: number;
  blindMode: boolean;
  turnTimerSeconds: number | null;
  describeRounds: number;
  maxPlayers: number;
}

/** The editable room config (for the lobby settings screen). */
export async function getRoomConfig(code: string): Promise<RoomConfig | null> {
  const room = await prisma.room.findUnique({ where: { code: code.toUpperCase() } });
  if (!room) return null;
  return {
    hostUserId: room.hostUserId,
    status: room.status,
    mode: room.mode === "OFFLINE" ? "offline" : "online",
    topicSlug: room.topicSlug,
    spyCount: room.spyCount,
    mrWhiteCount: room.mrWhiteCount,
    blindMode: room.blindMode,
    turnTimerSeconds: room.turnTimerSeconds,
    describeRounds: room.describeRounds,
    maxPlayers: room.maxPlayers,
  };
}
