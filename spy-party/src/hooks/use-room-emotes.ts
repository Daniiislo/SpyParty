"use client";

import { useCallback, useRef, useState } from "react";

import { sendRoomEmote } from "@/lib/actions/rooms";
import { getSupabaseBrowser, roomChannelName } from "@/lib/supabase/client";

export interface ActiveEmote {
  id: string;
  senderId: string;
  senderName: string;
  emoji: string;
  xPercent: number;
  createdAt: number;
}

export function useRoomEmotes(
  code: string,
  roomId: string | null,
  meId: string,
  meName: string,
) {
  const [emotes, setEmotes] = useState<ActiveEmote[]>([]);
  const lastSentRef = useRef<number>(0);

  const addEmote = useCallback((emote: ActiveEmote) => {
    setEmotes((prev) => {
      // Prevent duplicates by ID
      if (prev.some((e) => e.id === emote.id)) return prev;
      return [...prev.slice(-40), emote];
    });

    // Auto-remove after animation finishes (2.8 seconds)
    setTimeout(() => {
      setEmotes((prev) => prev.filter((e) => e.id !== emote.id));
    }, 2800);
  }, []);

  const triggerEmote = useCallback(
    async (emoji: string) => {
      const now = Date.now();
      if (now - lastSentRef.current < 250) return; // 250ms anti-spam rate limit
      lastSentRef.current = now;

      // Random horizontal position (15% to 85% of screen width)
      const xPercent = Math.floor(Math.random() * 70) + 15;
      const emote: ActiveEmote = {
        id: `${meId}-${now}-${Math.random().toString(36).slice(2, 7)}`,
        senderId: meId,
        senderName: meName,
        emoji,
        xPercent,
        createdAt: now,
      };

      // 1. Add to local state immediately for instant response
      addEmote(emote);

      // 2. Broadcast to peers via Supabase Realtime Browser channel
      const supabase = getSupabaseBrowser();
      if (roomId && supabase) {
        const channel = supabase.channel(roomChannelName(roomId));
        void channel.send({
          type: "broadcast",
          event: "emote",
          payload: emote,
        });
      }

      // 3. Server action broadcast fallback
      try {
        await sendRoomEmote(code, emote);
      } catch {
        // Ignored if REST broadcast fallback fails
      }
    },
    [code, roomId, meId, meName, addEmote],
  );

  return { emotes, addEmote, triggerEmote };
}
