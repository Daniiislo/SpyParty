"use client";

import { useEffect, useRef, useState } from "react";
import { Timer } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Countdown for a server-authoritative deadline (epoch ms). Display-only — the
 * server enforces the deadline. Fires `onExpire` once when it reaches 0 (the
 * client watchdog that pokes the server to advance the phase).
 *
 * When `durationSeconds` is given, the countdown starts from the full configured
 * duration at mount rather than from `deadlineAt - now`. Otherwise the ~1–2s of
 * broadcast+refetch latency between the server writing the deadline and this
 * component mounting would make a "10s" turn visibly start at 8s. The countdown
 * is keyed on `deadlineAt`, so each new turn re-seeds to the full value; the
 * server remains the sole authority for rejecting late submissions.
 */
export function TurnTimer({
  deadlineAt,
  durationSeconds,
  onExpire,
  className,
}: {
  deadlineAt: number;
  durationSeconds?: number | null;
  onExpire: () => void;
  className?: string;
}) {
  // Seed with the full configured duration when known (pure), else fall back to
  // the honest time-to-deadline. The client-local target is (re)computed in the
  // effect below, where reading the clock is allowed.
  const [remaining, setRemaining] = useState(() =>
    durationSeconds != null
      ? durationSeconds
      : Math.max(0, Math.ceil((deadlineAt - Date.now()) / 1000)),
  );
  const cb = useRef(onExpire);
  useEffect(() => {
    cb.current = onExpire;
  }, [onExpire]);

  useEffect(() => {
    const endsAt =
      durationSeconds != null ? Date.now() + durationSeconds * 1000 : deadlineAt;
    let fired = false;
    const id = setInterval(() => {
      const r = Math.max(0, Math.ceil((endsAt - Date.now()) / 1000));
      setRemaining(r);
      if (r <= 0 && !fired) {
        fired = true;
        clearInterval(id);
        cb.current();
      }
    }, 500);
    return () => clearInterval(id);
  }, [deadlineAt, durationSeconds]);

  const low = remaining <= 5;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 font-mono text-xs tabular-nums",
        low
          ? "animate-alert-pulse border-destructive/50 text-destructive"
          : "border-border text-muted-foreground",
        className,
      )}
    >
      <Timer className="size-3.5" /> {remaining}s
    </span>
  );
}
