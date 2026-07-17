"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Check, X } from "lucide-react";

import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { NumberStepper } from "@/components/number-stepper";
import { PhaseBanner } from "@/components/phase-banner";
import { updateSettings } from "@/lib/actions/rooms";
import type { RoomConfig } from "@/lib/data/rooms";
import type { TopicOption } from "@/lib/data/word-bank";
import { cn } from "@/lib/utils";

export function SettingsForm({
  code,
  topics,
  initial,
}: {
  code: string;
  topics: TopicOption[];
  initial: RoomConfig;
}) {
  const t = useTranslations("online");
  const tc = useTranslations("common");
  const router = useRouter();

  const [spyCount, setSpyCount] = useState(initial.spyCount);
  const [mrWhite, setMrWhite] = useState(initial.mrWhiteCount > 0);
  const [turnTimer, setTurnTimer] = useState<number | null>(initial.turnTimerSeconds);
  const [describeRounds, setDescribeRounds] = useState(initial.describeRounds);
  const [maxPlayers, setMaxPlayers] = useState(initial.maxPlayers);
  const [topicSlug, setTopicSlug] = useState(initial.topicSlug ?? topics[0]?.slug ?? "");
  const [pending, startTransition] = useTransition();

  function save() {
    startTransition(async () => {
      await updateSettings(code, {
        topicSlug,
        spyCount,
        mrWhiteCount: mrWhite ? 1 : 0,
        turnTimerSeconds: turnTimer,
        describeRounds,
        maxPlayers,
      });
      router.push(`/room/${code}`);
    });
  }

  const online = initial.mode === "online";

  return (
    <main className="bg-blueprint relative flex min-h-dvh flex-col">
      <div className="relative mx-auto w-full max-w-lg px-4 py-12 sm:px-6 sm:py-16">
        <PhaseBanner eyebrow={t("settingsTitle")} title={code} />

        <section className="mt-8 flex items-center justify-between gap-4">
          <Label className="text-classified text-[11px] text-muted-foreground">
            {t("maxPlayersLabel")}
          </Label>
          <NumberStepper
            value={maxPlayers}
            min={3}
            max={12}
            onChange={setMaxPlayers}
            decrementLabel={tc("back")}
            incrementLabel={tc("next")}
          />
        </section>

        <section className="mt-8 flex items-center justify-between gap-4">
          <Label className="text-classified text-[11px] text-muted-foreground">
            {tc("spies")}
          </Label>
          <NumberStepper
            value={spyCount}
            min={1}
            max={3}
            onChange={setSpyCount}
            decrementLabel={tc("back")}
            incrementLabel={tc("next")}
          />
        </section>

        <section className="mt-8 flex items-center justify-between gap-4">
          <Label className="text-classified text-[11px] text-muted-foreground">
            {t("mrWhiteLabel")}
          </Label>
          <Switch checked={mrWhite} onCheckedChange={setMrWhite} aria-label={t("mrWhiteLabel")} />
        </section>

        {online && (
          <>
            <section className="mt-8 flex items-center justify-between gap-4">
              <Label className="text-classified text-[11px] text-muted-foreground">
                {t("timerLabel")}
              </Label>
              <div className="flex gap-1.5">
                {([null, 10, 15, 20] as const).map((opt) => (
                  <button
                    key={String(opt)}
                    type="button"
                    aria-pressed={turnTimer === opt}
                    onClick={() => setTurnTimer(opt)}
                    className={cn(
                      "h-9 rounded-lg border px-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      turnTimer === opt
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border hover:bg-muted",
                    )}
                  >
                    {opt === null ? t("timerOff") : `${opt}s`}
                  </button>
                ))}
              </div>
            </section>

            <section className="mt-8 flex items-center justify-between gap-4">
              <Label className="text-classified text-[11px] text-muted-foreground">
                {t("roundsLabel")}
              </Label>
              <div className="flex gap-1.5">
                {([1, 2, 3] as const).map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    aria-pressed={describeRounds === opt}
                    onClick={() => setDescribeRounds(opt)}
                    className={cn(
                      "size-9 rounded-lg border text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      describeRounds === opt
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border hover:bg-muted",
                    )}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </section>
          </>
        )}

        <section className="mt-8">
          <Label className="text-classified text-[11px] text-muted-foreground">
            {tc("topic")}
          </Label>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {topics.map((topic) => {
              const selected = topic.slug === topicSlug;
              return (
                <button
                  key={topic.slug}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => setTopicSlug(topic.slug)}
                  className={cn(
                    "flex min-h-11 items-center gap-2 rounded-lg border bg-card px-3 py-2.5 text-left text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring",
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

        <div className="mt-10 flex gap-2">
          <Button
            variant="outline"
            onClick={() => router.push(`/room/${code}`)}
            className="h-12 flex-1 gap-2"
          >
            <X className="size-4" /> {tc("cancel")}
          </Button>
          <Button onClick={save} disabled={pending} className="h-12 flex-1 gap-2 font-semibold">
            <Check className="size-4" /> {t("save")}
          </Button>
        </div>
      </div>
    </main>
  );
}
