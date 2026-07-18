"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import {
  ArrowRight,
  Check,
  Copy,
  Crown,
  Eye,
  Home,
  LogOut,
  Radar,
  RotateCcw,
  Send,
  ShieldAlert,
  Trash2,
  Vote,
} from "lucide-react";

import { Link, useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ActionOverlay } from "@/components/action-overlay";
import { DossierCard } from "@/components/dossier-card";
import { DossierReveal } from "@/components/dossier-reveal";
import { PhaseBanner } from "@/components/phase-banner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useRoomChannel } from "@/hooks/use-room-channel";
import {
  ackReady,
  advanceIfExpired,
  castVote,
  disbandRoom,
  fetchRoomView,
  leaveRoom,
  mrWhiteGuess,
  playAgain,
  resolveVotingIfExpired,
  revealRoles,
  startDescribing,
  startMatch,
  submitClue,
} from "@/lib/actions/rooms";
import { TurnTimer } from "@/components/turn-timer";
import { MissionBriefing } from "@/components/room/mission-briefing";
import { RoomConfigPanel } from "@/components/room/room-config-panel";
import type { MyCard, RoomState } from "@/lib/data/rooms";
import type { TopicOption } from "@/lib/data/word-bank";
import { MIN_PLAYERS, VOTE_TIMER_SECONDS, type Role } from "@/lib/game";
import { cn } from "@/lib/utils";

