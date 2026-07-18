"use server";

import { auth, currentUser } from "@clerk/nextjs/server";

import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";
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
  getRoomView,
  loadRoom,
  resolveCaller,
  type MyCard,
  type RoomState,
  type RoomView,
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

type ActionResult =
  | { ok: true; code?: string; view?: RoomView }
  | { error: string };

/**
 * Success result carrying the fresh post-mutation view, so the acting client
 * updates in a single round-trip instead of firing a second `refetch()`. Other
 * clients still reconcile via the broadcast poke. Falls back to a plain `ok`
 * when the room vanished (deleted) — the client then refetches and leaves.
 */
async function okWithView(code: string): Promise<ActionResult> {
  const view = await getRoomView(code);
  return { ok: true, view: view ?? undefined };
}

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

/**
 * Score a finished match: write per-player points + upsert the lifetime
 * leaderboard for signed-in players (guests, having no Clerk id, don't accrue).
 */
async function persistMatchResult(matchId: string, winner: Side) {
  const match = await prisma.match.findUnique({
    where: { id: matchId },
    include: { matchPlayers: { include: { player: true } } },
  });
  if (!match) return;
  type MP = (typeof match.matchPlayers)[number];
  const players: PlayerState[] = match.matchPlayers.map((mp: MP) => ({
    id: mp.playerId,
    name: mp.player.displayName,
    seatOrder: mp.player.seatOrder,
    role: mapRole(mp.role),
    word: mp.word,
    status: mp.status === "ALIVE" ? "alive" : "eliminated",
  }));
  const scores = scoreMatch(players, winner);
  // One batched transaction instead of up to 2N serial round-trips, so the
  // match-end reveal isn't gated on a long sequential write loop.
  const ops: Prisma.PrismaPromise<unknown>[] = [];
  for (const mp of match.matchPlayers) {
    const sc = scores[mp.playerId] ?? { points: 0, isWinner: false };
    ops.push(
      prisma.matchPlayer.update({
        where: { id: mp.id },
        data: { pointsAwarded: sc.points, isWinner: sc.isWinner },
      }),
    );
    const uid = mp.player.userId;
    if (uid) {
      ops.push(
        prisma.leaderboardStat.upsert({
          where: { clerkUserId: uid },
          create: {
            clerkUserId: uid,
            displayName: mp.player.displayName,
            gamesPlayed: 1,
            gamesWon: sc.isWinner ? 1 : 0,
            totalPoints: sc.points,
          },
          update: {
            displayName: mp.player.displayName,
            gamesPlayed: { increment: 1 },
            gamesWon: { increment: sc.isWinner ? 1 : 0 },
            totalPoints: { increment: sc.points },
          },
        }),
      );
    }
  }
  if (ops.length) await prisma.$transaction(ops);
}

/** A server-authoritative phase deadline, or null when the room is untimed. */
function deadlineFor(seconds: number | null | undefined): Date | null {
  return seconds && seconds > 0 ? new Date(Date.now() + seconds * 1000) : null;
}

/** Alive playerIds in seat order (from a loaded room + match). */
function aliveSortedIds(room: LoadedRoom, match: LoadedMatch): string[] {
  const alive = new Set(
    match.matchPlayers
      .filter((mp: LoadedMatchPlayer) => mp.status === "ALIVE")
      .map((mp: LoadedMatchPlayer) => mp.playerId),
  );
  return room.players
    .filter((p: LoadedPlayer) => alive.has(p.id))
    .map((p: LoadedPlayer) => p.id);
}

/**
 * End the match (persist scores) or begin the next elimination round's describe
 * phase. Alive players come from the engine `state` (post-elimination), so the
 * new turn order excludes anyone just voted out.
 */
async function endOrNextRound(
  room: LoadedRoom,
  match: LoadedMatch,
  state: GameState,
  outcome: Outcome,
) {
  if (outcome.matchOver) {
    await prisma.$transaction([
      prisma.match.update({
        where: { id: match.id },
        data: {
          phase: "MATCH_END",
          winnerSide: toWinnerSide(outcome.winner),
          endedAt: new Date(),
          pendingMrWhitePlayerId: null,
          deadlineAt: null,
          currentTurnPlayerId: null,
        },
      }),
      prisma.room.update({ where: { id: room.id }, data: { status: "COMPLETED" } }),
    ]);
    await persistMatchResult(match.id, outcome.winner);
  } else {
    const aliveIds = state.players
      .filter((p) => p.status === "alive")
      .sort((a, b) => a.seatOrder - b.seatOrder)
      .map((p) => p.id);
    await prisma.match.update({
      where: { id: match.id },
      data: {
        phase: "DESCRIBING",
        roundNumber: match.roundNumber + 1,
        describeRound: 1,
        currentTurnPlayerId: aliveIds[0] ?? null,
        deadlineAt: deadlineFor(room.turnTimerSeconds),
        pendingMrWhitePlayerId: null,
      },
    });
  }
}

