import "server-only";

/**
 * Server-side Supabase Realtime broadcast. Postgres (via Prisma) is the source
 * of truth; after a committed mutation the server sends a lightweight "sync"
 * poke to the room's channel so subscribed clients refetch the authoritative,
 * secret-free state. No game secrets ever travel over the wire here.
 *
 * Uses the REST broadcast endpoint with the secret key, so it works from a
 * stateless serverless function (no persistent socket).
 */
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SECRET_KEY = process.env.SUPABASE_SECRET_KEY;

/** The Realtime channel/topic name for a room (keyed on the unguessable id). */
export function roomChannel(roomId: string): string {
  return `room-${roomId}`;
}

/** Best-effort broadcast; clients also reconcile on reconnect, so a miss is safe. */
export async function broadcastRoom(
  roomId: string,
  event = "sync",
  payload: Record<string, unknown> = {},
): Promise<void> {
  if (!SUPABASE_URL || !SECRET_KEY) return;
  try {
    await fetch(`${SUPABASE_URL}/realtime/v1/api/broadcast`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: SECRET_KEY,
        Authorization: `Bearer ${SECRET_KEY}`,
      },
      body: JSON.stringify({
        messages: [{ topic: roomChannel(roomId), event, payload }],
      }),
    });
  } catch {
    // best-effort — a missed poke is recovered by the client's reconnect refetch
  }
}
