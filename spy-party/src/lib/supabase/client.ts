import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Browser Supabase client used purely for Realtime (subscribing to a room's
 * broadcast channel). Holds the publishable key only — safe to expose. Returns
 * `null` when Realtime isn't configured, so the UI can degrade gracefully.
 */
let client: SupabaseClient | null | undefined;

export function getSupabaseBrowser(): SupabaseClient | null {
  if (client !== undefined) return client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) {
    client = null;
    return null;
  }
  client = createClient(url, key, {
    auth: { persistSession: false },
    realtime: { params: { eventsPerSecond: 10 } },
  });
  return client;
}

/** Channel/topic name for a room — must match the server broadcast topic. */
export function roomChannelName(roomId: string): string {
  return `room-${roomId}`;
}
