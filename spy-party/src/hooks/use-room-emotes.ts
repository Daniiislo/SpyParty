"use client";

import { useCallback, useEffect, useRef, useState } from "react";

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
  const lastSeenRef = useRef<number>(Date.now() - 5000);
  const bcRef = useRef<BroadcastChannel | null>(null);

  const addEmote = useCallback((emote: ActiveEmote) => {
    setEmotes((prev) => {
      if (prev.some((e) => e.id === emote.id)) return prev;
      return [...prev.slice(-40), emote];
    });

    setTimeout(() => {
      setEmotes((prev) => prev.filter((e) => e.id !== emote.id));
    }, 2800);
  }, []);

  // 1. Setup local BroadcastChannel for zero-latency 0ms sync across browser tabs/windows
  useEffect(() => {
    if (!code) return;
    const channelName = `spyparty-emotes-${code.toUpperCase()}`;
    let bc: BroadcastChannel | null = null;
    try {
      if (typeof BroadcastChannel !== "undefined") {
        bc = new BroadcastChannel(channelName);
        bcRef.current = bc;
        bc.onmessage = (event) => {
          if (event.data && typeof event.data === "object" && "id" in event.data) {
            addEmote(event.data as ActiveEmote);
          }
        };
      }
    } catch {
      // Fallback if BroadcastChannel is unsupported
    }

    return () => {
      if (bc) {
        bc.close();
        bcRef.current = null;
      }
    };
  }, [code, addEmote]);

  // 2. Ultra-fast 400ms polling via lightweight /api/emotes Route Handler (no RSC re-render overhead)
  useEffect(() => {
    if (!code) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(
          `/api/emotes?code=${encodeURIComponent(code)}&since=${lastSeenRef.current}`,
          { cache: "no-store" },
        );
        if (!res.ok) return;
        const data = await res.json();
        const serverEmotes = data?.emotes as ActiveEmote[];

        if (Array.isArray(serverEmotes) && serverEmotes.length > 0) {
          for (const e of serverEmotes) {
            if (e.senderId !== meId) {
              addEmote(e);
            }
            if (e.createdAt > lastSeenRef.current) {
              lastSeenRef.current = e.createdAt;
            }
          }
        }
      } catch {
        // Suppress transient fetch errors
      }
    }, 400);

    return () => clearInterval(interval);
  }, [code, meId, addEmote]);

  const triggerEmote = useCallback(
    async (emoji: string) => {
      const now = Date.now();
      if (now - lastSentRef.current < 250) return; // Anti-spam rate limit
      lastSentRef.current = now;

      const xPercent = Math.floor(Math.random() * 70) + 15;
      const emote: ActiveEmote = {
        id: `${meId}-${now}-${Math.random().toString(36).slice(2, 7)}`,
        senderId: meId,
        senderName: meName,
        emoji,
        xPercent,
        createdAt: now,
      };

      // 1. Add locally immediately
      addEmote(emote);

      // 2. Post via BroadcastChannel to other local tabs instantly (0ms)
      if (bcRef.current) {
        try {
          bcRef.current.postMessage(emote);
        } catch {
          // Ignore
        }
      }

      // 3. Post to fast /api/emotes Route Handler
      try {
        void fetch("/api/emotes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code, emote }),
        });
      } catch {
        // Ignore
      }

      // 4. Post to Supabase Realtime channel if available
      const supabase = getSupabaseBrowser();
      if (roomId && supabase) {
        try {
          const channel = supabase.channel(roomChannelName(roomId));
          void channel.send({
            type: "broadcast",
            event: "emote",
            payload: emote,
          });
        } catch {
          // Ignore
        }
      }

      // 5. Server Action fallback
      try {
        void sendRoomEmote(code, emote);
      } catch {
        // Ignore
      }
    },
    [code, roomId, meId, meName, addEmote],
  );

  return { emotes, addEmote, triggerEmote };
}
