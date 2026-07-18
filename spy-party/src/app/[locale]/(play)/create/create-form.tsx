"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { EyeOff, Radar } from "lucide-react";

import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ActionOverlay } from "@/components/action-overlay";
import { NumberStepper } from "@/components/number-stepper";
import { PhaseBanner } from "@/components/phase-banner";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { createRoom } from "@/lib/actions/rooms";
import type { TopicOption } from "@/lib/data/word-bank";
import type { BankLocale } from "@/lib/game/word-bank";
import { cn } from "@/lib/utils";

export function CreateRoomForm({
  topics,
  locale,
}: {
  topics: TopicOption[];
  locale: BankLocale;
}) {
  const t = useTranslations("online");
  const tc = useTranslations("common");
  const router = useRouter();

  const [mode, setMode] = useState<"online" | "offline">("online");
  const [hostName, setHostName] = useState("");
  const [spyCount, setSpyCount] = useState(1);
  const [mrWhite, setMrWhite] = useState(false);
  // Roles are hidden by default (blind mode). Revealing them is the opt-in.
  const [revealRole, setRevealRole] = useState(false);
  const [conflictOpen, setConflictOpen] = useState(false);
  const [turnTimer, setTurnTimer] = useState<number | null>(null);
  const [describeRounds, setDescribeRounds] = useState(2);
  const [topicSlug, setTopicSlug] = useState(topics[0]?.slug ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // Blind mode (roles hidden) and Mr. White are mutually exclusive — Mr. White
  // needs roles revealed. Turning reveal off disables Mr. White and explains why.
  function toggleReveal(on: boolean) {
    setRevealRole(on);
    if (!on && mrWhite) {
      setMrWhite(false);
      setConflictOpen(true);
    }
  }

  function submit() {
    startTransition(async () => {
      setError(null);
      const res = await createRoom({
        mode,
        spyCount,
        topicSlug,
        locale,
        hostName,
        mrWhiteCount: mrWhite && revealRole ? 1 : 0,
        blindMode: !revealRole,
        turnTimerSeconds: turnTimer,
        describeRounds,
      });
      if ("ok" in res && res.code) router.push(`/room/${res.code}`);
      else setError(t("errGeneric"));
    });
  }

  return (
    <main className="bg-blueprint relative flex min-h-dvh flex-col">
      <ActionOverlay active={pending} label={tc("loading")} />
      <Dialog open={conflictOpen} onOpenChange={setConflictOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <EyeOff className="size-4" /> {t("blindMrWhiteTitle")}
            </DialogTitle>
            <DialogDescription>{t("blindMrWhiteDesc")}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => setConflictOpen(false)} className="h-11 w-full">
              {t("gotIt")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <div className="glow-hero pointer-events-none absolute inset-0" />
      <div className="relative mx-auto w-full max-w-lg px-4 py-12 sm:px-6 sm:py-16">
        <PhaseBanner
          eyebrow={t("createTitle")}
          title="SPY PARTY"
          description={t("createDesc")}
        />

        <section className="mt-8">
          <Label className="text-classified text-[11px] text-muted-foreground">
            {t("modeLabel")}
          </Label>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {(["online", "offline"] as const).map((m) => {
              const active = mode === m;
              return (
                <button
                  key={m}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setMode(m)}
                  className={cn(
                    "rounded-lg border p-3 text-left outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring",
                    active
                      ? "border-primary ring-2 ring-primary/50"
                      : "border-border hover:bg-muted",
                  )}
                >
                  <span className="block text-sm font-semibold">
                    {t(m === "online" ? "modeOnline" : "modeOffline")}
                  </span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">
                    {t(m === "online" ? "modeOnlineDesc" : "modeOfflineDesc")}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        <section className="mt-8">
          <Label className="text-classified text-[11px] text-muted-foreground">
            {t("hostNameLabel")}
          </Label>
          <Input
            value={hostName}
            onChange={(e) => setHostName(e.target.value)}
            placeholder={t("hostNameLabel")}
            maxLength={24}
            className="mt-2 h-11"
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
            decrementLabel={`${tc("back")} ${tc("spies")}`}
            incrementLabel={`${tc("next")} ${tc("spies")}`}
          />
        </section>

        <section className="mt-8 flex items-center justify-between gap-4">
          <Label
            className={cn(
              "text-classified text-[11px] text-muted-foreground",
              !revealRole && "opacity-50",
            )}
          >
            {t("mrWhiteLabel")}
          </Label>
          <Switch
            checked={mrWhite && revealRole}
            onCheckedChange={setMrWhite}
            disabled={!revealRole}
            aria-label={t("mrWhiteLabel")}
          />
        </section>

        <section className="mt-8 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <Label className="text-classified text-[11px] text-muted-foreground">
              {t("revealRoleLabel")}
            </Label>
            <p className="mt-1 text-xs text-muted-foreground">{t("revealRoleDesc")}</p>
          </div>
          <Switch
            checked={revealRole}
            onCheckedChange={toggleReveal}
            aria-label={t("revealRoleLabel")}
          />
        </section>

        {mode === "online" && (
          <>
            <section className="mt-8 flex items-center justify-between gap-4">
              <Label className="text-classified text-[11px] text-muted-foreground">
                {t("timerLabel")}
              </Label>
              <div className="flex gap-1.5">
                {([null, 10, 15, 20] as const).map((opt) => {
                  const active = turnTimer === opt;
                  return (
                    <button
                      key={String(opt)}
                      type="button"
                      aria-pressed={active}
                      onClick={() => setTurnTimer(opt)}
                      className={cn(
                        "h-9 rounded-lg border px-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring",
                        active
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border hover:bg-muted",
                      )}
                    >
                      {opt === null ? t("timerOff") : `${opt}s`}
                    </button>
                  );
                })}
              </div>
            </section>

            <section className="mt-8 flex items-center justify-between gap-4">
              <Label className="text-classified text-[11px] text-muted-foreground">
                {t("roundsLabel")}
              </Label>
              <div className="flex gap-1.5">
                {([1, 2, 3] as const).map((opt) => {
                  const active = describeRounds === opt;
                  return (
                    <button
                      key={opt}
                      type="button"
                      aria-pressed={active}
                      onClick={() => setDescribeRounds(opt)}
                      className={cn(
                        "size-9 rounded-lg border text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring",
                        active
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border hover:bg-muted",
                      )}
                    >
                      {opt}
                    </button>
                  );
                })}
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

        {error && (
          <p className="mt-4 text-center text-sm text-destructive">{error}</p>
        )}

        <Button
          type="button"
          onClick={submit}
          disabled={pending || !topicSlug}
          className="mt-10 h-12 w-full gap-2 text-sm font-semibold"
        >
          <Radar className="size-4" /> {pending ? tc("loading") : t("createButton")}
        </Button>
      </div>
    </main>
  );
}
