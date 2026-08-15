"use server";

import { auth, currentUser } from "@clerk/nextjs/server";

import { prisma } from "@/lib/prisma";
import {
  clearGuestCookie,
  readGuestPlayerId,
  setGuestCookie,
} from "@/lib/auth/guest-session";
import {
  deleteMemoryRoom,
  getMemoryRoom,
  saveMemoryRoom,
  type MemoryRoom,
} from "@/lib/data/room-store";
import { broadcastRoom } from "@/lib/supabase/server";
import {
  generateCode,
  getMyCard,
  getRoomState,
  loadRoom,
  resolveCaller,
  type MyCard,
  type RoomState,
} from "@/lib/data/rooms";
import { getOfflinePair } from "@/lib/data/word-bank";
import {
  applyElimination,
  checkMrWhiteGuess,
  deal,
  evaluateOutcome,
  MIN_PLAYERS,
  randomSeed,
  resolveVote,
  scoreMatch,
  tallyVotes,
  VOTE_TIMER_SECONDS,
  type GameState,
  type Outcome,
  type PlayerState,
  type Role,
  type Side,
} from "@/lib/game";

const MAX_PLAYERS = 12;

type ActionResult = { ok: true; code?: string } | { error: string };

function isUniqueViolation(e: unknown): boolean {
  return (
    typeof e === "object" &&
    e !== null &&
    "code" in e &&
    (e as { code?: string }).code === "P2002"
  );
}

function mapRole(role: "CIVILIAN" | "SPY" | "MR_WHITE"): Role {
  return role === "SPY" ? "spy" : role === "MR_WHITE" ? "mrWhite" : "civilian";
}

function toPrismaRole(role: Role): "CIVILIAN" | "SPY" | "MR_WHITE" {
  return role === "spy" ? "SPY" : role === "mrWhite" ? "MR_WHITE" : "CIVILIAN";
}

function toWinnerSide(
  side: Side,
): "CIVILIANS" | "SPIES" | "MR_WHITE" | "NONE" {
  return side === "civilians"
    ? "CIVILIANS"
    : side === "spies"
      ? "SPIES"
      : side === "mrWhite"
        ? "MR_WHITE"
        : "NONE";
}

type LoadedRoom = NonNullable<Awaited<ReturnType<typeof loadRoom>>>;
type LoadedPlayer = LoadedRoom["players"][number];
type LoadedMatch = LoadedRoom["matches"][number];
type LoadedMatchPlayer = LoadedMatch["matchPlayers"][number];

/** Map DB/Memory rows to the engine's GameState for vote resolution. */
function toGameState(room: LoadedRoom, match: LoadedMatch): GameState {
  const byId = new Map(room.players.map((p: any) => [p.id, p] as const));
  const players: PlayerState[] = match.matchPlayers.map((mp: any) => {
    const p = byId.get(mp.playerId);
    return {
      id: mp.playerId,
      name: p?.displayName ?? p?.name ?? "?",
      seatOrder: p?.seatOrder ?? 0,
      role: mapRole(mp.role),
      word: mp.word,
      status: mp.status === "ALIVE" ? "alive" : "eliminated",
      eliminatedRound: mp.eliminatedRound ?? undefined,
    };
  });
  return {
    phase: "voting",
    roundNumber: match.roundNumber,
    config: { spyCount: room.spyCount, mrWhiteCount: 0, maxRounds: 1 },
    players,
    civilianWord: match.civilianWord ?? "",
    spyWord: match.spyWord ?? "",
    winner: "none",
    seed: match.seed,
  };
}

function aliveSortedIds(room: LoadedRoom, match: LoadedMatch): string[] {
  const alivePids = new Set(
    match.matchPlayers
      .filter((mp: any) => mp.status === "ALIVE")
      .map((mp: any) => mp.playerId),
  );
  return room.players
    .filter((p: any) => alivePids.has(p.id))
    .map((p: any) => p.id);
}

function deadlineFor(seconds: number | null): Date | null {
  if (!seconds || seconds <= 0) return null;
  return new Date(Date.now() + seconds * 1000);
}

