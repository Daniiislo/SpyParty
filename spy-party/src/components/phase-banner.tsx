import { cn } from "@/lib/utils";

/**
 * The `.text-classified` eyebrow + heading used at the top of every game phase.
 * Wrapped in an `aria-live="polite"` region so screen readers announce phase and
 * turn changes as the game advances.
 */
export function PhaseBanner({
  eyebrow,
  title,
  description,
  className,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  className?: string;
}) {
  return (
    <div className={cn("text-center", className)} aria-live="polite">
      {eyebrow ? (
        <span className="text-classified text-[11px] text-muted-foreground">
          {eyebrow}
        </span>
      ) : null}
      <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">
        {title}
      </h1>
      {description ? (
        <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
          {description}
        </p>
      ) : null}
    </div>
  );
}
