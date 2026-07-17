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
  | "matchEnd";

export interface PublicPlayer {
  id: string;
  name: string;
  seatOrder: number;
  isHost: boolean;
  /** Alive/eliminated once a match is running; `null` in the lobby. */
  alive: boolean | null;
  /** This round's clue, shown to everyone once submitted (clues aren't secret). */
  clue: string | null;
  hasVoted: boolean;
  /** Revealed only at match end — never leak roles mid-game. */
  revealedRole: Role | null;
}

export interface RoomState {
  roomId: string;
  code: string;
  status: "LOBBY" | "IN_PROGRESS" | "COMPLETED";
  phase: PublicPhase;
  roundNumber: number;
  hostUserId: string;
  spyCount: number;
  topicName: string | null;
  players: PublicPlayer[];
  /** Whose turn to describe (first alive player without a clue this round). */
  currentTurnPlayerId: string | null;
  /** Vote tally by targetId — present from the voting phase onward. */
  tally: Record<string, number> | null;
  eliminatedPlayerId: string | null;
  winner: "civilians" | "spies" | "mrWhite" | "none" | null;
  /** Revealed only at match end. */
  civilianWord: string | null;
  spyWord: string | null;
  me: { playerId: string | null; isHost: boolean; signedIn: boolean };
}

export interface MyCard {
  role: Role;
  word: string | null;
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
              : "matchEnd";

  const atEnd = phase === "matchEnd";
  const cluesThisRound = new Map(
    (match?.clues ?? [])
      .filter((c) => c.roundNumber === round)
      .map((c) => [c.playerId, c.text]),
  );
  const votesThisRound = (match?.votes ?? []).filter((v) => v.roundNumber === round);
  const votedPlayerIds = new Set(votesThisRound.map((v) => v.voterPlayerId));
  const mpByPlayer = new Map((match?.matchPlayers ?? []).map((mp) => [mp.playerId, mp]));

  const players: PublicPlayer[] = room.players.map((p) => {
    const mp = mpByPlayer.get(p.id);
    return {
      id: p.id,
      name: p.displayName,
      seatOrder: p.seatOrder,
      isHost: p.isHost,
      alive: mp ? mp.status === "ALIVE" : null,
      clue: cluesThisRound.get(p.id) ?? null,
      hasVoted: votedPlayerIds.has(p.id),
      revealedRole: atEnd && mp ? mapRole(mp.role) : null,
    };
  });

  // Whose turn to describe: first alive player (seat order) without a clue.
  let currentTurnPlayerId: string | null = null;
  if (phase === "describing") {
    const next = players.find((p) => p.alive && !cluesThisRound.has(p.id));
    currentTurnPlayerId = next?.id ?? null;
  }

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
    status: room.status,
    phase,
    roundNumber: round,
    hostUserId: room.hostUserId,
    spyCount: room.spyCount,
    topicName: (() => {
      if (!room.topicSlug) return null;
      const t = getTopic(room.topicSlug);
      return t ? bankTopicName(t, room.gameLocale === "en" ? "en" : "vi") : null;
    })(),
    players,
    currentTurnPlayerId,
    tally,
    eliminatedPlayerId:
      phase === "elimination" || atEnd ? (eliminatedMp?.playerId ?? null) : null,
    winner: atEnd ? mapWinner(match?.winnerSide ?? null) : null,
    civilianWord: atEnd ? (match?.civilianWord ?? null) : null,
    spyWord: atEnd ? (match?.spyWord ?? null) : null,
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
  return { role: mapRole(mp.role), word: mp.word };
}
