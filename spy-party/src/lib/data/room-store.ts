import "server-only";

import { prisma } from "@/lib/prisma";

export interface MemoryPlayer {
  id: string;
  roomId: string;
  displayName: string;
  userId: string | null;
  isHost: boolean;
  seatOrder: number;
  createdAt: Date;
}

export interface MemoryMatchPlayer {
  id: string;
  matchId: string;
  playerId: string;
  role: "CIVILIAN" | "SPY" | "MR_WHITE";
  word: string | null;
  status: "ALIVE" | "ELIMINATED";
  eliminatedRound: number | null;
  ready: boolean;
  pointsAwarded: number;
  isWinner: boolean;
}

export interface MemoryClue {
  id: string;
  matchId: string;
  roundNumber: number;
  describeRound: number;
  playerId: string;
  text: string;
  createdAt: Date;
}

export interface MemoryVote {
  id: string;
  matchId: string;
  roundNumber: number;
  voterPlayerId: string;
  targetPlayerId: string | null;
  createdAt: Date;
}

export interface MemoryMatch {
  id: string;
  roomId: string;
  phase:
    | "DEALING"
    | "DESCRIBING"
    | "VOTING"
    | "ELIMINATION"
    | "MR_WHITE_GUESS"
    | "MATCH_END";
  roundNumber: number;
  describeRound: number;
  currentTurnPlayerId: string | null;
  civilianWord: string | null;
  spyWord: string | null;
  seed: string;
  winnerSide: "CIVILIANS" | "SPIES" | "MR_WHITE" | "NONE" | null;
  pendingMrWhitePlayerId: string | null;
  deadlineAt: Date | null;
  createdAt: Date;
  endedAt: Date | null;
  matchPlayers: MemoryMatchPlayer[];
  clues: MemoryClue[];
  votes: MemoryVote[];
}

export interface MemoryRoom {
  id: string;
  code: string;
  status: "LOBBY" | "IN_PROGRESS" | "COMPLETED";
  hostUserId: string;
  mode: "ONLINE" | "OFFLINE";
  topicSlug: string | null;
  spyCount: number;
  mrWhiteCount: number;
  blindMode: boolean;
  turnTimerSeconds: number | null;
  describeRounds: number;
  maxPlayers: number;
  gameLocale: string;
  createdAt: Date;
  updatedAt: Date;
  expiresAt: Date | null;
  players: MemoryPlayer[];
  matches: MemoryMatch[];
}

const memoryRooms = new Map<string, MemoryRoom>();

export function getMemoryRoom(code: string): MemoryRoom | null {
  return memoryRooms.get(code.toUpperCase()) ?? null;
}

export function saveMemoryRoom(room: MemoryRoom): void {
  memoryRooms.set(room.code.toUpperCase(), room);
}

export function deleteMemoryRoom(code: string): void {
  memoryRooms.delete(code.toUpperCase());
}

/** Fetch room from DB with fallback to memoryRooms */
export async function loadRoomSafe(code: string): Promise<MemoryRoom | null> {
  const cleanCode = code.toUpperCase();

  // If we already have an in-memory copy, try DB first but only wait up to
  // 3 seconds — avoids the host getting stuck on an infinite loading spinner
  // when Postgres is unreachable (the DB write failed and the room exists only
  // in memory).
  const memFallback = memoryRooms.get(cleanCode) ?? null;
  const DB_TIMEOUT_MS = memFallback ? 3000 : 10000;

  try {
    const dbRoom = await Promise.race([
      prisma.room.findUnique({
        where: { code: cleanCode },
        include: {
          players: { orderBy: { seatOrder: "asc" } },
          matches: {
            orderBy: { createdAt: "desc" },
            take: 1,
            include: { matchPlayers: true, clues: true, votes: true },
          },
        },
      }),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), DB_TIMEOUT_MS)),
    ]);
    if (dbRoom) return dbRoom as unknown as MemoryRoom;
  } catch {
    // Database connection or query error — fall through to memoryRooms
  }
  return memFallback;
}

export interface MemoryEmote {
  id: string;
  senderId: string;
  senderName: string;
  emoji: string;
  xPercent: number;
  createdAt: number;
}

const memoryEmotes = new Map<string, MemoryEmote[]>();

export function addMemoryEmote(code: string, emote: MemoryEmote): void {
  const cleanCode = code.toUpperCase();
  const list = memoryEmotes.get(cleanCode) ?? [];
  const now = Date.now();
  const fresh = list.filter((e) => now - e.createdAt < 10000);
  fresh.push(emote);
  memoryEmotes.set(cleanCode, fresh);
}

export function getMemoryEmotes(code: string, since: number = 0): MemoryEmote[] {
  const cleanCode = code.toUpperCase();
  const list = memoryEmotes.get(cleanCode) ?? [];
  return list.filter((e) => e.createdAt > since);
}