async function persistMatchResult(matchId: string, winner: Side): Promise<void> {
  let dbMatch: any = null;
  try {
    dbMatch = await prisma.match.findUnique({
      where: { id: matchId },
      include: {
        room: { include: { players: true } },
        matchPlayers: true,
      },
    });
  } catch {
    return;
  }
  if (!dbMatch) return;

  const room = dbMatch.room;
  const state = toGameState(room as unknown as LoadedRoom, dbMatch as unknown as LoadedMatch);
  const points = scoreMatch(state.players, winner);

  try {
    for (const mp of dbMatch.matchPlayers) {
      const p = room.players.find((pl: any) => pl.id === mp.playerId);
      const earned = points[mp.playerId]?.points ?? 0;
      const isWin = points[mp.playerId]?.isWinner ?? false;

      await prisma.matchPlayer.update({
        where: { id: mp.id },
        data: { pointsAwarded: earned, isWinner: isWin },
      });

      if (p?.userId) {
        await prisma.leaderboardStat.upsert({
          where: { clerkUserId: p.userId },
          create: {
            clerkUserId: p.userId,
            displayName: p.displayName,
            gamesPlayed: 1,
            gamesWon: isWin ? 1 : 0,
            totalPoints: earned,
          },
          update: {
            displayName: p.displayName,
            gamesPlayed: { increment: 1 },
            gamesWon: { increment: isWin ? 1 : 0 },
            totalPoints: { increment: earned },
          },
        });
      }
    }
  } catch {
    // Ignore leaderboard error in fallback mode
  }
}

async function endOrNextRound(
  room: LoadedRoom,
  match: LoadedMatch,
  afterState: GameState,
  outcome: Outcome,
): Promise<void> {
  if (outcome.winner !== "none") {
    try {
      await prisma.$transaction([
        prisma.match.update({
          where: { id: match.id },
          data: {
            phase: "MATCH_END",
            winnerSide: toWinnerSide(outcome.winner),
            endedAt: new Date(),
            deadlineAt: null,
            currentTurnPlayerId: null,
          },
        }),
        prisma.room.update({ where: { id: room.id }, data: { status: "COMPLETED" } }),
      ]);
      await persistMatchResult(match.id, outcome.winner);
    } catch {
      const memRoom = getMemoryRoom(room.code);
      if (memRoom) {
        memRoom.status = "COMPLETED";
        const m = memRoom.matches[0];
        if (m) {
          m.phase = "MATCH_END";
          m.winnerSide = toWinnerSide(outcome.winner);
          m.endedAt = new Date();
          m.deadlineAt = null;
          m.currentTurnPlayerId = null;
        }
      }
    }
    return;
  }

  const alive = aliveSortedIds(room, match);
  try {
    await prisma.match.update({
      where: { id: match.id },
      data: {
        phase: "DESCRIBING",
        roundNumber: { increment: 1 },
        describeRound: 1,
        currentTurnPlayerId: alive[0] ?? null,
        deadlineAt: deadlineFor(room.turnTimerSeconds),
      },
    });
  } catch {
    const memRoom = getMemoryRoom(room.code);
    const m = memRoom?.matches[0];
    if (m) {
      m.phase = "DESCRIBING";
      m.roundNumber += 1;
      m.describeRound = 1;
      m.currentTurnPlayerId = alive[0] ?? null;
      m.deadlineAt = deadlineFor(room.turnTimerSeconds);
    }
  }
}

