"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import {
  Check,
  EyeOff,
  Fingerprint,
  LockOpen,
  RefreshCw,
  ShieldAlert,
  UserRound,
  VenetianMask,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type RevealRole = "civilian" | "spy" | "mrWhite";

const GLYPHS = "ABCDEFGHJKLMNPQRSTUVWXYZ#%&░▒▓/\\";

function redact(word: string) {
  return word.replace(/[^ ]/g, "█");
}

function prefersReducedMotion() {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

export interface DossierRevealProps {
  /**
   * Real dealt word to reveal (gameplay). `null`/absent for Mr. White, who gets
   * no word. Ignored in demo mode, which reads sample words from the catalog.
   */
  word?: string | null;
  /** The player's role (gameplay). Defaults to a demo civilian/spy toggle. */
  role?: RevealRole;
  /** Real topic label (gameplay). Falls back to the catalog demo topic. */
  topic?: string;
  /** `"demo"` = landing preview (default); `"reveal"` = in-game hand-off reveal. */
  mode?: "demo" | "reveal";
  /**
   * Blind mode (reveal only): show the word but hide the role — neutral styling,
   * no "you are the spy/civilian" badge — so the player must deduce their side.
   */
  blind?: boolean;
  /** Called after the player confirms they memorized their word (reveal mode). */
  onDone?: () => void;
}

/**
 * The redact → scramble → settle secret-word reveal.
 *
 * With no props it renders the landing-page demo (civilian/spy toggle, sample
 * words from the `dossier` catalog). In `reveal` mode it shows one player's real
 * dealt word/role/topic, hides the perspective switch, and offers a "memorized"
 * button that calls {@link DossierRevealProps.onDone}. Honors
 * `prefers-reduced-motion` by skipping the scramble animation.
 */
export function DossierReveal({
  word,
  role: roleProp,
  topic: topicProp,
  mode = "demo",
  blind = false,
  onDone,
}: DossierRevealProps) {
  const t = useTranslations("dossier");
  const isReveal = mode === "reveal";
  const blindReveal = isReveal && blind;

  // Demo sample words, read inside the component so they follow the active
  // locale and play nice with the React Compiler.
  const demoWords: Record<"civilian" | "spy", string> = {
    civilian: t("words.civilian"),
    spy: t("words.spy"),
  };

  const [demoRole, setDemoRole] = useState<RevealRole>("civilian");
  const role: RevealRole = isReveal ? (roleProp ?? "civilian") : demoRole;

  const [revealed, setRevealed] = useState(false);
  const [scrambling, setScrambling] = useState(false);
  const [display, setDisplay] = useState("");
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, []);

  function wordFor(r: RevealRole): string {
    if (isReveal) {
      if (r === "mrWhite") return t("mrWhiteWord");
      return word ?? "";
    }
    return r === "spy" ? demoWords.spy : demoWords.civilian;
  }

  const currentWord = wordFor(role);
  const topicText = isReveal ? (topicProp ?? t("topic")) : t("topic");

  function scrambleTo(target: string) {
    if (timer.current) clearInterval(timer.current);
    // Reduced motion: jump straight to the settled word, no scramble.
    if (prefersReducedMotion()) {
      setScrambling(false);
      setDisplay(target);
      return;
    }
    setScrambling(true);
    let tick = 0;
    const total = 16;
    timer.current = setInterval(() => {
      tick += 1;
      const locked = Math.floor((tick / total) * target.length);
      const next = target
        .split("")
        .map((ch, i) => {
          if (ch === " ") return " ";
          if (i < locked) return ch;
          return GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
        })
        .join("");
      setDisplay(next);
      if (tick >= total) {
        if (timer.current) clearInterval(timer.current);
        setDisplay(target);
        setScrambling(false);
      }
    }, 45);
  }

  function handleReveal() {
    setRevealed(true);
    scrambleTo(currentWord);
  }

  function handleSwitch() {
    const next: RevealRole = demoRole === "civilian" ? "spy" : "civilian";
    setDemoRole(next);
    scrambleTo(wordFor(next));
  }

  // Blind reveal suppresses all role-tinted styling and the role badge.
  const isSpy = !blindReveal && role === "spy";
  const isMrWhite = !blindReveal && role === "mrWhite";
  const isCivilian = !blindReveal && role === "civilian";
  const shown = display || redact(currentWord);

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl border bg-card p-6 transition-colors",
        !revealed && "border-border",
        revealed && isCivilian && "animate-glow-pulse border-primary/40",
        revealed && isSpy && "animate-alert-pulse border-destructive/50",
        revealed && isMrWhite && "border-foreground/30",
        revealed && blindReveal && "border-foreground/30",
      )}
    >
      <div className="animate-scanline pointer-events-none absolute inset-x-0 h-px bg-gradient-to-r from-transparent via-primary/60 to-transparent" />

      <div className="flex items-center justify-between text-muted-foreground">
        <span className="text-classified inline-flex items-center gap-1.5 text-[10px]">
          <Fingerprint className="size-3.5" /> {t("id")}
        </span>
        <span
          className={cn(
            "text-classified rounded-sm border px-1.5 py-0.5 text-[9px]",
            !revealed && "border-border text-muted-foreground",
            revealed && isCivilian && "border-primary/40 text-primary",
            revealed && isSpy && "border-destructive/50 text-destructive",
            revealed && isMrWhite && "border-foreground/40 text-foreground",
            revealed && blindReveal && "border-foreground/40 text-foreground",
          )}
        >
          {revealed ? t("statusDecoded") : t("statusSecret")}
        </span>
      </div>

      <div className="mt-6">
        <span className="text-classified text-[10px] text-muted-foreground">
          {t("topicLabel")}
        </span>
        <p className="text-sm font-medium">{topicText}</p>
      </div>

      <div className="mt-3">
        <span className="text-classified text-[10px] text-muted-foreground">
          {t("wordLabel")}
        </span>
        <p
          className={cn(
            "font-mono text-3xl font-bold tracking-[0.15em] transition-colors sm:text-4xl",
            !revealed && "text-muted-foreground/70",
            revealed && scrambling && "text-foreground",
            revealed && !scrambling && isCivilian && "text-primary",
            revealed && !scrambling && isSpy && "text-destructive",
            revealed && !scrambling && isMrWhite && "text-foreground",
            revealed && !scrambling && blindReveal && "text-foreground",
          )}
        >
          {shown}
          {scrambling && (
            <span className="ml-0.5 inline-block animate-pulse">▌</span>
          )}
        </p>
      </div>

      <div className="mt-5 h-7">
        {revealed && !scrambling && !blindReveal && (
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium",
              isCivilian && "border-primary/40 bg-primary/10 text-primary",
              isSpy && "border-destructive/50 bg-destructive/10 text-destructive",
              isMrWhite && "border-foreground/30 bg-foreground/5 text-foreground",
            )}
          >
            {isSpy && (
              <>
                <ShieldAlert className="size-3.5" /> {t("youAreSpy")}
              </>
            )}
            {isCivilian && (
              <>
                <UserRound className="size-3.5" /> {t("youAreCivilian")}
              </>
            )}
            {isMrWhite && (
              <>
                <VenetianMask className="size-3.5" /> {t("youAreMrWhite")}
              </>
            )}
          </span>
        )}
        {revealed && !scrambling && blindReveal && (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-foreground/30 bg-foreground/5 px-3 py-1 text-xs font-medium text-foreground">
            <EyeOff className="size-3.5" /> {t("blindIdentity")}
          </span>
        )}
      </div>

      <div className="mt-5 flex gap-2">
        {!revealed ? (
          <Button onClick={handleReveal} className="h-11 flex-1 gap-2">
            <LockOpen className="size-4" /> {t("decode")}
          </Button>
        ) : isReveal ? (
          onDone ? (
            <Button
              onClick={onDone}
              disabled={scrambling}
              className="h-11 flex-1 gap-2"
            >
              <Check className="size-4" /> {t("memorized")}
            </Button>
          ) : null
        ) : (
          <Button
            onClick={handleSwitch}
            variant="outline"
            className="h-11 flex-1 gap-2"
          >
            <RefreshCw className="size-4" /> {t("switch")}
          </Button>
        )}
      </div>

      <p className="text-classified mt-3 text-center text-[10px] text-muted-foreground">
        {revealed ? t("hintAfter") : t("hintBefore")}
      </p>
    </div>
  );
}