/** Advance the describe turn: next alive player, next describe round, or voting. */
async function submitClueAndAdvance(
  room: LoadedRoom,
  match: LoadedMatch,
  playerId: string,
  text: string,
) {
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

  const alive = aliveSortedIds(room, match);
  const idx = alive.indexOf(playerId);
  const next = idx >= 0 && idx + 1 < alive.length ? alive[idx + 1] : null;
  if (next) {
    await prisma.match.update({
      where: { id: match.id },
      data: { currentTurnPlayerId: next, deadlineAt: deadlineFor(room.turnTimerSeconds) },
    });
  } else if (match.describeRound < room.describeRounds) {
    await prisma.match.update({
      where: { id: match.id },
      data: {
        describeRound: match.describeRound + 1,
        currentTurnPlayerId: alive[0] ?? null,
        deadlineAt: deadlineFor(room.turnTimerSeconds),
      },
    });
  } else {
    await prisma.match.update({
      where: { id: match.id },
      data: {
        phase: "VOTING",
        currentTurnPlayerId: null,
        // Voting always gets a fixed window, independent of the describe timer.
        deadlineAt: deadlineFor(VOTE_TIMER_SECONDS),
      },
    });
  }
}

/** Tally the round's votes, eliminate, and route to Mr. White / next round / end. */
async function resolveVotingRound(
  room: LoadedRoom,
  match: LoadedMatch,
  preloadedVotes?: { voterPlayerId: string; targetPlayerId: string | null }[],
) {
  const state = toGameState(room, match);
  // Reuse the caller's vote scan when it already fetched them (castVote), else load.
  const votes =
    preloadedVotes ??
    (await prisma.vote.findMany({
      where: { matchId: match.id, roundNumber: match.roundNumber },
    }));
  const voteMap: Record<string, string | null> = {};
  for (const v of votes) voteMap[v.voterPlayerId] = v.targetPlayerId ?? null;
  const { eliminatedId } = resolveVote(tallyVotes(voteMap, state));

  if (eliminatedId) {
    await prisma.matchPlayer.update({
      where: { matchId_playerId: { matchId: match.id, playerId: eliminatedId } },
      data: { status: "ELIMINATED", eliminatedRound: match.roundNumber },
    });
  }
  const elimRole = eliminatedId
    ? state.players.find((p) => p.id === eliminatedId)?.role
    : null;
  if (elimRole === "mrWhite") {
    await prisma.match.update({
      where: { id: match.id },
      data: {
        phase: "MR_WHITE_GUESS",
        pendingMrWhitePlayerId: eliminatedId,
        deadlineAt: null,
        currentTurnPlayerId: null,
      },
    });
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
  const user = await currentUser();
  const hostName = (
    input.hostName?.trim() ||
    user?.firstName ||
    user?.username ||
    "Host"
  ).slice(0, 24);
  const spyCount = Math.max(1, Math.min(3, Math.floor(input.spyCount || 1)));
  const blindMode = input.blindMode === true;
  // Mr. White is incompatible with blind mode (having no word would give it
  // away), so blind mode always wins and disables it.
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
  const spyCount = Math.max(1, room.spyCount);
  const mrWhiteCount = room.mrWhiteCount ?? 0;
  // Impostors (spies + Mr. White) must stay a strict minority. Block instead of
  // silently dropping roles, so the host knows to add players.
  const impostors = spyCount + mrWhiteCount;
  if (impostors >= n - impostors) {
    return { error: "not_enough_players" };
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
        // Everyone views their word first (DEALING); the host starts describing
        // once all are ready.
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
  await broadcastRoom(room.id);
  return okWithView(code);
}

/** A player acknowledges they've seen their word (gates the start of describing). */
export async function ackReady(code: string): Promise<ActionResult> {
  const room = await loadRoom(code);
  if (!room) return { error: "not_found" };
  const match = room.matches[0];
  if (!match || match.phase !== "DEALING") return { ok: true };
  const me = await resolveCaller(room);
  if (!me.playerId) return { error: "not_a_player" };
  await prisma.matchPlayer.update({
    where: { matchId_playerId: { matchId: match.id, playerId: me.playerId } },
    data: { ready: true },
  });
  await broadcastRoom(room.id);
  return okWithView(code);
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
  await prisma.match.update({
    where: { id: match.id },
    data: {
      phase: "DESCRIBING",
      describeRound: 1,
      currentTurnPlayerId: alive[0] ?? null,
      deadlineAt: deadlineFor(room.turnTimerSeconds),
    },
  });
  await broadcastRoom(room.id);
  return okWithView(code);
}

/** Offline host reveals all roles + words, ending the deal-only match. */
export async function revealRoles(code: string): Promise<ActionResult> {
  const { userId } = await auth();
  const room = await loadRoom(code);
  if (!room) return { error: "not_found" };
  if (!userId || room.hostUserId !== userId) return { error: "forbidden" };
  const match = room.matches[0];
  if (!match) return { error: "wrong_phase" };
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
  await broadcastRoom(room.id);
  return okWithView(code);
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
  return okWithView(code);
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
    await resolveVotingRound(room, match, votes);
  }
  await broadcastRoom(room.id);
  return okWithView(code);
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
    await persistMatchResult(match.id, "mrWhite");
  } else {
    // Wrong guess — resolve the round normally (Mr. White is already eliminated).
    const state = toGameState(room, match);
    await endOrNextRound(room, match, state, evaluateOutcome(state));
  }
  await broadcastRoom(room.id);
  return okWithView(code);
}