async function submitClueAndAdvance(
  room: LoadedRoom,
  match: LoadedMatch,
  playerId: string,
  text: string,
): Promise<void> {
  try {
    await prisma.clue.upsert({
      where: {
        matchId_roundNumber_describeRound_playerId: {
          matchId: match.id,
          roundNumber: match.roundNumber,
          describeRound: match.describeRound,
          playerId,
        },
      },
      create: {
        matchId: match.id,
        roundNumber: match.roundNumber,
        describeRound: match.describeRound,
        playerId,
        text,
      },
      update: { text },
    });
  } catch {
    const memRoom = getMemoryRoom(room.code);
    const m = memRoom?.matches[0];
    if (m) {
      m.clues.push({
        id: `c-${Date.now()}`,
        matchId: match.id,
        roundNumber: match.roundNumber,
        describeRound: match.describeRound,
        playerId,
        text,
        createdAt: new Date(),
      });
    }
  }

  const alive = aliveSortedIds(room, match);
  const order = alive;
  const idx = order.indexOf(playerId);
  const nextPlayerId = idx >= 0 && idx + 1 < order.length ? order[idx + 1] : null;

  if (nextPlayerId) {
    try {
      await prisma.match.update({
        where: { id: match.id },
        data: {
          currentTurnPlayerId: nextPlayerId,
          deadlineAt: deadlineFor(room.turnTimerSeconds),
        },
      });
    } catch {
      const memRoom = getMemoryRoom(room.code);
      const m = memRoom?.matches[0];
      if (m) {
        m.currentTurnPlayerId = nextPlayerId;
        m.deadlineAt = deadlineFor(room.turnTimerSeconds);
      }
    }
    return;
  }

  if (match.describeRound < room.describeRounds) {
    try {
      await prisma.match.update({
        where: { id: match.id },
        data: {
          describeRound: { increment: 1 },
          currentTurnPlayerId: order[0] ?? null,
          deadlineAt: deadlineFor(room.turnTimerSeconds),
        },
      });
    } catch {
      const memRoom = getMemoryRoom(room.code);
      const m = memRoom?.matches[0];
      if (m) {
        m.describeRound += 1;
        m.currentTurnPlayerId = order[0] ?? null;
        m.deadlineAt = deadlineFor(room.turnTimerSeconds);
      }
    }
    return;
  }

  try {
    await prisma.match.update({
      where: { id: match.id },
      data: {
        phase: "VOTING",
        deadlineAt: deadlineFor(VOTE_TIMER_SECONDS),
        currentTurnPlayerId: null,
      },
    });
  } catch {
    const memRoom = getMemoryRoom(room.code);
    const m = memRoom?.matches[0];
    if (m) {
      m.phase = "VOTING";
      m.deadlineAt = deadlineFor(VOTE_TIMER_SECONDS);
      m.currentTurnPlayerId = null;
    }
  }
}

async function resolveVotingRound(room: LoadedRoom, match: LoadedMatch): Promise<void> {
  const state = toGameState(room, match);
  let votes: any[] = [];
  try {
    votes = await prisma.vote.findMany({
      where: { matchId: match.id, roundNumber: match.roundNumber },
    });
  } catch {
    const memRoom = getMemoryRoom(room.code);
    const m = memRoom?.matches[0];
    votes = m?.votes.filter((v) => v.roundNumber === match.roundNumber) ?? [];
  }

  const voteMap: Record<string, string | null> = {};
  for (const v of votes) voteMap[v.voterPlayerId] = v.targetPlayerId ?? null;
  const { eliminatedId } = resolveVote(tallyVotes(voteMap, state));

  if (eliminatedId) {
    try {
      await prisma.matchPlayer.update({
        where: { matchId_playerId: { matchId: match.id, playerId: eliminatedId } },
        data: { status: "ELIMINATED", eliminatedRound: match.roundNumber },
      });
    } catch {
      const memRoom = getMemoryRoom(room.code);
      const m = memRoom?.matches[0];
      const mp = m?.matchPlayers.find((p) => p.playerId === eliminatedId);
      if (mp) mp.status = "ELIMINATED";
    }
  }
  const elimRole = eliminatedId
    ? state.players.find((p) => p.id === eliminatedId)?.role
    : null;
  if (elimRole === "mrWhite") {
    try {
      await prisma.match.update({
        where: { id: match.id },
        data: {
          phase: "MR_WHITE_GUESS",
          pendingMrWhitePlayerId: eliminatedId,
          deadlineAt: null,
          currentTurnPlayerId: null,
        },
      });
    } catch {
      const memRoom = getMemoryRoom(room.code);
      const m = memRoom?.matches[0];
      if (m) {
        m.phase = "MR_WHITE_GUESS";
        m.pendingMrWhitePlayerId = eliminatedId;
        m.deadlineAt = null;
        m.currentTurnPlayerId = null;
      }
    }
    return;
  }
  const after = applyElimination(state, eliminatedId);
  await endOrNextRound(room, match, after, evaluateOutcome(after));
}

