"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Check, EyeOff, Minus, Pencil } from "lucide-react";

import { Button } from "@/components/ui/button";
import { NumberStepper } from "@/components/number-stepper";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { updateSettings } from "@/lib/actions/rooms";
import type { TopicOption } from "@/lib/data/word-bank";
import { cn } from "@/lib/utils";

export interface RoomConfigValues {
  topicSlug: string | null;
  topicName: string | null;
  spyCount: number;
  mrWhiteCount: number;
  blindMode: boolean;
  turnTimerSeconds: number | null;
  describeRounds: number;
  maxPlayers: number;
}

function Row({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-2.5">
      <span className="text-classified text-[11px] text-muted-foreground">{label}</span>
      <div className="flex items-center gap-1.5">{children}</div>
    </div>
  );
}

/** A read-only on/off marker for guests. */
function BoolMark({ on }: { on: boolean }) {
  return on ? (
    <Check className="size-4 text-primary" />
  ) : (
    <Minus className="size-4 text-muted-foreground" />
  );
}

/**
 * The room configuration, always visible to everyone in the lobby. The host
 * edits it inline (each change persists immediately and broadcasts, so guests
 * see updates live); guests see a read-only summary. Replaces the old dedicated
 * settings page.
 */
export function RoomConfigPanel({
  code,
  mode,
  isHost,
  config,
  topics,
}: {
  code: string;
  mode: "online" | "offline";
  isHost: boolean;
  config: RoomConfigValues;
  topics: TopicOption[];
}) {
  const t = useTranslations("online");
  const tc = useTranslations("common");
  const [, startTransition] = useTransition();

  // Host-editable local state (seeded once). Guests render `config` live.
  const [spyCount, setSpyCount] = useState(config.spyCount);
  const [mrWhite, setMrWhite] = useState(config.mrWhiteCount > 0);
  // Roles hidden by default (blind); revealing them is the opt-in toggle.
  const [revealRole, setRevealRole] = useState(!config.blindMode);
  const [turnTimer, setTurnTimer] = useState<number | null>(config.turnTimerSeconds);
  const [describeRounds, setDescribeRounds] = useState(config.describeRounds);
  const [maxPlayers, setMaxPlayers] = useState(config.maxPlayers);
  const [topicSlug, setTopicSlug] = useState(config.topicSlug ?? topics[0]?.slug ?? "");
  const [topicOpen, setTopicOpen] = useState(false);
  const [conflictOpen, setConflictOpen] = useState(false);

  const online = mode === "online";

  function save(next: Parameters<typeof updateSettings>[1]) {
    startTransition(async () => {
      await updateSettings(code, {
        topicSlug,
        spyCount,
        mrWhiteCount: mrWhite && revealRole ? 1 : 0,
        blindMode: !revealRole,
        turnTimerSeconds: turnTimer,
        describeRounds,
        maxPlayers,
        ...next,
      });
    });
  }

  const topicName = isHost
    ? (topics.find((x) => x.slug === topicSlug)?.name ?? config.topicName ?? "—")
    : (config.topicName ?? "—");

  // ── Read-only view (guests) ──
  if (!isHost) {
    return (
      <div className="rounded-xl border border-border bg-card/60 p-4">
        <span className="text-classified text-[11px] text-primary">{t("roomConfig")}</span>
        <div className="mt-1 divide-y divide-border/60">
          <Row label={tc("topic")}>
            <span className="text-sm font-medium">{topicName}</span>
          </Row>
          <Row label={tc("spies")}>
            <span className="font-mono text-sm">{config.spyCount}</span>
          </Row>
          <Row label={t("mrWhiteLabel")}>
            <BoolMark on={config.mrWhiteCount > 0} />
          </Row>
          <Row label={t("revealRoleLabel")}>
            <BoolMark on={!config.blindMode} />
          </Row>
          {online && (
            <>
              <Row label={t("timerLabel")}>
                <span className="font-mono text-sm">
                  {config.turnTimerSeconds ? `${config.turnTimerSeconds}s` : t("timerOff")}
                </span>
              </Row>
              <Row label={t("roundsLabel")}>
                <span className="font-mono text-sm">{config.describeRounds}</span>
              </Row>
            </>
          )}
          <Row label={t("maxPlayersLabel")}>
            <span className="font-mono text-sm">{config.maxPlayers}</span>
          </Row>
        </div>
      </div>
    );
  }

  // ── Host editor (inline, saves on change) ──
  return (
    <div className="rounded-xl border border-primary/30 bg-card/60 p-4">
      <span className="text-classified text-[11px] text-primary">{t("roomConfig")}</span>
      <div className="mt-1 divide-y divide-border/60">
        <Row label={tc("topic")}>
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1.5"
            onClick={() => setTopicOpen(true)}
          >
            <span className="max-w-[9rem] truncate">{topicName}</span>
            <Pencil className="size-3.5" />
          </Button>
        </Row>
        <Row label={tc("spies")}>
          <NumberStepper
            value={spyCount}
            min={1}
            max={3}
            onChange={(v) => {
              setSpyCount(v);
              save({ spyCount: v });
            }}
            decrementLabel={tc("back")}
            incrementLabel={tc("next")}
          />
        </Row>
        <Row label={t("mrWhiteLabel")}>
          <Switch
            checked={mrWhite && revealRole}
            disabled={!revealRole}
            onCheckedChange={(v) => {
              setMrWhite(v);
              save({ mrWhiteCount: v && revealRole ? 1 : 0 });
            }}
            aria-label={t("mrWhiteLabel")}
          />
        </Row>
        <Row label={t("revealRoleLabel")}>
          <Switch
            checked={revealRole}
            onCheckedChange={(v) => {
              setRevealRole(v);
              if (!v && mrWhite) {
                setMrWhite(false);
                setConflictOpen(true);
              }
              save({ blindMode: !v, mrWhiteCount: v && mrWhite ? 1 : 0 });
            }}
            aria-label={t("revealRoleLabel")}
          />
        </Row>
        {online && (
          <>
            <Row label={t("timerLabel")}>
              {([null, 10, 15, 20] as const).map((opt) => (
                <button
                  key={String(opt)}
                  type="button"
                  aria-pressed={turnTimer === opt}
                  onClick={() => {
                    setTurnTimer(opt);
                    save({ turnTimerSeconds: opt });
                  }}
                  className={cn(
                    "h-8 rounded-md border px-2 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    turnTimer === opt
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border hover:bg-muted",
                  )}
                >
                  {opt === null ? t("timerOff") : `${opt}s`}
                </button>
              ))}
            </Row>
            <Row label={t("roundsLabel")}>
              {([1, 2, 3] as const).map((opt) => (
                <button
                  key={opt}
                  type="button"
                  aria-pressed={describeRounds === opt}
                  onClick={() => {
                    setDescribeRounds(opt);
                    save({ describeRounds: opt });
                  }}
                  className={cn(
                    "size-8 rounded-md border text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    describeRounds === opt
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border hover:bg-muted",
                  )}
                >
                  {opt}
                </button>
              ))}
            </Row>
          </>
        )}
        <Row label={t("maxPlayersLabel")}>
          <NumberStepper
            value={maxPlayers}
            min={3}
            max={12}
            onChange={(v) => {
              setMaxPlayers(v);
              save({ maxPlayers: v });
            }}
            decrementLabel={tc("back")}
            incrementLabel={tc("next")}
          />
        </Row>
      </div>

      {/* Topic picker dialog (host) */}
      <Dialog open={topicOpen} onOpenChange={setTopicOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{tc("topic")}</DialogTitle>
          </DialogHeader>
          <div className="grid max-h-[60dvh] grid-cols-2 gap-2 overflow-y-auto sm:grid-cols-3">
            {topics.map((topic) => {
              const selected = topic.slug === topicSlug;
              return (
                <button
                  key={topic.slug}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => {
                    setTopicSlug(topic.slug);
                    setTopicOpen(false);
                    save({ topicSlug: topic.slug });
                  }}
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
        </DialogContent>
      </Dialog>

      {/* Blind ↔ Mr. White exclusion popup */}
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
    </div>
  );
}
