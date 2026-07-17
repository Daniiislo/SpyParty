"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import {
  Fingerprint,
  LockOpen,
  RefreshCw,
  ShieldAlert,
  UserRound,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Role = "civilian" | "spy";

const GLYPHS = "ABCDEFGHJKLMNPQRSTUVWXYZ#%&░▒▓/\\";

function redact(word: string) {
  return word.replace(/[^ ]/g, "█");
}

export function DossierReveal() {
  const t = useTranslations("dossier");
  // Localized sample word pair; read from the catalog inside the component
  // (not at module scope) so it follows the active locale and plays nice with
  // the React Compiler.
  const words: Record<Role, string> = {
    civilian: t("words.civilian"),
    spy: t("words.spy"),
  };

  const [role, setRole] = useState<Role>("civilian");
  const [revealed, setRevealed] = useState(false);
  const [scrambling, setScrambling] = useState(false);
  const [display, setDisplay] = useState(() => redact(words.civilian));
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, []);

  function scrambleTo(word: string) {
    if (timer.current) clearInterval(timer.current);
    setScrambling(true);
    let tick = 0;
    const total = 16;
    timer.current = setInterval(() => {
      tick += 1;
      const locked = Math.floor((tick / total) * word.length);
      const next = word
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
        setDisplay(word);
        setScrambling(false);
      }
    }, 45);
  }

  function handleReveal() {
    setRevealed(true);
    scrambleTo(words[role]);
  }

  function handleSwitch() {
    const next: Role = role === "civilian" ? "spy" : "civilian";
    setRole(next);
    if (revealed) {
      scrambleTo(words[next]);
    } else {
      setDisplay(redact(words[next]));
    }
  }

  const isSpy = role === "spy";

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl border bg-card p-6 transition-colors",
        !revealed && "border-border",
        revealed && !isSpy && "animate-glow-pulse border-primary/40",
        revealed && isSpy && "animate-alert-pulse border-destructive/50",
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
            revealed && !isSpy && "border-primary/40 text-primary",
            revealed && isSpy && "border-destructive/50 text-destructive",
          )}
        >
          {revealed ? t("statusDecoded") : t("statusSecret")}
        </span>
      </div>

      <div className="mt-6">
        <span className="text-classified text-[10px] text-muted-foreground">
          {t("topicLabel")}
        </span>
        <p className="text-sm font-medium">{t("topic")}</p>
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
            revealed && !scrambling && !isSpy && "text-primary",
            revealed && !scrambling && isSpy && "text-destructive",
          )}
        >
          {display}
          {scrambling && (
            <span className="ml-0.5 inline-block animate-pulse">▌</span>
          )}
        </p>
      </div>

      <div className="mt-5 h-7">
        {revealed && !scrambling && (
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium",
              isSpy
                ? "border-destructive/50 bg-destructive/10 text-destructive"
                : "border-primary/40 bg-primary/10 text-primary",
            )}
          >
            {isSpy ? (
              <>
                <ShieldAlert className="size-3.5" /> {t("youAreSpy")}
              </>
            ) : (
              <>
                <UserRound className="size-3.5" /> {t("youAreCivilian")}
              </>
            )}
          </span>
        )}
      </div>

      <div className="mt-5 flex gap-2">
        {!revealed ? (
          <Button onClick={handleReveal} className="h-10 flex-1 gap-2">
            <LockOpen className="size-4" /> {t("decode")}
          </Button>
        ) : (
          <Button
            onClick={handleSwitch}
            variant="outline"
            className="h-10 flex-1 gap-2"
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