/** Client watchdog: advance a timed phase whose server-side deadline has passed. */
export async function advanceIfExpired(code: string): Promise<ActionResult> {
  const room = await loadRoom(code);
  if (!room) return { error: "not_found" };
  const match = room.matches[0];
  if (!match || !match.deadlineAt) return { ok: true };
  if (Date.now() < new Date(match.deadlineAt).getTime()) return { ok: true };

  // Turn timed out: record a "no clue" placeholder for the current player and
  // advance the turn. Only the describe phase is timed.
  if (match.phase === "DESCRIBING" && match.currentTurnPlayerId) {
    await submitClueAndAdvance(room, match, match.currentTurnPlayerId, "—");
    await broadcastRoom(room.id);
    return okWithView(code);
  }
  return { ok: true };
}

/**
 * Client watchdog for the voting phase: once the fixed vote window has elapsed,
 * resolve the round with whatever ballots are in (missing voters = abstain).
 * Idempotent — the phase check makes concurrent calls harmless.
 */
export async function resolveVotingIfExpired(code: string): Promise<ActionResult> {
  const room = await loadRoom(code);
  if (!room) return { error: "not_found" };
  const match = room.matches[0];
  if (!match || match.phase !== "VOTING" || !match.deadlineAt) return { ok: true };
  if (Date.now() < new Date(match.deadlineAt).getTime()) return { ok: true };
  await resolveVotingRound(room, match);
  await broadcastRoom(room.id);
  return okWithView(code);
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
  const room = await prisma.room.findUnique({ where: { code: code.toUpperCase() } });
  if (!room) return { error: "not_found" };
  if (!userId || room.hostUserId !== userId) return { error: "forbidden" };
  if (room.status !== "LOBBY") return { error: "already_started" };

  const blindMode = input.blindMode ?? room.blindMode;
  // Blind mode and Mr. White are mutually exclusive; blind mode wins.
  const requestedMrWhite =
    input.mrWhiteCount === 1 ? 1 : input.mrWhiteCount === 0 ? 0 : room.mrWhiteCount;
  const mrWhiteCount = blindMode ? 0 : requestedMrWhite;

  await prisma.room.update({
    where: { id: room.id },
    data: {
      topicSlug: input.topicSlug ?? room.topicSlug,
      spyCount: Math.max(1, Math.min(3, Math.floor(input.spyCount ?? room.spyCount))),
      mrWhiteCount,
      blindMode,
      turnTimerSeconds:
        input.turnTimerSeconds === undefined
          ? room.turnTimerSeconds
          : input.turnTimerSeconds && input.turnTimerSeconds > 0
            ? Math.min(300, Math.floor(input.turnTimerSeconds))
            : null,
      describeRounds: Math.max(
        1,
        Math.min(5, Math.floor(input.describeRounds ?? room.describeRounds)),
      ),
      maxPlayers: Math.max(3, Math.min(12, Math.floor(input.maxPlayers ?? room.maxPlayers))),
    },
  });
  await broadcastRoom(room.id);
  return okWithView(code);
}

/** Host resets the room to the lobby for a rematch. */
export async function playAgain(code: string): Promise<ActionResult> {
  const { userId } = await auth();
  const room = await prisma.room.findUnique({ where: { code: code.toUpperCase() } });
  if (!room) return { error: "not_found" };
  if (!userId || room.hostUserId !== userId) return { error: "forbidden" };
  await prisma.room.update({ where: { id: room.id }, data: { status: "LOBBY" } });
  await broadcastRoom(room.id);
  return okWithView(code);
}

/** Client-callable read: the room's secret-free public state. */
export async function fetchRoomState(code: string): Promise<RoomState | null> {
  return getRoomState(code);
}

/** Client-callable read: the caller's own dealt card (never other players'). */
export async function fetchMyCard(code: string): Promise<MyCard | null> {
  return getMyCard(code);
}

/** Client-callable read: public state + the caller's card, sharing one room load. */
export async function fetchRoomView(code: string): Promise<RoomView | null> {
  return getRoomView(code);
}

/** The host disbands (permanently deletes) the room. Cascades to players/matches. */
export async function disbandRoom(code: string): Promise<ActionResult> {
  const { userId } = await auth();
  const room = await prisma.room.findUnique({ where: { code: code.toUpperCase() } });
  if (!room) return { ok: true };
  if (!userId || room.hostUserId !== userId) return { error: "forbidden" };
  const roomId = room.id;
  await prisma.room.delete({ where: { id: roomId } });
  // Fire after the row is gone so subscribers refetch → null → leave the room.
  await broadcastRoom(roomId);
  return { ok: true };
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
