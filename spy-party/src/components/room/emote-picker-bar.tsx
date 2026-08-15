"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Smile, Sparkles, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Quick bar emojis for instant 1-tap reactions */
const QUICK_EMOJIS = ["🕵️", "🤫", "🤔", "😂", "🔥", "😱"];

/** Extended emoji list grouped by categories for full picker */
const EMOJI_CATEGORIES = [
  {
    name: "Spy & Tactical",
    emojis: ["🕵️", "🤫", "🔍", "💣", "🎯", "🤐", "🙈", "👀"],
  },
  {
    name: "Reactions",
    emojis: ["😂", "🤔", "😱", "💀", "🤡", "💩", "❓", "😈"],
  },
  {
    name: "Hype & Victory",
    emojis: ["🔥", "👍", "🥳", "💥", "🏆", "🍿", "😇", "🍕"],
  },
];

export function EmotePickerBar({
  onSelectEmote,
}: {
  onSelectEmote: (emoji: string) => void;
}) {
  const t = useTranslations("online");
  const [open, setOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState<number>(0);

  function handlePick(emoji: string) {
    onSelectEmote(emoji);
    // Optional vibration feedback on mobile
    if (typeof window !== "undefined" && "vibrate" in navigator) {
      try {
        navigator.vibrate(20);
      } catch {
        // Safe fallback
      }
    }
  }

  return (
    <div className="fixed bottom-4 right-4 z-40 flex flex-col items-end gap-2 sm:bottom-6 sm:right-6">
      {/* Expanded Palette Popover */}
      {open && (
        <div className="w-72 rounded-2xl border border-primary/30 bg-card/95 p-3.5 shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150">
          <div className="mb-2.5 flex items-center justify-between border-b border-border/50 pb-2">
            <span className="text-classified flex items-center gap-1.5 text-[11px] font-bold tracking-wider text-primary">
              <Sparkles className="size-3.5" />
              {t("emotesTitle")}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="size-6 rounded-full hover:bg-muted"
              onClick={() => setOpen(false)}
              aria-label="Close emote picker"
            >
              <X className="size-3.5" />
            </Button>
          </div>

          {/* Category Tabs */}
          <div className="mb-3 flex gap-1 rounded-lg bg-muted/60 p-1">
            {EMOJI_CATEGORIES.map((cat, idx) => (
              <button
                key={cat.name}
                type="button"
                onClick={() => setActiveCategory(idx)}
                className={cn(
                  "flex-1 rounded-md py-1 text-center text-[10px] font-medium transition-all",
                  activeCategory === idx
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {cat.name.split(" ")[0]}
              </button>
            ))}
          </div>

          {/* Emoji Grid */}
          <div className="grid grid-cols-4 gap-2 py-1">
            {EMOJI_CATEGORIES[activeCategory].emojis.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => handlePick(emoji)}
                className="flex aspect-square items-center justify-center rounded-xl bg-muted/30 text-2xl transition-all duration-150 hover:scale-125 hover:bg-primary/20 active:scale-95"
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Docked Bar */}
      <div className="flex items-center gap-1.5 rounded-full border border-primary/30 bg-card/90 p-1.5 shadow-xl backdrop-blur-md">
        <div className="flex items-center gap-0.5">
          {QUICK_EMOJIS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => handlePick(emoji)}
              title={t("sendEmote")}
              className="flex size-9 items-center justify-center rounded-full text-lg transition-transform duration-150 hover:scale-125 hover:bg-primary/20 active:scale-90"
            >
              {emoji}
            </button>
          ))}
        </div>

        <div className="h-5 w-px bg-border/60" />

        <Button
          variant={open ? "secondary" : "ghost"}
          size="icon"
          onClick={() => setOpen(!open)}
          title={t("moreEmotes")}
          className={cn(
            "size-9 rounded-full transition-transform active:scale-95",
            open && "bg-primary/20 text-primary",
          )}
        >
          <Smile className="size-4" />
        </Button>
      </div>
    </div>
  );
}
