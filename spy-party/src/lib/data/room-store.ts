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
  try {
    const dbRoom = await prisma.room.findUnique({
      where: { code: cleanCode },
      include: {
        players: { orderBy: { seatOrder: "asc" } },
        matches: {
          orderBy: { createdAt: "desc" },
          take: 1,
          include: { matchPlayers: true, clues: true, votes: true },
        },
      },
    });
    if (dbRoom) return dbRoom as unknown as MemoryRoom;
  } catch {
    // Database connection or query error — fall through to memoryRooms
  }
  return memoryRooms.get(cleanCode) ?? null;
}
