"use client";

import { memo } from "react";

import type { ActiveEmote } from "@/hooks/use-room-emotes";

const EmoteItem = memo(function EmoteItem({ item }: { item: ActiveEmote }) {
  return (
    <div
      className="animate-float-emote absolute flex flex-col items-center gap-1.5"
      style={{
        left: `${item.xPercent}%`,
        bottom: "80px",
      }}
    >
      <span className="text-4xl sm:text-5xl select-none filter drop-shadow-[0_6px_12px_rgba(0,0,0,0.45)]">
        {item.emoji}
      </span>
      <span className="text-classified max-w-[120px] truncate rounded-full border border-primary/35 bg-card/90 px-2.5 py-0.5 text-[10px] font-semibold text-foreground shadow-md backdrop-blur-md">
        {item.senderName}
      </span>
    </div>
  );
});

export function EmoteOverlay({ emotes }: { emotes: ActiveEmote[] }) {
  if (!emotes || emotes.length === 0) return null;

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-50 overflow-hidden"
    >
      {emotes.map((item) => (
        <EmoteItem key={item.id} item={item} />
      ))}
    </div>
  );
}