/** Host creates a room. Requires a signed-in Clerk user. */
export async function createRoom(input: {
  spyCount: number;
  topicSlug: string;
  locale: string;
  hostName?: string;
  mrWhiteCount?: number;
  blindMode?: boolean;
  turnTimerSeconds?: number | null;
  describeRounds?: number;
  mode?: "online" | "offline";
}): Promise<ActionResult> {
  const { userId } = await auth();
  if (!userId) return { error: "unauthorized" };
  let hostName = input.hostName?.trim();
  if (!hostName) {
    try {
      const user = await currentUser();
      hostName = (user?.firstName || user?.username || "Host").slice(0, 24);
    } catch {
      hostName = "Host";
    }
  } else {
    hostName = hostName.slice(0, 24);
  }
  const spyCount = Math.max(1, Math.min(3, Math.floor(input.spyCount || 1)));
  const blindMode = input.blindMode === true;
  const mrWhiteCount = !blindMode && input.mrWhiteCount === 1 ? 1 : 0;
  const turnTimerSeconds =
    input.turnTimerSeconds && input.turnTimerSeconds > 0
      ? Math.min(300, Math.floor(input.turnTimerSeconds))
      : null;
  const describeRounds = Math.max(1, Math.min(5, Math.floor(input.describeRounds || 2)));
  const mode = input.mode === "offline" ? "OFFLINE" : "ONLINE";
  const locale = input.locale === "en" ? "en" : "vi";

  for (let attempt = 0; attempt < 6; attempt++) {
    const code = generateCode();
    try {
      const room = await prisma.room.create({
        data: {
          code,
          hostUserId: userId,
          mode,
          spyCount,
          mrWhiteCount,
          blindMode,
          turnTimerSeconds,
          describeRounds,
          gameLocale: locale,
          topicSlug: input.topicSlug || null,
          players: {
            create: { displayName: hostName, userId, isHost: true, seatOrder: 0 },
          },
        },
      });
      return { ok: true, code: room.code };
    } catch (e) {
      if (isUniqueViolation(e)) continue;
      // DB connection/query error -> Fallback to in-memory room store
      const roomId = `mem-${code}-${Date.now()}`;
      const playerId = `p-${code}-host`;
      const now = new Date();
      const memRoom: MemoryRoom = {
        id: roomId,
        code,
        status: "LOBBY",
        hostUserId: userId,
        mode,
        spyCount,
        mrWhiteCount,
        blindMode,
        turnTimerSeconds,
        describeRounds,
        maxPlayers: 10,
        gameLocale: locale,
        topicSlug: input.topicSlug || null,
        createdAt: now,
        updatedAt: now,
        expiresAt: null,
        players: [
          {
            id: playerId,
            roomId,
            displayName: hostName,
            userId,
            isHost: true,
            seatOrder: 0,
            createdAt: now,
          },
        ],
        matches: [],
      };
      saveMemoryRoom(memRoom);
      return { ok: true, code: memRoom.code };
    }
  }
  return { error: "code_generation_failed" };
}

