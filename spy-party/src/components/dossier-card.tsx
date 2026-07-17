import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";

import { cn } from "@/lib/utils";

/**
 * The reusable "agent dossier" surface from the design system — a bordered card
 * whose accent (`tone`) carries meaning: amber = civilian/positive, crimson =
 * spy/danger/voting, neutral = default, muted = inactive/eliminated. Set
 * `active` for the amber "it's this agent's turn" glow. Use `asChild` to render
 * it as a `<button>` (e.g. a selectable vote candidate).
 */
const dossierCardVariants = cva(
  "relative overflow-hidden rounded-xl border bg-card p-4 text-left transition-colors",
  {
    variants: {
      tone: {
        neutral: "border-border",
        amber: "border-primary/40",
        crimson: "border-destructive/50",
        muted: "border-border/60 opacity-70",
      },
      active: {
        true: "animate-glow-pulse ring-1 ring-primary/50",
        false: "",
      },
      selected: {
        true: "ring-2",
        false: "",
      },
      interactive: {
        true: "cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
        false: "",
      },
    },
    compoundVariants: [
      { selected: true, tone: "crimson", class: "ring-destructive border-destructive" },
      { selected: true, tone: "amber", class: "ring-primary border-primary" },
      { selected: true, tone: "neutral", class: "ring-primary" },
    ],
    defaultVariants: {
      tone: "neutral",
      active: false,
      selected: false,
      interactive: false,
    },
  },
);

export interface DossierCardProps
  extends React.ComponentProps<"div">,
    VariantProps<typeof dossierCardVariants> {
  asChild?: boolean;
}

export function DossierCard({
  className,
  tone,
  active,
  selected,
  interactive,
  asChild = false,
  ...props
}: DossierCardProps) {
  const Comp = asChild ? Slot.Root : "div";
  return (
    <Comp
      data-slot="dossier-card"
      data-tone={tone ?? "neutral"}
      className={cn(
        dossierCardVariants({ tone, active, selected, interactive }),
        className,
      )}
      {...props}
    />
  );
}

export { dossierCardVariants };
