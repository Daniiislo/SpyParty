"use client";

import { useEffect, useRef, useState } from "react";
import { Timer } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Countdown to a server-authoritative deadline (epoch ms). Display-only — the
 * server enforces the deadline. Fires `onExpire` once when it reaches 0 (the
 * client watchdog that pokes the server to advance the phase).
 */
export function TurnTimer({
  deadlineAt,
  onExpire,
  className,
}: {
  deadlineAt: number;
  onExpire: () => void;
  className?: string;
}) {
  const [remaining, setRemaining] = useState(() =>
    Math.max(0, Math.ceil((deadlineAt - Date.now()) / 1000)),
  );
  const cb = useRef(onExpire);
  useEffect(() => {
    cb.current = onExpire;
  }, [onExpire]);

  useEffect(() => {
    let fired = false;
    const id = setInterval(() => {
      const r = Math.max(0, Math.ceil((deadlineAt - Date.now()) / 1000));
      setRemaining(r);
      if (r <= 0 && !fired) {
        fired = true;
        clearInterval(id);
        cb.current();
      }
    }, 500);
    return () => clearInterval(id);
  }, [deadlineAt]);

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