/** Guest joins by code + name (or rejoins via existing cookie). */
export async function joinRoom(code: string, name: string): Promise<ActionResult> {
  const trimmed = name.trim().slice(0, 24);
  if (!trimmed) return { error: "name_required" };

  const room = await loadRoom(code);
  if (!room) return { error: "not_found" };

  // Rejoin: a valid cookie for an existing player is idempotent.
  const existingPid = await readGuestPlayerId(room.code, room.id);
  if (existingPid && room.players.some((p: any) => p.id === existingPid)) {
    return { ok: true, code: room.code };
  }

  if (room.status !== "LOBBY") return { error: "already_started" };
  if (room.players.length >= MAX_PLAYERS) return { error: "room_full" };
  if (
    room.players.some(
      (p: any) =>
        (p.displayName || p.name || "").toLowerCase() === trimmed.toLowerCase(),
    )
  )
    return { error: "name_taken" };

  const { userId } = await auth();
  const seatOrder =
    room.players.reduce((m: number, p: any) => Math.max(m, p.seatOrder), -1) + 1;
  const newPlayerId = `p-${room.code}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const now = new Date();

  try {
    const player = await prisma.player.create({
      data: { roomId: room.id, displayName: trimmed, seatOrder, userId: userId ?? null },
    });
    await setGuestCookie(room.code, player.id, room.id);
    await broadcastRoom(room.id);
    return { ok: true, code: room.code };
  } catch (e) {
    if (isUniqueViolation(e)) return { error: "name_taken" };
    // Memory store fallback
    const memRoom = getMemoryRoom(room.code);
    if (memRoom) {
      memRoom.players.push({
        id: newPlayerId,
        roomId: room.id,
        displayName: trimmed,
        userId: userId ?? null,
        isHost: false,
        seatOrder,
        createdAt: now,
      });
      saveMemoryRoom(memRoom);
      await setGuestCookie(room.code, newPlayerId, room.id);
      await broadcastRoom(room.id);
      return { ok: true, code: room.code };
    }
    await setGuestCookie(room.code, newPlayerId, room.id);
    return { ok: true, code: room.code };
  }
}

/** Host deals roles/words and starts the match. */
export async function startMatch(code: string): Promise<ActionResult> {
  const { userId } = await auth();
  const room = await loadRoom(code);
  if (!room) return { error: "not_found" };
  if (!userId || room.hostUserId !== userId) return { error: "forbidden" };
  if (room.status !== "LOBBY") return { error: "already_started" };
  if (room.players.length < MIN_PLAYERS) return { error: "need_players" };

  const n = room.players.length;
  const spyCount = Math.max(1, room.spyCount);
  const mrWhiteCount = room.mrWhiteCount ?? 0;
  const impostors = spyCount + mrWhiteCount;
  if (impostors >= n - impostors) {
    return { error: "not_enough_players" };
  }
  const seed = randomSeed();
  const locale = room.gameLocale === "en" ? "en" : "vi";
  const wordPair = await getOfflinePair(room.topicSlug ?? "drinks", locale, seed);
  const state = deal({
    players: room.players.map((p: any) => ({
      id: p.id,
      name: p.displayName || p.name || "",
    })),
    config: { spyCount, mrWhiteCount, maxRounds: n },
    wordPair,
    seed,
  });

  const now = new Date();
  const matchId = `m-${room.code}-${Date.now()}`;

  try {
    await prisma.$transaction([
      prisma.room.update({ where: { id: room.id }, data: { status: "IN_PROGRESS" } }),
      prisma.match.create({
        data: {
          roomId: room.id,
          phase: "DEALING",
          roundNumber: 1,
          describeRound: 1,
          seed,
          civilianWord: wordPair.civilian,
          spyWord: wordPair.spy,
          matchPlayers: {
            create: state.players.map((sp) => ({
              playerId: sp.id,
              role: toPrismaRole(sp.role),
              word: sp.word,
              status: "ALIVE",
            })),
          },
        },
      }),
    ]);
  } catch {
    const memRoom = getMemoryRoom(room.code);
    if (memRoom) {
      memRoom.status = "IN_PROGRESS";
      memRoom.matches = [
        {
          id: matchId,
          roomId: room.id,
          phase: "DEALING",
          roundNumber: 1,
          describeRound: 1,
          currentTurnPlayerId: null,
          civilianWord: wordPair.civilian,
          spyWord: wordPair.spy,
          seed,
          winnerSide: null,
          pendingMrWhitePlayerId: null,
          deadlineAt: null,
          createdAt: now,
          endedAt: null,
          matchPlayers: state.players.map((sp) => ({
            id: `mp-${sp.id}`,
            matchId,
            playerId: sp.id,
            role: toPrismaRole(sp.role),
            word: sp.word,
            status: "ALIVE",
            eliminatedRound: null,
            ready: false,
            pointsAwarded: 0,
            isWinner: false,
          })),
          clues: [],
          votes: [],
        },
      ];
      saveMemoryRoom(memRoom);
    }
  }

  await broadcastRoom(room.id);
  return { ok: true };
}

/** A player acknowledges they've seen their word (gates the start of describing). */
export async function ackReady(code: string): Promise<ActionResult> {
  const room = await loadRoom(code);
  if (!room) return { error: "not_found" };
  const match = room.matches[0];
  if (!match || match.phase !== "DEALING") return { ok: true };
  const me = await resolveCaller(room);
  if (!me.playerId) return { error: "not_a_player" };

  try {
    await prisma.matchPlayer.update({
      where: { matchId_playerId: { matchId: match.id, playerId: me.playerId } },
      data: { ready: true },
    });
  } catch {
    const memRoom = getMemoryRoom(room.code);
    const m = memRoom?.matches[0];
    const mp = m?.matchPlayers.find((p) => p.playerId === me.playerId);
    if (mp) mp.ready = true;
  }

  await broadcastRoom(room.id);
  return { ok: true };
}

/** Host starts the describe phase (turn order + first turn's timer). */
export async function startDescribing(code: string): Promise<ActionResult> {
  const { userId } = await auth();
  const room = await loadRoom(code);
  if (!room) return { error: "not_found" };
  if (!userId || room.hostUserId !== userId) return { error: "forbidden" };
  const match = room.matches[0];
  if (!match || match.phase !== "DEALING") return { error: "wrong_phase" };
  const alive = aliveSortedIds(room, match);

  try {
    await prisma.match.update({
      where: { id: match.id },
      data: {
        phase: "DESCRIBING",
        describeRound: 1,
        currentTurnPlayerId: alive[0] ?? null,
        deadlineAt: deadlineFor(room.turnTimerSeconds),
      },
    });
  } catch {
    const memRoom = getMemoryRoom(room.code);
    const m = memRoom?.matches[0];
    if (m) {
      m.phase = "DESCRIBING";
      m.describeRound = 1;
      m.currentTurnPlayerId = alive[0] ?? null;
      m.deadlineAt = deadlineFor(room.turnTimerSeconds);
    }
  }

  await broadcastRoom(room.id);
  return { ok: true };
}

/** Offline host reveals all roles + words, ending the deal-only match. */
export async function revealRoles(code: string): Promise<ActionResult> {
  const { userId } = await auth();
  const room = await loadRoom(code);
  if (!room) return { error: "not_found" };
  if (!userId || room.hostUserId !== userId) return { error: "forbidden" };
  const match = room.matches[0];
  if (!match) return { error: "wrong_phase" };

  try {
    await prisma.$transaction([
      prisma.match.update({
        where: { id: match.id },
        data: {
          phase: "MATCH_END",
          winnerSide: "NONE",
          endedAt: new Date(),
          deadlineAt: null,
          currentTurnPlayerId: null,
        },
      }),
      prisma.room.update({ where: { id: room.id }, data: { status: "COMPLETED" } }),
    ]);
  } catch {
    const memRoom = getMemoryRoom(room.code);
    if (memRoom) {
      memRoom.status = "COMPLETED";
      const m = memRoom.matches[0];
      if (m) {
        m.phase = "MATCH_END";
        m.winnerSide = "NONE";
        m.endedAt = new Date();
        m.deadlineAt = null;
        m.currentTurnPlayerId = null;
      }
    }
  }

  await broadcastRoom(room.id);
  return { ok: true };
}

/** Submit the clue for the current turn (turn-enforced); advances the turn. */
export async function submitClue(code: string, text: string): Promise<ActionResult> {
  const clue = text.trim().slice(0, 60);
  const room = await loadRoom(code);
  if (!room) return { error: "not_found" };
  const match = room.matches[0];
  if (!match || match.phase !== "DESCRIBING") return { error: "wrong_phase" };
  const me = await resolveCaller(room);
  if (!me.playerId) return { error: "not_a_player" };
  if (match.currentTurnPlayerId !== me.playerId) return { error: "not_your_turn" };
  if (!clue) return { error: "empty" };

  await submitClueAndAdvance(room, match, me.playerId, clue);
  await broadcastRoom(room.id);
  return { ok: true };
}

/** Cast/replace this round's vote; resolves the round when all alive have voted. */
export async function castVote(
  code: string,
  targetPlayerId: string | null,
): Promise<ActionResult> {
  const room = await loadRoom(code);
  if (!room) return { error: "not_found" };
  const match = room.matches[0];
  if (!match || match.phase !== "VOTING") return { error: "wrong_phase" };
  const me = await resolveCaller(room);
  if (!me.playerId) return { error: "not_a_player" };
  const voter = match.matchPlayers.find((x: any) => x.playerId === me.playerId);
  if (!voter || voter.status !== "ALIVE") return { error: "not_alive" };
  if (targetPlayerId) {
    const t = match.matchPlayers.find((x: any) => x.playerId === targetPlayerId);
    if (!t || t.status !== "ALIVE") return { error: "bad_target" };
  }

  try {
    await prisma.vote.upsert({
      where: {
        matchId_roundNumber_voterPlayerId: {
          matchId: match.id,
          roundNumber: match.roundNumber,
          voterPlayerId: me.playerId,
        },
      },
      create: {
        matchId: match.id,
        roundNumber: match.roundNumber,
        voterPlayerId: me.playerId,
        targetPlayerId,
      },
      update: { targetPlayerId },
    });
  } catch {
    const memRoom = getMemoryRoom(room.code);
    const m = memRoom?.matches[0];
    if (m) {
      const v = m.votes.find(
        (x) => x.roundNumber === match.roundNumber && x.voterPlayerId === me.playerId,
      );
      if (v) v.targetPlayerId = targetPlayerId;
      else
        m.votes.push({
          id: `v-${Date.now()}`,
          matchId: match.id,
          roundNumber: match.roundNumber,
          voterPlayerId: me.playerId,
          targetPlayerId,
          createdAt: new Date(),
        });
    }
  }

  const aliveCount = match.matchPlayers.filter((x: any) => x.status === "ALIVE").length;
  let votes: any[] = [];
  try {
    votes = await prisma.vote.findMany({
      where: { matchId: match.id, roundNumber: match.roundNumber },
    });
  } catch {
    const memRoom = getMemoryRoom(room.code);
    votes = memRoom?.matches[0]?.votes.filter((x) => x.roundNumber === match.roundNumber) ?? [];
  }

  if (votes.length >= aliveCount) {
    await resolveVotingRound(room, match);
  }
  await broadcastRoom(room.id);
  return { ok: true };
}

/** The eliminated Mr. White guesses the civilian word to steal the win. */
export async function mrWhiteGuess(code: string, guess: string): Promise<ActionResult> {
  const room = await loadRoom(code);
  if (!room) return { error: "not_found" };
  const match = room.matches[0];
  if (!match || match.phase !== "MR_WHITE_GUESS") return { error: "wrong_phase" };
  const me = await resolveCaller(room);
  if (!me.playerId || me.playerId !== match.pendingMrWhitePlayerId) {
    return { error: "forbidden" };
  }

  if (checkMrWhiteGuess(guess, match.civilianWord ?? "")) {
    try {
      await prisma.$transaction([
        prisma.match.update({
          where: { id: match.id },
          data: {
            phase: "MATCH_END",
            winnerSide: "MR_WHITE",
            endedAt: new Date(),
            pendingMrWhitePlayerId: null,
          },
        }),
        prisma.room.update({ where: { id: room.id }, data: { status: "COMPLETED" } }),
      ]);
    } catch {
      const memRoom = getMemoryRoom(room.code);
      if (memRoom) {
        memRoom.status = "COMPLETED";
        const m = memRoom.matches[0];
        if (m) {
          m.phase = "MATCH_END";
          m.winnerSide = "MR_WHITE";
          m.endedAt = new Date();
          m.pendingMrWhitePlayerId = null;
        }
      }
    }
    await persistMatchResult(match.id, "mrWhite");
  } else {
    const state = toGameState(room, match);
    await endOrNextRound(room, match, state, evaluateOutcome(state));
  }
  await broadcastRoom(room.id);
  return { ok: true };
}

/** Client watchdog: advance a timed phase whose server-side deadline has passed. */
export async function advanceIfExpired(code: string): Promise<ActionResult> {
  const room = await loadRoom(code);
  if (!room) return { error: "not_found" };
  const match = room.matches[0];
  if (!match || !match.deadlineAt) return { ok: true };
  if (Date.now() < new Date(match.deadlineAt).getTime()) return { ok: true };

  if (match.phase === "DESCRIBING" && match.currentTurnPlayerId) {
    await submitClueAndAdvance(room, match, match.currentTurnPlayerId, "—");
    await broadcastRoom(room.id);
  }
  return { ok: true };
}

/** Client watchdog for the voting phase: resolve when time expires. */
export async function resolveVotingIfExpired(code: string): Promise<ActionResult> {
  const room = await loadRoom(code);
  if (!room) return { error: "not_found" };
  const match = room.matches[0];
  if (!match || match.phase !== "VOTING" || !match.deadlineAt) return { ok: true };
  if (Date.now() < new Date(match.deadlineAt).getTime()) return { ok: true };
  await resolveVotingRound(room, match);
  await broadcastRoom(room.id);
  return { ok: true };
}

/** Host edits room settings while in the lobby. */
export async function updateSettings(
  code: string,
  input: {
    topicSlug?: string;
    spyCount?: number;
    mrWhiteCount?: number;
    blindMode?: boolean;
    turnTimerSeconds?: number | null;
    describeRounds?: number;
    maxPlayers?: number;
  },
): Promise<ActionResult> {
  const { userId } = await auth();
  const room = await loadRoom(code);
  if (!room) return { error: "not_found" };
  if (!userId || room.hostUserId !== userId) return { error: "forbidden" };
  if (room.status !== "LOBBY") return { error: "already_started" };

  const blindMode = input.blindMode ?? room.blindMode;
  const requestedMrWhite =
    input.mrWhiteCount === 1 ? 1 : input.mrWhiteCount === 0 ? 0 : room.mrWhiteCount;
  const mrWhiteCount = blindMode ? 0 : requestedMrWhite;
  const spyCount = Math.max(1, Math.min(3, Math.floor(input.spyCount ?? room.spyCount)));
  const describeRounds = Math.max(
    1,
    Math.min(5, Math.floor(input.describeRounds ?? room.describeRounds)),
  );
  const maxPlayers = Math.max(3, Math.min(12, Math.floor(input.maxPlayers ?? room.maxPlayers)));
  const turnTimerSeconds =
    input.turnTimerSeconds === undefined
      ? room.turnTimerSeconds
      : input.turnTimerSeconds && input.turnTimerSeconds > 0
        ? Math.min(300, Math.floor(input.turnTimerSeconds))
        : null;

  try {
    await prisma.room.update({
      where: { id: room.id },
      data: {
        topicSlug: input.topicSlug ?? room.topicSlug,
        spyCount,
        mrWhiteCount,
        blindMode,
        turnTimerSeconds,
        describeRounds,
        maxPlayers,
      },
    });
  } catch {
    const memRoom = getMemoryRoom(room.code);
    if (memRoom) {
      if (input.topicSlug !== undefined) memRoom.topicSlug = input.topicSlug;
      memRoom.spyCount = spyCount;
      memRoom.mrWhiteCount = mrWhiteCount;
      memRoom.blindMode = blindMode;
      memRoom.turnTimerSeconds = turnTimerSeconds;
      memRoom.describeRounds = describeRounds;
      memRoom.maxPlayers = maxPlayers;
    }
  }

  await broadcastRoom(room.id);
  return { ok: true };
}

/** Host resets the room to the lobby for a rematch. */
export async function playAgain(code: string): Promise<ActionResult> {
  const { userId } = await auth();
  const room = await loadRoom(code);
  if (!room) return { error: "not_found" };
  if (!userId || room.hostUserId !== userId) return { error: "forbidden" };

  try {
    await prisma.room.update({ where: { id: room.id }, data: { status: "LOBBY" } });
  } catch {
    const memRoom = getMemoryRoom(room.code);
    if (memRoom) memRoom.status = "LOBBY";
  }

  await broadcastRoom(room.id);
  return { ok: true };
}

/** Client-callable read: the room's secret-free public state. */
export async function fetchRoomState(code: string): Promise<RoomState | null> {
  return getRoomState(code);
}

/** Client-callable read: the caller's own dealt card (never other players'). */
export async function fetchMyCard(code: string): Promise<MyCard | null> {
  return getMyCard(code);
}

/** The host disbands (permanently deletes) the room. Cascades to players/matches. */
export async function disbandRoom(code: string): Promise<ActionResult> {
  const { userId } = await auth();
  const room = await loadRoom(code);
  if (!room) return { ok: true };
  if (!userId || room.hostUserId !== userId) return { error: "forbidden" };
  const roomId = room.id;

  try {
    await prisma.room.delete({ where: { id: roomId } });
  } catch {
    deleteMemoryRoom(room.code);
  }

  await broadcastRoom(roomId);
  return { ok: true };
}

/** A guest leaves the lobby. */
export async function leaveRoom(code: string): Promise<ActionResult> {
  const room = await loadRoom(code);
  if (!room) return { error: "not_found" };
  const me = await resolveCaller(room);
  if (me.playerId && !me.isHost && room.status === "LOBBY") {
    try {
      await prisma.player.delete({ where: { id: me.playerId } });
    } catch {
      const memRoom = getMemoryRoom(room.code);
      if (memRoom) {
        memRoom.players = memRoom.players.filter((p) => p.id !== me.playerId);
      }
    }
    await clearGuestCookie(room.code);
    await broadcastRoom(room.id);
  }
  return { ok: true };
}

/** Broadcast an emote to all clients in the room via Supabase Realtime fallback. */
export async function sendRoomEmote(
  code: string,
  payload: {
    id: string;
    senderId: string;
    senderName: string;
    emoji: string;
    xPercent: number;
    createdAt: number;
  },
): Promise<ActionResult> {
  const room = await loadRoom(code);
  if (!room) return { error: "not_found" };
  await broadcastRoom(room.id, "emote", payload);
  return { ok: true };
}
