import { cn } from "@/lib/utils";

/**
 * Full-screen "Classified Dossier" loading effect: an amber radar sweep over the
 * blueprint grid with a scanline pass and the SPY PARTY wordmark. Purely
 * presentational (no client hooks) so it can serve as a route `loading.tsx`
 * Suspense fallback. Motion is disabled under `prefers-reduced-motion`.
 *
 * `label` is a short uppercase motif tag (English motif labels stay untranslated
 * per the design system) — defaults to a decrypting cue.
 */
export function LoadingScreen({
  label = "DECRYPTING",
  className,
}: {
  label?: string;
  className?: string;
}) {
  return (
    <main
      className={cn(
        "bg-blueprint relative flex min-h-dvh flex-col items-center justify-center gap-8 overflow-hidden px-4",
        className,
      )}
    >
      {/* ambient amber glow */}
      <div className="glow-hero pointer-events-none absolute inset-0" aria-hidden />
      {/* horizontal scanline pass */}
      <div
        className="animate-scanline pointer-events-none absolute left-0 h-px w-full"
        aria-hidden
        style={{
          background:
            "linear-gradient(to right, transparent, color-mix(in oklch, var(--primary) 55%, transparent), transparent)",
        }}
      />

      {/* radar dish */}
      <div className="relative size-28" aria-hidden>
        <div className="absolute inset-0 rounded-full border border-primary/25" />
        <div className="absolute inset-[18%] rounded-full border border-primary/15" />
        <div className="absolute inset-[38%] rounded-full border border-primary/10" />
        {/* rotating sweep line */}
        <div className="absolute inset-0 origin-center animate-spin [animation-duration:2.2s] motion-reduce:animate-none">
          <div
            className="absolute left-1/2 top-1/2 h-1/2 w-px origin-top -translate-x-1/2"
            style={{
              background:
                "linear-gradient(to bottom, color-mix(in oklch, var(--primary) 75%, transparent), transparent)",
            }}
          />
        </div>
        {/* center blip */}
        <div className="animate-glow-pulse absolute left-1/2 top-1/2 size-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary" />
      </div>

      <div className="relative flex flex-col items-center gap-2 text-center">
        <span className="font-mono text-2xl font-bold tracking-[0.35em] text-primary">
          SPY PARTY
        </span>
        <span className="text-classified animate-pulse text-[11px] text-muted-foreground motion-reduce:animate-none">
          {label}
          <span className="ml-0.5">…</span>
        </span>
      </div>
    </main>
  );
}
