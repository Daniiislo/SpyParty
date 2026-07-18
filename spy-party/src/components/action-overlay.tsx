"use client";

import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";

/**
 * A thin, full-screen overlay shown while a delayed server action is in flight
 * (button presses with a round-trip). Deliberately lighter than the route-level
 * `LoadingScreen`: just a subtle dim + a small amber spinner. Renders nothing
 * when inactive. Motion is disabled under `prefers-reduced-motion`.
 *
 * A short show-delay keeps fast actions (now a single round-trip) from flashing
 * the spinner at all — it only appears if the action is genuinely slow, and it
 * disappears the instant the action resolves. This avoids the "background is
 * already there but 'Đang tải…' lingers" feel.
 */
export function ActionOverlay({
  active,
  label,
  className,
  delayMs = 180,
}: {
  active: boolean;
  label?: string;
  className?: string;
  delayMs?: number;
}) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!active) return;
    const id = setTimeout(() => setShow(true), delayMs);
    // Clearing + resetting on cleanup also covers active flipping back to false.
    return () => {
      clearTimeout(id);
      setShow(false);
    };
  }, [active, delayMs]);

  if (!show) return null;
  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className={cn(
        "fixed inset-0 z-50 flex flex-col items-center justify-center gap-3 bg-background/45 backdrop-blur-[1.5px]",
        className,
      )}
    >
      <span
        aria-hidden
        className="size-9 animate-spin rounded-full border-2 border-primary/25 border-t-primary motion-reduce:animate-none"
      />
      {label ? (
        <span className="text-classified text-[10px] text-muted-foreground">
          {label}
        </span>
      ) : (
        <span className="sr-only">loading</span>
      )}
    </div>
  );
}
