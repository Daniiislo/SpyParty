"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Radar } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * A short, cinematic "mission briefing" overlay that plays when a match starts
 * (entering the dealing phase), to make kickoff feel distinct from the calm
 * lobby. Auto-dismisses after a beat; tap to skip. Motion is toned down under
 * `prefers-reduced-motion` (the fade still happens, just no sweep/scanline).
 */
export function MissionBriefing({ onDone }: { onDone: () => void }) {
  const t = useTranslations("online");
  const [leaving, setLeaving] = useState(false);
  const cb = useRef(onDone);
  useEffect(() => {
    cb.current = onDone;
  }, [onDone]);

  useEffect(() => {
    // Short cinematic beat, then a quick fade so play starts promptly.
    const t1 = setTimeout(() => setLeaving(true), 700);
    const t2 = setTimeout(() => cb.current(), 1200);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  return (
    <button
      type="button"
      onClick={() => cb.current()}
      aria-label={t("briefingHint")}
      className={cn(
        // Its own layer above header/overlay/dialog (z-50). While fading out it
        // must stop capturing pointer events — an opacity-0 element still
        // swallows taps meant for the game UI beneath it.
        "bg-blueprint fixed inset-0 z-[60] flex flex-col items-center justify-center gap-6 overflow-hidden px-6 text-center transition-opacity duration-500",
        leaving ? "pointer-events-none opacity-0" : "opacity-100",
      )}
    >
      <div className="glow-hero pointer-events-none absolute inset-0" aria-hidden />
      <div
        className="animate-scanline pointer-events-none absolute left-0 h-px w-full"
        aria-hidden
        style={{
          background:
            "linear-gradient(to right, transparent, color-mix(in oklch, var(--primary) 55%, transparent), transparent)",
        }}
      />

      <span className="animate-glow-pulse inline-flex items-center gap-2 rounded-full border border-primary/40 px-4 py-1.5 text-primary">
        <Radar className="size-4" />
        <span className="text-classified text-[11px]">{t("briefingTitle")}</span>
      </span>

      <span className="relative font-mono text-4xl font-bold tracking-[0.35em] text-primary sm:text-5xl">
        SPY PARTY
      </span>

      <span className="text-classified animate-pulse text-[11px] text-muted-foreground motion-reduce:animate-none">
        {t("briefingSubtitle")}
      </span>

      <span className="text-classified absolute bottom-8 text-[10px] text-muted-foreground/70">
        {t("briefingHint")}
      </span>
    </button>
  );
}
