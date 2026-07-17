"use server";

import { auth, currentUser } from "@clerk/nextjs/server";

import { prisma } from "@/lib/prisma";
import {
  clearGuestCookie,
  readGuestPlayerId,
  setGuestCookie,
} from "@/lib/auth/guest-session";
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
  tallyVotes,
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

/** Map DB rows to the engine's GameState for vote resolution. */
function toGameState(room: LoadedRoom, match: LoadedMatch): GameState {
  const byId = new Map(room.players.map((p: LoadedPlayer) => [p.id, p] as const));
  const players: PlayerState[] = match.matchPlayers.map((mp: LoadedMatchPlayer) => {
    const p = byId.get(mp.playerId);
    return {
      id: mp.playerId,
      name: p?.displayName ?? "?",
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

/** End the match or advance to the next round based on the evaluated outcome. */
async function advanceMatch(
  matchId: string,
  roomId: string,
  roundNumber: number,
  outcome: Outcome,
) {
  if (outcome.matchOver) {
    await prisma.$transaction([
      prisma.match.update({
        where: { id: matchId },
        data: {
          phase: "MATCH_END",
          winnerSide: toWinnerSide(outcome.winner),
          endedAt: new Date(),
          pendingMrWhitePlayerId: null,
        },
      }),
      prisma.room.update({ where: { id: roomId }, data: { status: "COMPLETED" } }),
    ]);
  } else {
    await prisma.match.update({
      where: { id: matchId },
      data: {
        phase: "DESCRIBING",
        roundNumber: roundNumber + 1,
        pendingMrWhitePlayerId: null,
      },
    });
  }
}

/** Host creates a room. Requires a signed-in Clerk user. */
export async function createRoom(input: {
  spyCount: number;
  topicSlug: string;
  locale: string;
  hostName?: string;
  mrWhiteCount?: number;
}): Promise<ActionResult> {
  const { userId } = await auth();
  if (!userId) return { error: "unauthorized" };
  const user = await currentUser();
  const hostName = (
    input.hostName?.trim() ||
    user?.firstName ||
    user?.username ||
    "Host"
  ).slice(0, 24);
  const spyCount = Math.max(1, Math.min(3, Math.floor(input.spyCount || 1)));
  const mrWhiteCount = input.mrWhiteCount === 1 ? 1 : 0;
  const locale = input.locale === "en" ? "en" : "vi";

  for (let attempt = 0; attempt < 6; attempt++) {
    const code = generateCode();
    try {
      const room = await prisma.room.create({
        data: {
          code,
          hostUserId: userId,
          spyCount,
          mrWhiteCount,
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
      throw e;
    }
  }
  return { error: "code_generation_failed" };
}

/** Guest joins by code + name (or rejoins via existing cookie). */
export async function joinRoom(code: string, name: string): Promise<ActionResult> {
  const trimmed = name.trim().slice(0, 24);
  if (!trimmed) return { error: "name_required" };

  const room = await prisma.room.findUnique({
    where: { code: code.toUpperCase() },
    include: { players: true },
  });
  if (!room) return { error: "not_found" };

  // Rejoin: a valid cookie for an existing player is idempotent.
  const existingPid = await readGuestPlayerId(room.code, room.id);
  if (existingPid && room.players.some((p) => p.id === existingPid)) {
    return { ok: true, code: room.code };
  }

  if (room.status !== "LOBBY") return { error: "already_started" };
  if (room.players.length >= MAX_PLAYERS) return { error: "room_full" };
  if (room.players.some((p) => p.displayName.toLowerCase() === trimmed.toLowerCase()))
    return { error: "name_taken" };

  const seatOrder =
    room.players.reduce((m, p) => Math.max(m, p.seatOrder), -1) + 1;
  try {
    const player = await prisma.player.create({
      data: { roomId: room.id, displayName: trimmed, seatOrder },
    });
    await setGuestCookie(room.code, player.id, room.id);
    await broadcastRoom(room.id);
    return { ok: true, code: room.code };
  } catch (e) {
    if (isUniqueViolation(e)) return { error: "name_taken" };
    throw e;
  }
}

/** Host deals roles/words and starts the match. */
export async function startMatch(code: string): Promise<ActionResult> {
  const { userId } = await auth();
  const room = await prisma.room.findUnique({
    where: { code: code.toUpperCase() },
    include: { players: { orderBy: { seatOrder: "asc" } } },
  });
  if (!room) return { error: "not_found" };
  if (!userId || room.hostUserId !== userId) return { error: "forbidden" };
  if (room.status !== "LOBBY") return { error: "already_started" };
  if (room.players.length < MIN_PLAYERS) return { error: "need_players" };

  const n = room.players.length;
  const spyCount = Math.min(Math.max(1, room.spyCount), Math.floor((n - 1) / 2));
  let mrWhiteCount = room.mrWhiteCount ?? 0;
  // Impostors must stay a strict minority; drop Mr. White (then extra spies) if
  // there aren't enough players.
  while (mrWhiteCount > 0 && spyCount + mrWhiteCount >= n - (spyCount + mrWhiteCount)) {
    mrWhiteCount--;
  }
  const seed = randomSeed();
  const locale = room.gameLocale === "en" ? "en" : "vi";
  const wordPair = await getOfflinePair(room.topicSlug ?? "drinks", locale, seed);
  const state = deal({
    players: room.players.map((p: { id: string; displayName: string }) => ({
      id: p.id,
      name: p.displayName,
    })),
    config: { spyCount, mrWhiteCount, maxRounds: n },
    wordPair,
    seed,
  });

  await prisma.$transaction([
    prisma.room.update({ where: { id: room.id }, data: { status: "IN_PROGRESS" } }),
    prisma.match.create({
      data: {
        roomId: room.id,
        phase: "DESCRIBING",
        roundNumber: 1,
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
  await broadcastRoom(room.id);
  return { ok: true };
}

/** Submit this round's clue (one per alive player); advances to voting when all in. */
export async function submitClue(code: string, text: string): Promise<ActionResult> {
  const clue = text.trim().slice(0, 40);
  if (!clue) return { error: "empty" };

  const room = await loadRoom(code);
  if (!room) return { error: "not_found" };
  const match = room.matches[0];
  if (!match || match.phase !== "DESCRIBING") return { error: "wrong_phase" };
  const me = await resolveCaller(room);
  if (!me.playerId) return { error: "not_a_player" };
  const mp = match.matchPlayers.find(
    (x: LoadedMatchPlayer) => x.playerId === me.playerId,
  );
  if (!mp || mp.status !== "ALIVE") return { error: "not_alive" };

  try {
    await prisma.clue.create({
      data: {
        matchId: match.id,
        roundNumber: match.roundNumber,
        playerId: me.playerId,
        text: clue,
      },
    });
  } catch (e) {
    if (isUniqueViolation(e)) return { error: "already_submitted" };
    throw e;
  }

  const aliveCount = match.matchPlayers.filter((x: LoadedMatchPlayer) => x.status === "ALIVE").length;
  const clueCount = await prisma.clue.count({
    where: { matchId: match.id, roundNumber: match.roundNumber },
  });
  if (clueCount >= aliveCount) {
    await prisma.match.update({ where: { id: match.id }, data: { phase: "VOTING" } });
  }
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
  const voter = match.matchPlayers.find((x: LoadedMatchPlayer) => x.playerId === me.playerId);
  if (!voter || voter.status !== "ALIVE") return { error: "not_alive" };
  if (targetPlayerId) {
    const t = match.matchPlayers.find((x: LoadedMatchPlayer) => x.playerId === targetPlayerId);
    if (!t || t.status !== "ALIVE") return { error: "bad_target" };
  }

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

  const aliveCount = match.matchPlayers.filter((x: LoadedMatchPlayer) => x.status === "ALIVE").length;
  const votes = await prisma.vote.findMany({
    where: { matchId: match.id, roundNumber: match.roundNumber },
  });
  if (votes.length >= aliveCount) {
    const state = toGameState(room, match);
    const voteMap: Record<string, string | null> = {};
    for (const v of votes) voteMap[v.voterPlayerId] = v.targetPlayerId ?? null;
    const { eliminatedId } = resolveVote(tallyVotes(voteMap, state));

    if (eliminatedId) {
      await prisma.matchPlayer.update({
        where: { matchId_playerId: { matchId: match.id, playerId: eliminatedId } },
        data: { status: "ELIMINATED", eliminatedRound: match.roundNumber },
      });
    }

    const elimMp = eliminatedId
      ? match.matchPlayers.find((x: LoadedMatchPlayer) => x.playerId === eliminatedId)
      : null;

    if (elimMp && elimMp.role === "MR_WHITE") {
      // Mr. White may steal the win by guessing the civilian word.
      await prisma.match.update({
        where: { id: match.id },
        data: { phase: "MR_WHITE_GUESS", pendingMrWhitePlayerId: eliminatedId },
      });
    } else {
      const outcome = evaluateOutcome(applyElimination(state, eliminatedId));
      await advanceMatch(match.id, room.id, match.roundNumber, outcome);
    }
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
  } else {
    // Wrong guess — resolve the round normally (Mr. White is already eliminated).
    const outcome = evaluateOutcome(toGameState(room, match));
    await advanceMatch(match.id, room.id, match.roundNumber, outcome);
  }
  await broadcastRoom(room.id);
  return { ok: true };
}

/** Host resets the room to the lobby for a rematch. */
export async function playAgain(code: string): Promise<ActionResult> {
  const { userId } = await auth();
  const room = await prisma.room.findUnique({ where: { code: code.toUpperCase() } });
  if (!room) return { error: "not_found" };
  if (!userId || room.hostUserId !== userId) return { error: "forbidden" };
  await prisma.room.update({ where: { id: room.id }, data: { status: "LOBBY" } });
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

/** A guest leaves the lobby. */
export async function leaveRoom(code: string): Promise<ActionResult> {
  const room = await loadRoom(code);
  if (!room) return { error: "not_found" };
  const me = await resolveCaller(room);
  if (me.playerId && !me.isHost && room.status === "LOBBY") {
    await prisma.player.delete({ where: { id: me.playerId } });
    await clearGuestCookie(room.code);
    await broadcastRoom(room.id);
  }
  return { ok: true };
}
