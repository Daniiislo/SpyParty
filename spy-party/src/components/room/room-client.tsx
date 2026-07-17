"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import {
  Check,
  Copy,
  Crown,
  Home,
  LogOut,
  Radar,
  RotateCcw,
  Send,
  ShieldAlert,
  Vote,
} from "lucide-react";

import { Link, useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DossierCard } from "@/components/dossier-card";
import { DossierReveal } from "@/components/dossier-reveal";
import { PhaseBanner } from "@/components/phase-banner";
import { useRoomChannel } from "@/hooks/use-room-channel";
import {
  advanceIfExpired,
  castVote,
  fetchMyCard,
  fetchRoomState,
  leaveRoom,
  mrWhiteGuess,
  playAgain,
  startMatch,
  submitClue,
} from "@/lib/actions/rooms";
import { TurnTimer } from "@/components/turn-timer";
import type { MyCard, RoomState } from "@/lib/data/rooms";
import { MIN_PLAYERS, type Role } from "@/lib/game";
import { cn } from "@/lib/utils";

export function RoomClient({
  code,
  roomId,
  initialState,
  initialCard,
}: {
  code: string;
  roomId: string;
  initialState: RoomState;
  initialCard: MyCard | null;
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
  const [startError, setStartError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  async function refetch() {
    const [s, c] = await Promise.all([fetchRoomState(code), fetchMyCard(code)]);
    if (s) setState(s);
    setCard(c);
  }
  useRoomChannel(roomId, () => {
    void refetch();
  });

  function act(fn: () => Promise<unknown>) {
    startTransition(async () => {
      await fn();
      await refetch();
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

        {/* ── Describe (reveal own word + submit clue) ── */}
        {(state.phase === "dealing" || state.phase === "describing") && (
          <div className="flex flex-1 flex-col gap-6">
            <PhaseBanner
              eyebrow={`${tc("round")} ${state.roundNumber}`}
              title={t("describeTitle")}
              description={t("describeDesc")}
            />
            {state.deadlineAt && (
              <div className="flex justify-center">
                <TurnTimer
                  deadlineAt={state.deadlineAt}
                  onExpire={() => act(() => advanceIfExpired(code))}
                />
              </div>
            )}
            {card && (
              <DossierReveal
                mode="reveal"
                role={card.role}
                word={card.word}
                topic={state.topicName ?? undefined}
              />
            )}

            <ul className="flex flex-col gap-2">
              {alivePlayers.map((p) => (
                <li key={p.id}>
                  <DossierCard
                    tone={state.currentTurnPlayerId === p.id ? "amber" : "neutral"}
                    className="flex items-center gap-3 p-3"
                  >
                    <span className="min-w-0 flex-1 truncate text-sm">
                      {p.name}
                      {p.id === meId ? ` (${tc("you")})` : ""}
                    </span>
                    <span className="font-mono text-xs text-muted-foreground">
                      {p.clue ? p.clue : "…"}
                    </span>
                  </DossierCard>
                </li>
              ))}
            </ul>

            {mePlayer && mePlayer.alive !== false && !mePlayer.clue ? (
              <div className="mt-auto flex gap-2">
                <Input
                  value={clueText}
                  onChange={(e) => setClueText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !pending && clueText.trim()) {
                      act(async () => {
                        await submitClue(code, clueText);
                        setClueText("");
                      });
                    }
                  }}
                  placeholder={t("cluePlaceholder")}
                  maxLength={40}
                  className="h-11"
                />
                <Button
                  onClick={() =>
                    act(async () => {
                      await submitClue(code, clueText);
                      setClueText("");
                    })
                  }
                  disabled={pending || !clueText.trim()}
                  className="h-11 gap-2"
                >
                  <Send className="size-4" /> {t("submitClue")}
                </Button>
              </div>
            ) : (
              <p className="text-classified mt-auto text-center text-[11px] text-muted-foreground">
                {t("waitingClues")}
              </p>
            )}
          </div>
        )}

        {/* ── Vote ── */}
        {state.phase === "voting" && (
          <div className="flex flex-1 flex-col gap-6">
            <PhaseBanner
              eyebrow={`${tc("round")} ${state.roundNumber}`}
              title={t("voteTitle")}
              description={t("votePrompt")}
            />
            {state.deadlineAt && (
              <div className="flex justify-center">
                <TurnTimer
                  deadlineAt={state.deadlineAt}
                  onExpire={() => act(() => advanceIfExpired(code))}
                />
              </div>
            )}
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
                            selected ? "text-destructive" : "text-muted-foreground",
                          )}
                        />
                        <span className="min-w-0 flex-1 truncate font-medium">{p.name}</span>
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
            {mePlayer && !mePlayer.hasVoted ? (
              <div className="mt-auto flex flex-col gap-2">
                <Button
                  onClick={() => act(() => castVote(code, selectedVote))}
                  disabled={pending || !selectedVote}
                  variant="destructive"
                  className="h-12 w-full gap-2 text-sm font-semibold"
                >
                  <Vote className="size-4" /> {t("castVote")}
                </Button>
                <Button
                  onClick={() => act(() => castVote(code, null))}
                  variant="ghost"
                  className="h-10 w-full text-xs"
                >
                  {t("abstain")}
                </Button>
              </div>
            ) : (
              <p className="text-classified mt-auto text-center text-[11px] text-muted-foreground">
                {t("waitingVotes")}
              </p>
            )}
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
        {(state.phase === "elimination" || state.phase === "matchEnd") && (
          <div className="flex flex-1 flex-col justify-center gap-6 text-center">
            <div
              className={cn(
                "rounded-2xl border bg-card p-8",
                state.winner === "civilians"
                  ? "animate-glow-pulse border-primary/40"
                  : state.winner === "mrWhite"
                    ? "border-foreground/40"
                    : "animate-alert-pulse border-destructive/50",
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
                    : state.winner === "mrWhite"
                      ? "text-foreground"
                      : "text-destructive",
                )}
              >
                {state.winner === "civilians"
                  ? t("civiliansWin")
                  : state.winner === "mrWhite"
                    ? t("mrWhiteWins")
                    : t("spiesWin")}
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
              <Button
                variant="outline"
                onClick={() => router.push("/")}
                className="h-12 w-full gap-2 text-sm font-semibold sm:w-auto sm:px-6"
              >
                <Home className="size-4" /> {t("backHome")}
              </Button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
