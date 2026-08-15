"use client";

import type { ActiveEmote } from "@/hooks/use-room-emotes";

export function EmoteOverlay({ emotes }: { emotes: ActiveEmote[] }) {
  if (!emotes || emotes.length === 0) return null;

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-50 overflow-hidden"
    >
      {emotes.map((item) => (
        <div
          key={item.id}
          className="animate-float-emote absolute flex flex-col items-center gap-1"
          style={{
            left: `${item.xPercent}%`,
            bottom: "80px",
          }}
        >
          <span className="text-4xl sm:text-5xl filter drop-shadow-[0_4px_8px_rgba(0,0,0,0.4)] transition-transform select-none">
            {item.emoji}
          </span>
          <span className="text-classified max-w-[110px] truncate rounded-full border border-primary/40 bg-card/90 px-2.5 py-0.5 text-[10px] font-semibold text-foreground shadow-lg backdrop-blur-md">
            {item.senderName}
          </span>
        </div>
      ))}
    </div>
  );
}
