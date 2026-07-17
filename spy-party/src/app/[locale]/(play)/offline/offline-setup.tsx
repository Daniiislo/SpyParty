"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Radar, Trash2, UserPlus, VenetianMask } from "lucide-react";

import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NumberStepper } from "@/components/number-stepper";
import { PhaseBanner } from "@/components/phase-banner";
import { MIN_PLAYERS, randomSeed } from "@/lib/game";
import { dealOfflinePair } from "@/lib/actions/offline";
import type { BankLocale } from "@/lib/game/word-bank";
import type { TopicOption } from "@/lib/data/word-bank";
import { OFFLINE_SETUP_KEY, type OfflineSetup } from "./offline-storage";
import { cn } from "@/lib/utils";

const MAX_PLAYERS = 12;

/** Max spies that still leaves civilians in the majority. */
function maxSpies(playerCount: number) {
  return Math.max(1, Math.floor((playerCount - 1) / 2));
}

export function OfflineSetupForm({
  topics,
  locale,
}: {
  topics: TopicOption[];
  locale: BankLocale;
}) {
  const t = useTranslations("offline");
  const tc = useTranslations("common");
  const router = useRouter();

  const [names, setNames] = useState<string[]>(["", "", "", ""]);
  const [spyCount, setSpyCount] = useState(1);
  const [topicSlug, setTopicSlug] = useState(topics[0]?.slug ?? "");
  const [isPending, startTransition] = useTransition();

  const playerCount = names.length;
  const spyCap = maxSpies(playerCount);
  const clampedSpies = Math.min(spyCount, spyCap);

  function updateName(i: number, value: string) {
    setNames((prev) => prev.map((n, idx) => (idx === i ? value : n)));
  }
  function addPlayer() {
    if (playerCount < MAX_PLAYERS) setNames((prev) => [...prev, ""]);
  }
  function removePlayer(i: number) {
    if (playerCount > MIN_PLAYERS)
      setNames((prev) => prev.filter((_, idx) => idx !== i));
  }

  function startGame() {
    const topic = topics.find((x) => x.slug === topicSlug) ?? topics[0];
    const seed = randomSeed();
    const players = names.map((name, i) => ({
      id: `p${i}`,
      name: name.trim() || t("agentFallback", { n: i + 1 }),
    }));
    startTransition(async () => {
      const wordPair = await dealOfflinePair(topic.slug, locale, seed);
      const setup: OfflineSetup = {
        players,
        config: { spyCount: clampedSpies, mrWhiteCount: 0, maxRounds: 1 },
        wordPair,
        topicName: topic.name,
        seed,
      };
      sessionStorage.setItem(OFFLINE_SETUP_KEY, JSON.stringify(setup));
      router.push("/offline/play");
    });
  }

  return (
    <main className="bg-blueprint relative flex min-h-dvh flex-col">
      <div className="glow-hero pointer-events-none absolute inset-0" />
      <div className="relative mx-auto w-full max-w-lg px-4 py-12 sm:px-6 sm:py-16">
        <PhaseBanner
          eyebrow={t("setupEyebrow")}
          title={t("setupTitle")}
          description={t("setupDesc")}
        />

        {/* Agents */}
        <section className="mt-10">
          <Label className="text-classified text-[11px] text-muted-foreground">
            {t("playersLabel")} · {playerCount}
          </Label>
          <ul className="mt-3 flex flex-col gap-2">
            {names.map((name, i) => (
              <li key={i} className="flex items-center gap-2">
                <span className="w-6 shrink-0 text-center font-mono text-xs text-muted-foreground">
                  {i + 1}
                </span>
                <Input
                  value={name}
                  onChange={(e) => updateName(i, e.target.value)}
                  placeholder={t("playerPlaceholder")}
                  className="h-11"
                  maxLength={24}
                  aria-label={`${t("playersLabel")} ${i + 1}`}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-11 shrink-0"
                  aria-label={t("removePlayer")}
                  disabled={playerCount <= MIN_PLAYERS}
                  onClick={() => removePlayer(i)}
                >
                  <Trash2 className="size-4" />
                </Button>
              </li>
            ))}
          </ul>
          <Button
            type="button"
            variant="outline"
            className="mt-3 h-11 w-full gap-2"
            disabled={playerCount >= MAX_PLAYERS}
            onClick={addPlayer}
          >
            <UserPlus className="size-4" /> {t("addPlayer")}
          </Button>
        </section>

        {/* Spies */}
        <section className="mt-8 flex items-center justify-between gap-4">
          <div>
            <Label className="text-classified text-[11px] text-muted-foreground">
              {t("spiesLabel")}
            </Label>
            <p className="mt-1 text-xs text-muted-foreground">
              {t("tooManySpies")}
            </p>
          </div>
          <NumberStepper
            value={clampedSpies}
            min={1}
            max={spyCap}
            onChange={setSpyCount}
            decrementLabel={`${tc("back")} ${t("spiesLabel")}`}
            incrementLabel={`${tc("next")} ${t("spiesLabel")}`}
          />
        </section>

        {/* Topic */}
        <section className="mt-8">
          <Label className="text-classified text-[11px] text-muted-foreground">
            {t("topicLabel")}
          </Label>
          <p className="mt-1 text-xs text-muted-foreground">{t("topicHint")}</p>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {topics.map((topic) => {
              const selected = topic.slug === topicSlug;
              return (
                <button
                  key={topic.slug}
                  type="button"
                  onClick={() => setTopicSlug(topic.slug)}
                  aria-pressed={selected}
                  className={cn(
                    "flex min-h-11 items-center gap-2 rounded-lg border bg-card px-3 py-2.5 text-left text-sm transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    selected
                      ? "border-primary ring-2 ring-primary/50"
                      : "border-border hover:bg-muted",
                  )}
                >
                  <span aria-hidden>{topic.emoji}</span>
                  <span className="min-w-0 truncate">{topic.name}</span>
                </button>
              );
            })}
          </div>
        </section>

        <Button
          type="button"
          onClick={startGame}
          disabled={isPending || !topicSlug}
          className="mt-10 h-12 w-full gap-2 text-sm font-semibold"
        >
          <Radar className="size-4" /> {isPending ? tc("loading") : t("startGame")}
        </Button>

        <div className="mt-6 flex items-center justify-center gap-2 text-muted-foreground">
          <VenetianMask className="size-4" />
          <span className="text-classified text-[10px]">SPY PARTY</span>
        </div>
      </div>
    </main>
  );
}