export function RoomClient({
  code,
  roomId,
  initialState,
  initialCard,
  topics,
}: {
  code: string;
  roomId: string;
  initialState: RoomState;
  initialCard: MyCard | null;
  topics: TopicOption[];
}) {
  const t = useTranslations("online");
  const tc = useTranslations("common");
  const tg = useTranslations("game");
  const router = useRouter();

  const [state, setState] = useState<RoomState>(initialState);
  const [card, setCard] = useState<MyCard | null>(initialCard);
  const [clueText, setClueText] = useState("");
  const [selectedVote, setSelectedVote] = useState<string | null>(null);
  const [guess, setGuess] = useState("");
  const [copied, setCopied] = useState(false);
  const [voteOpen, setVoteOpen] = useState(false);
  const [disbandOpen, setDisbandOpen] = useState(false);
  const [resultDismissed, setResultDismissed] = useState(false);
  const [briefingDismissed, setBriefingDismissed] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // Apply a fresh (state, card) snapshot — from a mutation's returned view or a
  // refetch. A null state means the room is gone (disbanded / expired) → leave.
  function applyView(s: RoomState | null, c: MyCard | null) {
    if (!s) {
      router.push("/");
      return;
    }
    // Once the room moves past the final result (e.g. host starts a new game),
    // drop any "dismissed" flag so the next match's result shows again.
    if (s.phase !== "matchEnd") setResultDismissed(false);
    // Re-arm the mission briefing so a fresh match replays its intro.
    if (s.phase === "lobby") setBriefingDismissed(false);
    setState(s);
    setCard(c);
  }

  async function refetch() {
    const view = await fetchRoomView(code);
    applyView(view?.state ?? null, view?.card ?? null);
  }
  useRoomChannel(roomId, () => {
    void refetch();
  });

  // Run a mutation. Hot mutations return the post-mutation `view`, so the acting
  // client updates in a single round-trip; otherwise we fall back to a refetch.
  function act(fn: () => Promise<unknown>) {
    startTransition(async () => {
      const res = await fn();
      if (
        res &&
        typeof res === "object" &&
        "view" in res &&
        (res as { view?: { state: RoomState; card: MyCard | null } }).view
      ) {
        const v = (res as { view: { state: RoomState; card: MyCard | null } }).view;
        applyView(v.state, v.card);
      } else {
        await refetch();
      }
    });
  }

  function roleLabel(role: Role) {
    return role === "spy" ? tg("roleSpy") : role === "mrWhite" ? tg("roleMrWhite") : tg("roleCivilian");
  }

  const meId = state.me.playerId;
  const isHost = state.me.isHost;
  const mePlayer = meId ? state.players.find((p) => p.id === meId) : null;

  // Someone opened the room without joining (no cookie / not the host).
  if (!meId) {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center gap-6 px-4 text-center">
        <PhaseBanner eyebrow="SPY PARTY" title={t("joinTitle")} description={t("joinDesc")} />
        <Button asChild className="h-11 gap-2 px-6">
          <Link href={`/join/${code}`}>{t("joinButton")}</Link>
        </Button>
      </main>
    );
  }

  const alivePlayers = state.players.filter((p) => p.alive !== false);

  return (
    <main className="bg-blueprint relative flex min-h-dvh flex-col">
      <ActionOverlay active={pending} label={tc("loading")} />
      {state.phase === "dealing" && !briefingDismissed && (
        <MissionBriefing onDone={() => setBriefingDismissed(true)} />
      )}
      <div className="relative mx-auto flex w-full max-w-lg flex-1 flex-col px-4 py-10 sm:px-6 sm:py-14">
        {/* ── Lobby ── */}
        {state.phase === "lobby" && (
          <div className="flex flex-1 flex-col gap-6">
            <PhaseBanner eyebrow={t("lobbyTitle")} title="SPY PARTY" />

            <div className="rounded-xl border border-primary/30 bg-card p-5 text-center">
              <span className="text-classified text-[11px] text-muted-foreground">
                {t("shareCode")}
              </span>
              <div className="mt-2 flex items-center justify-center gap-3">
                <span className="font-mono text-4xl font-bold tracking-[0.3em] text-primary">
                  {state.code}
                </span>
                <Button
                  variant="outline"
                  size="icon"
                  className="size-10"
                  aria-label={t("copied")}
                  onClick={() => {
                    void navigator.clipboard?.writeText(state.code);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 1500);
                  }}
                >
                  {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
                </Button>
              </div>
            </div>

            <ul className="flex flex-col gap-2">
              {state.players.map((p) => (
                <li key={p.id}>
                  <DossierCard
                    tone={p.id === meId ? "amber" : "neutral"}
                    className="flex items-center gap-3 p-3"
                  >
                    <span className="min-w-0 flex-1 truncate font-medium">
                      {p.name}
                      {p.id === meId ? ` (${tc("you")})` : ""}
                    </span>
                    {p.isHost && (
                      <span className="inline-flex items-center gap-1 text-xs text-primary">
                        <Crown className="size-3.5" /> {t("host")}
                      </span>
                    )}
                  </DossierCard>
                </li>
              ))}
            </ul>

            <RoomConfigPanel
              code={code}
              mode={state.mode}
              isHost={isHost}
              topics={topics}
              config={{
                topicSlug: state.topicSlug,
                topicName: state.topicName,
                spyCount: state.spyCount,
                mrWhiteCount: state.mrWhiteCount,
                blindMode: state.blindMode,
                turnTimerSeconds: state.turnTimerSeconds,
                describeRounds: state.describeRounds,
                maxPlayers: state.maxPlayers,
              }}
            />

            {isHost ? (
              <div className="mt-auto flex flex-col gap-2">
                <Button
                  onClick={() =>
                    startTransition(async () => {
                      setStartError(null);
                      const r = await startMatch(code);
                      if ("error" in r) {
                        setStartError(
                          r.error === "not_enough_players"
                            ? t("errNotEnoughPlayers")
                            : t("errGeneric"),
                        );
                      } else if (r.view) {
                        applyView(r.view.state, r.view.card);
                      } else {
                        await refetch();
                      }
                    })
                  }
                  disabled={pending || state.players.length < MIN_PLAYERS}
                  className="h-12 w-full gap-2 text-sm font-semibold"
                >
                  <Radar className="size-4" /> {t("startMatch")}
                </Button>
                {state.players.length < MIN_PLAYERS && (
                  <p className="text-center text-xs text-muted-foreground">
                    {t("minPlayers", { min: MIN_PLAYERS })}
                  </p>
                )}
                {startError && (
                  <p className="text-center text-xs text-destructive">{startError}</p>
                )}
                <Dialog open={disbandOpen} onOpenChange={setDisbandOpen}>
                  <DialogTrigger asChild>
                    <Button variant="ghost" className="h-10 gap-2 text-xs text-muted-foreground">
                      <Trash2 className="size-4" /> {t("disband")}
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>{t("disbandConfirmTitle")}</DialogTitle>
                      <DialogDescription>{t("disbandConfirmDesc")}</DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="flex-col gap-2 sm:flex-col">
                      <Button
                        variant="destructive"
                        disabled={pending}
                        className="h-11 w-full gap-2"
                        onClick={() =>
                          startTransition(async () => {
                            setDisbandOpen(false);
                            await disbandRoom(code);
                            router.push("/");
                          })
                        }
                      >
                        <Trash2 className="size-4" /> {t("disbandConfirmAction")}
                      </Button>
                      <Button
                        variant="ghost"
                        className="h-10 w-full text-xs"
                        onClick={() => setDisbandOpen(false)}
                      >
                        {tc("cancel")}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            ) : (
              <div className="mt-auto flex flex-col items-center gap-3">
                <p className="text-classified animate-glow-pulse rounded-full border border-border px-4 py-2 text-[11px] text-muted-foreground">
                  {t("waitingHost")}
                </p>
                <Button
                  variant="ghost"
                  className="h-10 gap-2 text-xs"
                  onClick={() =>
                    act(async () => {
                      await leaveRoom(code);
                      router.push("/");
                    })
                  }
                >
                  <LogOut className="size-4" /> {t("leave")}
                </Button>
              </div>
            )}
          </div>
        )}

        {/* ── Dealing: view your word, then ready-gate (online) / reveal (offline) ── */}
        {state.phase === "dealing" && (
          <div className="relative flex flex-1 flex-col justify-center gap-6">
            <div className="glow-hero pointer-events-none absolute inset-x-0 -top-10 h-56" aria-hidden />
            <PhaseBanner
              eyebrow={t("dealingTitle")}
              title="SPY PARTY"
              description={state.mode === "offline" ? t("offlinePlaying") : undefined}
            />
            {card && (
              // Stays mounted through dealing so the word remains readable after
              // decoding; decoding is what marks the player ready (onDone).
              <DossierReveal
                mode="reveal"
                role={card.role ?? undefined}
                blind={card.blind}
                word={card.word}
                topic={state.topicName ?? undefined}
                onDone={() => act(() => ackReady(code))}
              />
            )}
            <ul className="flex flex-col gap-2">
              {state.players.map((p) => (
                <li key={p.id}>
                  <DossierCard
                    tone={p.id === meId ? "amber" : "neutral"}
                    className="flex items-center gap-3 p-3"
                  >
                    <span className="min-w-0 flex-1 truncate text-sm">
                      {p.name}
                      {p.id === meId ? ` (${tc("you")})` : ""}
                    </span>
                    {p.ready ? (
                      <Check className="size-4 text-primary" />
                    ) : (
                      <span className="text-xs text-muted-foreground">…</span>
                    )}
                  </DossierCard>
                </li>
              ))}
            </ul>
            {state.mode === "offline" ? (
              isHost ? (
                <div className="mt-2 flex flex-col gap-2">
                  <Button
                    onClick={() => act(() => revealRoles(code))}
                    disabled={pending || !state.allReady}
                    className="h-12 w-full gap-2 text-sm font-semibold"
                  >
                    <Eye className="size-4" /> {t("revealRoles")}
                  </Button>
                  {!state.allReady && (
                    <p className="text-classified text-center text-[11px] text-muted-foreground">
                      {t("waitingReady")}
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-classified mt-2 text-center text-[11px] text-muted-foreground">
                  {t("waitingReady")}
                </p>
              )
            ) : (
              mePlayer?.ready &&
              (isHost ? (
                <Button
                  onClick={() => act(() => startDescribing(code))}
                  disabled={pending || !state.allReady}
                  className="mt-2 h-12 w-full gap-2 text-sm font-semibold"
                >
                  <ArrowRight className="size-4" /> {t("startDescribing")}
                </Button>
              ) : (
                <p className="text-classified mt-2 text-center text-[11px] text-muted-foreground">
                  {t("waitingReady")}
                </p>
              ))
            )}
          </div>
        )}

        {/* ── Describe: one clue per turn, in seat order, across N rounds ── */}
        {state.phase === "describing" &&
          (() => {
            const myTurn = state.currentTurnPlayerId === meId;
            const turnName =
              state.players.find((p) => p.id === state.currentTurnPlayerId)?.name ?? "";
            return (
              <div className="flex flex-1 flex-col justify-center gap-5">
                <PhaseBanner
                  eyebrow={`${tc("round")} ${state.roundNumber} · ${state.describeRound}/${state.describeRounds}`}
                  title={myTurn ? t("yourTurnDescribe") : t("waitingTurn", { name: turnName })}
                />
                {state.deadlineAt && (
                  <div className="flex justify-center">
                    <TurnTimer
                      deadlineAt={state.deadlineAt}
                      durationSeconds={state.turnTimerSeconds}
                      onExpire={() => act(() => advanceIfExpired(code))}
                    />
                  </div>
                )}
                <ul className="flex flex-col gap-2">
                  {alivePlayers.map((p) => (
                    <li key={p.id}>
                      <DossierCard
                        tone={state.currentTurnPlayerId === p.id ? "amber" : "neutral"}
                        active={state.currentTurnPlayerId === p.id}
                        className="flex items-center gap-3 p-3"
                      >
                        <span className="shrink-0 truncate text-sm font-medium">
                          {p.name}
                          {p.id === meId ? ` (${tc("you")})` : ""}
                        </span>
                        <span className="flex flex-1 flex-wrap justify-end gap-1">
                          {p.clues.map((c, i) => (
                            <span
                              key={i}
                              className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs"
                            >
                              {c}
                            </span>
                          ))}
                        </span>
                      </DossierCard>
                    </li>
                  ))}
                </ul>
                {myTurn && (
                  <div className="mt-auto flex gap-2">
                    <Input
                      value={clueText}
                      onChange={(e) => setClueText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !pending && clueText.trim()) {
                          act(async () => {
                            const r = await submitClue(code, clueText);
                            setClueText("");
                            return r;
                          });
                        }
                      }}
                      placeholder={t("cluePlaceholder")}
                      maxLength={60}
                      autoFocus
                      className="h-11"
                    />
                    <Button
                      onClick={() =>
                        act(async () => {
                          const r = await submitClue(code, clueText);
                          setClueText("");
                          return r;
                        })
                      }
                      disabled={pending || !clueText.trim()}
                      className="h-11 gap-2"
                    >
                      <Send className="size-4" /> {t("submitClue")}
                    </Button>
                  </div>
                )}
              </div>
            );
          })()}

        {/* ── Vote: clues stay on screen; voting happens in a closable dialog ── */}
        {state.phase === "voting" && (
          <div className="flex flex-1 flex-col justify-center gap-5">
            <PhaseBanner
              eyebrow={`${tc("round")} ${state.roundNumber}`}
              title={t("voteTitle")}
              description={t("votePrompt")}
            />
            {state.deadlineAt && (
              <div className="flex justify-center">
                <TurnTimer
                  deadlineAt={state.deadlineAt}
                  durationSeconds={VOTE_TIMER_SECONDS}
                  onExpire={() => act(() => resolveVotingIfExpired(code))}
                />
              </div>
            )}
            <ul className="flex flex-col gap-2">
              {alivePlayers.map((p) => (
                <li key={p.id}>
                  <DossierCard className="flex items-center gap-3 p-3">
                    <span className="shrink-0 truncate text-sm font-medium">
                      {p.name}
                      {p.id === meId ? ` (${tc("you")})` : ""}
                    </span>
                    <span className="flex flex-1 flex-wrap justify-end gap-1">
                      {p.clues.map((c, i) => (
                        <span
                          key={i}
                          className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs"
                        >
                          {c}
                        </span>
                      ))}
                    </span>
                    {p.hasVoted ? (
                      <span
                        className="inline-flex shrink-0 items-center gap-1 text-xs text-primary"
                        title={t("voted")}
                      >
                        <Check className="size-3.5" />
                        <span className="sr-only">{t("voted")}</span>
                      </span>
                    ) : (
                      <span
                        className="shrink-0 text-xs text-muted-foreground"
                        title={t("notVotedYet")}
                      >
                        …<span className="sr-only">{t("notVotedYet")}</span>
                      </span>
                    )}
                  </DossierCard>
                </li>
              ))}
            </ul>
            {state.votes.length > 0 && (
              <div className="rounded-lg border border-border bg-card/50 p-3">
                <span className="text-classified text-[10px] text-muted-foreground">
                  {t("voteDetailsTitle")}
                </span>
                <ul className="mt-2 flex flex-col gap-1 text-xs">
                  {state.votes.map((v) => {
                    const voter =
                      state.players.find((p) => p.id === v.voterId)?.name ?? "";
                    const target = v.targetId
                      ? (state.players.find((p) => p.id === v.targetId)?.name ?? "")
                      : null;
                    return (
                      <li key={v.voterId} className="flex items-center gap-1.5">
                        <span className="min-w-0 truncate font-medium text-foreground">
                          {voter}
                        </span>
                        <ArrowRight className="size-3 shrink-0 text-muted-foreground" />
                        <span
                          className={cn(
                            "min-w-0 truncate",
                            target
                              ? "text-destructive"
                              : "italic text-muted-foreground",
                          )}
                        >
                          {target ?? t("abstained")}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
            <div className="mt-auto">
              {mePlayer && !mePlayer.hasVoted ? (
                <Dialog open={voteOpen} onOpenChange={setVoteOpen}>
                  <DialogTrigger asChild>
                    <Button
                      variant="destructive"
                      className="h-12 w-full gap-2 text-sm font-semibold"
                    >
                      <Vote className="size-4" /> {t("openVote")}
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>{t("voteTitle")}</DialogTitle>
                      <DialogDescription>{t("votePrompt")}</DialogDescription>
                    </DialogHeader>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      {alivePlayers
                        .filter((p) => p.id !== meId)
                        .map((p) => {
                          const selected = selectedVote === p.id;
                          const count = state.tally?.[p.id] ?? 0;
                          return (
                            <DossierCard
                              key={p.id}
                              asChild
                              interactive
                              tone={selected ? "crimson" : "neutral"}
                              selected={selected}
                            >
                              <button
                                type="button"
                                aria-pressed={selected}
                                onClick={() => setSelectedVote(p.id)}
                                className="flex items-center gap-3 p-4"
                              >
                                <ShieldAlert
                                  className={cn(
                                    "size-4",
                                    selected
                                      ? "text-destructive"
                                      : "text-muted-foreground",
                                  )}
                                />
                                <span className="min-w-0 flex-1 truncate font-medium">
                                  {p.name}
                                </span>
                                {count > 0 && (
                                  <span className="font-mono text-xs text-muted-foreground">
                                    {count}
                                  </span>
                                )}
                              </button>
                            </DossierCard>
                          );
                        })}
                    </div>
                    <DialogFooter className="flex-col gap-2 sm:flex-col">
                      <Button
                        onClick={() => {
                          setVoteOpen(false);
                          act(() => castVote(code, selectedVote));
                        }}
                        disabled={pending || !selectedVote}
                        variant="destructive"
                        className="h-11 w-full gap-2"
                      >
                        <Vote className="size-4" /> {t("castVote")}
                      </Button>
                      <Button
                        onClick={() => {
                          setVoteOpen(false);
                          act(() => castVote(code, null));
                        }}
                        variant="ghost"
                        className="h-10 w-full text-xs"
                      >
                        {t("abstain")}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              ) : (
                <p className="text-classified text-center text-[11px] text-muted-foreground">
                  {t("waitingVotes")}
                </p>
              )}
            </div>
          </div>
        )}

        {/* ── Mr. White steal ── */}
        {state.phase === "mrWhiteGuess" && (
          <div className="flex flex-1 flex-col justify-center gap-6 text-center">
            <PhaseBanner
              eyebrow={`${tc("round")} ${state.roundNumber}`}
              title={t("mrWhiteGuessTitle")}
              description={t("mrWhiteGuessPrompt")}
            />
            {meId === state.pendingMrWhiteId ? (
              <div className="flex gap-2">
                <Input
                  value={guess}
                  onChange={(e) => setGuess(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !pending && guess.trim()) {
                      act(() => mrWhiteGuess(code, guess));
                    }
                  }}
                  placeholder={t("guessPlaceholder")}
                  maxLength={40}
                  className="h-12"
                />
                <Button
                  onClick={() => act(() => mrWhiteGuess(code, guess))}
                  disabled={pending || !guess.trim()}
                  className="h-12 gap-2"
                >
                  <Send className="size-4" /> {t("submitGuess")}
                </Button>
              </div>
            ) : (
              <p className="text-classified text-[11px] text-muted-foreground">
                {t("mrWhiteWaiting")}
              </p>
            )}
          </div>
        )}

        {/* ── Result ── */}
        {(state.phase === "elimination" || state.phase === "matchEnd") &&
          (!isHost && resultDismissed && state.phase === "matchEnd" ? (
            /* Guest chose to stay: a calm waiting-in-room view until the host acts. */
            <div className="flex flex-1 flex-col gap-6">
              <PhaseBanner eyebrow={t("lobbyTitle")} title="SPY PARTY" />
              <ul className="flex flex-col gap-2">
                {state.players.map((p) => (
                  <li key={p.id}>
                    <DossierCard
                      tone={p.id === meId ? "amber" : "neutral"}
                      className="flex items-center gap-3 p-3"
                    >
                      <span className="min-w-0 flex-1 truncate font-medium">
                        {p.name}
                        {p.id === meId ? ` (${tc("you")})` : ""}
                      </span>
                      {p.isHost && (
                        <span className="inline-flex items-center gap-1 text-xs text-primary">
                          <Crown className="size-3.5" /> {t("host")}
                        </span>
                      )}
                    </DossierCard>
                  </li>
                ))}
              </ul>
              <div className="mt-auto flex flex-col items-center gap-3">
                <p className="text-classified animate-glow-pulse rounded-full border border-border px-4 py-2 text-[11px] text-muted-foreground">
                  {t("stayHint")}
                </p>
                <Button
                  variant="ghost"
                  className="h-10 gap-2 text-xs"
                  onClick={() => router.push("/")}
                >
                  <Home className="size-4" /> {t("backHome")}
                </Button>
              </div>
            </div>
          ) : (
          <div className="flex flex-1 flex-col justify-center gap-6 text-center">
            <div
              className={cn(
                "rounded-2xl border bg-card p-8",
                state.winner === "civilians"
                  ? "animate-glow-pulse border-primary/40"
                  : state.winner === "spies"
                    ? "animate-alert-pulse border-destructive/50"
                    : "border-foreground/40",
              )}
            >
              <span className="text-classified text-[11px] text-muted-foreground">
                {tc("round")} {state.roundNumber}
              </span>
              <h1
                className={cn(
                  "mt-2 text-3xl font-bold",
                  state.winner === "civilians"
                    ? "text-primary"
                    : state.winner === "spies"
                      ? "text-destructive"
                      : "text-foreground",
                )}
              >
                {state.winner === "civilians"
                  ? t("civiliansWin")
                  : state.winner === "spies"
                    ? t("spiesWin")
                    : state.winner === "mrWhite"
                      ? t("mrWhiteWins")
                      : t("rolesRevealed")}
              </h1>
              {state.eliminatedPlayerId && (
                <p className="mt-2 text-sm text-muted-foreground">
                  {t("eliminatedName", {
                    name:
                      state.players.find((p) => p.id === state.eliminatedPlayerId)?.name ??
                      "",
                  })}
                </p>
              )}
              <div className="mt-6 grid grid-cols-2 gap-3 text-left">
                <div className="rounded-lg border border-primary/30 bg-primary/5 p-3">
                  <span className="text-classified text-[10px] text-muted-foreground">
                    {t("civilianWord")}
                  </span>
                  <p className="mt-1 font-mono text-sm font-bold text-primary">
                    {state.civilianWord}
                  </p>
                </div>
                <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3">
                  <span className="text-classified text-[10px] text-muted-foreground">
                    {t("spyWord")}
                  </span>
                  <p className="mt-1 font-mono text-sm font-bold text-destructive">
                    {state.spyWord}
                  </p>
                </div>
              </div>
              <ul className="mt-4 flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                {state.players.map((p) => (
                  <li key={p.id}>
                    <span className="font-medium text-foreground">{p.name}</span>
                    {p.revealedRole ? ` · ${roleLabel(p.revealedRole)}` : ""}
                  </li>
                ))}
              </ul>
            </div>
            {!isHost && (
              <p className="text-classified text-center text-[11px] text-muted-foreground">
                {t("stayHint")}
              </p>
            )}
            <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
              {isHost && (
                <Button
                  onClick={() => act(() => playAgain(code))}
                  disabled={pending}
                  className="h-12 w-full gap-2 text-sm font-semibold sm:w-auto sm:px-6"
                >
                  <RotateCcw className="size-4" /> {t("playAgain")}
                </Button>
              )}
              {!isHost && state.phase === "matchEnd" && (
                <Button
                  variant="secondary"
                  onClick={() => setResultDismissed(true)}
                  className="h-12 w-full gap-2 text-sm font-semibold sm:w-auto sm:px-6"
                >
                  <RotateCcw className="size-4" /> {t("returnToRoom")}
                </Button>
              )}
              <Button
                variant="outline"
                onClick={() => router.push("/")}
                className="h-12 w-full gap-2 text-sm font-semibold sm:w-auto sm:px-6"
              >
                <Home className="size-4" /> {t("backHome")}
              </Button>
            </div>
          </div>
          ))}
      </div>
    </main>
  );
}
