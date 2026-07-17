import { Lock } from "lucide-react";

import { Button } from "@/components/ui/button";

/**
 * The offline "pass the device" privacy screen shown between players. Nothing
 * secret is on screen, so the phone can be handed over safely; the next player
 * taps to reveal their own word.
 */
export function HandoffGate({
  eyebrow,
  name,
  actionLabel,
  onReady,
}: {
  eyebrow: string;
  name: string;
  actionLabel: string;
  onReady: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-8 text-center">
      <span className="flex size-20 items-center justify-center rounded-2xl border border-border bg-card text-muted-foreground">
        <Lock className="size-8" />
      </span>
      <div>
        <span className="text-classified text-[11px] text-muted-foreground">
          {eyebrow}
        </span>
        <p className="mt-2 font-mono text-2xl font-bold tracking-wide sm:text-3xl">
          {name}
        </p>
      </div>
      <Button onClick={onReady} className="h-12 w-full max-w-xs gap-2 text-sm font-semibold">
        {actionLabel}
      </Button>
    </div>
  );
}
