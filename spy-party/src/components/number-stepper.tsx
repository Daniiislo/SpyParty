import { Minus, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * A compact −/value/+ stepper for small integer settings (e.g. spy count).
 * Buttons are ≥44px tap targets; the value is shown in the mono "agent" texture.
 */
export function NumberStepper({
  value,
  min,
  max,
  onChange,
  decrementLabel,
  incrementLabel,
  className,
}: {
  value: number;
  min: number;
  max: number;
  onChange: (next: number) => void;
  decrementLabel: string;
  incrementLabel: string;
  className?: string;
}) {
  const canDecrement = value > min;
  const canIncrement = value < max;
  return (
    <div className={cn("inline-flex items-center gap-3", className)}>
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="size-11 rounded-lg"
        aria-label={decrementLabel}
        disabled={!canDecrement}
        onClick={() => canDecrement && onChange(value - 1)}
      >
        <Minus className="size-4" />
      </Button>
      <span
        className="min-w-8 text-center font-mono text-2xl font-bold tabular-nums"
        aria-live="polite"
      >
        {value}
      </span>
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="size-11 rounded-lg"
        aria-label={incrementLabel}
        disabled={!canIncrement}
        onClick={() => canIncrement && onChange(value + 1)}
      >
        <Plus className="size-4" />
      </Button>
    </div>
  );
}
