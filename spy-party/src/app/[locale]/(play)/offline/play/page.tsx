"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { ArrowRight, Home, RotateCcw, ShieldAlert, Vote } from "lucide-react";

import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { DossierCard } from "@/components/dossier-card";
import { DossierReveal } from "@/components/dossier-reveal";
import { HandoffGate } from "@/components/handoff-gate";
import { PhaseBanner } from "@/components/phase-banner";
import {
  applyElimination,
  applyOutcome,
  deal,
  describeOrder,
  evaluateOutcome,
  type GameState,
  type Outcome,
  type Role,
} from "@/lib/game";
import { OFFLINE_SETUP_KEY, readOfflineSetup, type OfflineSetup } from "../offline-storage";

type UiPhase = "reveal" | "reviewDone" | "describe" | "vote" | "elimination" | "result";

export default function OfflinePlayPage() {
  const t = useTranslations("offline");
  const tc = useTranslations("common");
  const tg = useTranslations("game");
  const router = useRouter();

  const [boot, setBoot] = useState<{ setup: OfflineSetup; game: GameState } | null>(
    null,
  );

  const [ui, setUi] = useState<UiPhase>("reveal");
  const [revealIndex, setRevealIndex] = useState(0);
  const [atGate, setAtGate] = useState(true);
  const [selectedTarget, setSelectedTarget] = useState<string | null>(null);
  const [eliminatedId, setEliminatedId] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<Outcome | null>(null);

  useEffect(() => {
    const s = readOfflineSetup();
    if (!s) {
      router.replace("/offline");
      return;
    }
    // One-time hydration from sessionStorage — browser-only, absent during SSR,
    // so an effect is the correct tool here.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setBoot({
      setup: s,
      game: deal({
        players: s.players,
        config: s.config,
        wordPair: s.wordPair,
        seed: s.seed,
      }),
    });
  }, [router]);

  function roleLabel(role: Role) {
    return role === "spy"
      ? tg("roleSpy")
      : role === "mrWhite"
        ? tg("roleMrWhite")
        : tg("roleCivilian");
  }

  if (!boot) {
    return (
      <main className="flex min-h-dvh items-center justify-center">
        <p className="text-classified text-sm text-muted-foreground">{tc("loading")}</p>
      </main>
    );
  }

  const { setup, game } = boot;
  const players = game.players;

  function handleRevealDone() {
    if (revealIndex + 1 < players.length) {
      setRevealIndex(revealIndex + 1);
      setAtGate(true);
    } else {
      setUi("reviewDone");
    }
  }

  function confirmElimination() {
    const next = applyElimination(game, selectedTarget);
    const oc = evaluateOutcome(next);
    setEliminatedId(selectedTarget);
    setOutcome(oc);
    setBoot((b) => (b ? { ...b, game: applyOutcome(next, oc) } : b));
    setUi("elimination");
  }

  function playAgain() {
    sessionStorage.removeItem(OFFLINE_SETUP_KEY);
    router.push("/offline");
  }

  const eliminated = eliminatedId
    ? players.find((p) => p.id === eliminatedId)
    : null;

  return (
    <main className="bg-blueprint relative flex min-h-dvh flex-col">
      <div className="relative mx-auto flex w-full max-w-lg flex-1 flex-col px-4 py-10 sm:px-6 sm:py-14">
        {/* ── Reveal (handoff + per-player word) ── */}
        {ui === "reveal" &&
          (atGate ? (
            <div className="flex flex-1 items-center justify-center">
              <HandoffGate
                eyebrow={t("passTitle")}
                name={players[revealIndex].name}
                actionLabel={t("tapReady", { name: players[revealIndex].name })}
                onReady={() => setAtGate(false)}
              />
            </div>
          ) : (
            <div className="flex flex-1 flex-col justify-center gap-6">
              <PhaseBanner
                eyebrow={t("dealtEyebrow")}
                title={players[revealIndex].name}
              />
              <DossierReveal
                mode="reveal"
                role={players[revealIndex].role}
                word={players[revealIndex].word}
                topic={setup.topicName}
                onDone={handleRevealDone}
              />
            </div>
          ))}

        {/* ── Everyone revealed ── */}
        {ui === "reviewDone" && (
          <div className="flex flex-1 flex-col justify-center gap-8 text-center">
            <PhaseBanner
              eyebrow={t("dealtEyebrow")}
              title={t("reviewDoneTitle")}
              description={t("reviewDoneDesc")}
            />
            <Button
              onClick={() => setUi("describe")}
              className="mx-auto h-12 w-full max-w-xs gap-2 text-sm font-semibold"
            >
              {t("beginDescribe")} <ArrowRight className="size-4" />
            </Button>
          </div>
        )}

        {/* ── Describe (in person) ── */}
        {ui === "describe" && (
          <div className="flex flex-1 flex-col justify-center gap-6">
            <PhaseBanner
              eyebrow={t("describeEyebrow", { round: game.roundNumber })}
              title={t("describeTitle")}
              description={t("describeDesc")}
            />
            <ol className="flex flex-col gap-2">
              {describeOrder(game).map((p, i) => (
                <li key={p.id}>
                  <DossierCard className="flex items-center gap-3 p-3">
                    <span className="flex size-7 shrink-0 items-center justify-center rounded-md border border-border font-mono text-xs text-muted-foreground">
                      {i + 1}
                    </span>
                    <span className="min-w-0 truncate font-medium">{p.name}</span>
                  </DossierCard>
                </li>
              ))}
            </ol>
            <Button
              onClick={() => setUi("vote")}
              className="h-12 w-full gap-2 text-sm font-semibold"
            >
              <Vote className="size-4" /> {t("toVote")}
            </Button>
          </div>
        )}

        {/* ── Vote (group picks who to eliminate) ── */}
        {ui === "vote" && (
          <div className="flex flex-1 flex-col justify-center gap-6">
            <PhaseBanner
              eyebrow={t("voteEyebrow", { round: game.roundNumber })}
              title={t("voteTitle")}
              description={t("votePrompt")}
            />
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {describeOrder(game).map((p) => {
                const selected = selectedTarget === p.id;
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
                      onClick={() => setSelectedTarget(p.id)}
                      className="flex items-center gap-3 p-4"
                    >
                      <ShieldAlert
                        className={
                          selected ? "size-4 text-destructive" : "size-4 text-muted-foreground"
                        }
                      />
                      <span className="min-w-0 truncate font-medium">{p.name}</span>
                    </button>
                  </DossierCard>
                );
              })}
            </div>
            <div className="flex flex-col gap-2">
              <Button
                onClick={confirmElimination}
                disabled={!selectedTarget}
                variant="destructive"
                className="h-12 w-full gap-2 text-sm font-semibold"
              >
                <Vote className="size-4" />
                {selectedTarget
                  ? t("castVote", {
                      name: players.find((p) => p.id === selectedTarget)?.name ?? "",
                    })
                  : t("voteTitle")}
              </Button>
              <Button
                onClick={() => {
                  setSelectedTarget(null);
                  confirmElimination();
                }}
                variant="ghost"
                className="h-11 w-full text-xs"
              >
                {t("abstain")}
              </Button>
            </div>
          </div>
        )}

        {/* ── Elimination reveal ── */}
        {ui === "elimination" && (
          <div className="flex flex-1 flex-col justify-center gap-8 text-center">
            <PhaseBanner
              eyebrow={t("eliminatedEyebrow")}
              title={
                eliminated
                  ? t("eliminatedName", { name: eliminated.name })
                  : t("noOneEliminated")
              }
            />
            {eliminated ? (
              <div className="flex flex-col items-center gap-4">
                <DossierCard
                  tone={eliminated.role === "civilian" ? "amber" : "crimson"}
                  className="w-full max-w-xs animate-alert-pulse p-6"
                >
                  <p className="font-mono text-xl font-bold">{eliminated.name}</p>
                  <p
                    className={
                      eliminated.role === "civilian"
                        ? "mt-3 text-sm text-primary"
                        : "mt-3 text-sm text-destructive"
                    }
                  >
                    {t("wasRole", { role: roleLabel(eliminated.role) })}
                  </p>
                </DossierCard>
              </div>
            ) : null}
            <Button
              onClick={() => setUi("result")}
              className="mx-auto h-12 w-full max-w-xs gap-2 text-sm font-semibold"
            >
              {t("seeResult")} <ArrowRight className="size-4" />
            </Button>
          </div>
        )}

        {/* ── Verdict ── */}
        {ui === "result" && outcome && (
          <div className="flex flex-1 flex-col justify-center gap-8 text-center">
            <div
              className={
                outcome.winner === "civilians"
                  ? "animate-glow-pulse rounded-2xl border border-primary/40 bg-card p-8"
                  : "animate-alert-pulse rounded-2xl border border-destructive/50 bg-card p-8"
              }
            >
              <span className="text-classified text-[11px] text-muted-foreground">
                {t("resultEyebrow")}
              </span>
              <h1
                className={
                  outcome.winner === "civilians"
                    ? "mt-2 text-3xl font-bold text-primary"
                    : "mt-2 text-3xl font-bold text-destructive"
                }
              >
                {outcome.winner === "civilians" ? t("civiliansWin") : t("spiesWin")}
              </h1>
              <div className="mt-6 grid grid-cols-2 gap-3 text-left">
                <div className="rounded-lg border border-primary/30 bg-primary/5 p-3">
                  <span className="text-classified text-[10px] text-muted-foreground">
                    {t("theCivilianWord")}
                  </span>
                  <p className="mt-1 font-mono text-sm font-bold text-primary">
                    {game.civilianWord}
                  </p>
                </div>
                <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3">
                  <span className="text-classified text-[10px] text-muted-foreground">
                    {t("theSpyWord")}
                  </span>
                  <p className="mt-1 font-mono text-sm font-bold text-destructive">
                    {game.spyWord}
                  </p>
                </div>
              </div>
              <p className="mt-4 text-xs text-muted-foreground">
                {t("spiesWere", {
                  names: players
                    .filter((p) => p.role === "spy")
                    .map((p) => p.name)
                    .join(", "),
                })}
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
              <Button
                onClick={playAgain}
                className="h-12 w-full gap-2 text-sm font-semibold sm:w-auto sm:px-6"
              >
                <RotateCcw className="size-4" /> {tc("playAgain")}
              </Button>
              <Button
                variant="outline"
                onClick={() => router.push("/")}
                className="h-12 w-full gap-2 text-sm font-semibold sm:w-auto sm:px-6"
              >
                <Home className="size-4" /> {tc("home")}
              </Button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
