"use client";

import { useEffect, useRef } from "react";

import { getSupabaseBrowser, roomChannelName } from "@/lib/supabase/client";

/**
 * Subscribe to a room's Supabase broadcast channel and run `onSync` whenever the
 * server pokes it (after a committed state change), plus on window focus as a
 * reconnect-reconciliation fallback. The callback is held in a ref so updating
 * it never re-subscribes.
 */
export function useRoomChannel(
  roomId: string | null,
  onSync: () => void,
  onEmote?: (payload: unknown) => void,
) {
  const cb = useRef(onSync);
  const emoteCb = useRef(onEmote);

  useEffect(() => {
    cb.current = onSync;
    emoteCb.current = onEmote;
  }, [onSync, onEmote]);

  useEffect(() => {
    if (!roomId) return;
    const supabase = getSupabaseBrowser();
    if (!supabase) return;

    const channel = supabase
      .channel(roomChannelName(roomId))
      .on("broadcast", { event: "sync" }, () => cb.current())
      .on("broadcast", { event: "emote" }, ({ payload }) => {
        if (emoteCb.current) emoteCb.current(payload);
      })
      .subscribe();

    const onFocus = () => cb.current();
    window.addEventListener("focus", onFocus);

    return () => {
      window.removeEventListener("focus", onFocus);
      supabase.removeChannel(channel);
    };
  }, [roomId]);
}
