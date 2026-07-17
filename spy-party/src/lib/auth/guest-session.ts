import "server-only";

import crypto from "node:crypto";
import { cookies } from "next/headers";

/**
 * Guest identity for online rooms. A participant joins with just a display name;
 * the server issues an HMAC-signed cookie carrying their `playerId` + `roomId`.
 * They cannot forge another player's id without the secret, and the cookie is
 * httpOnly so client JS can't read it. Every mutating action re-verifies the
 * signature and that the player still belongs to the room.
 */
const SECRET = process.env.GUEST_SESSION_SECRET ?? "";
const MAX_AGE_SECONDS = 60 * 60 * 12; // 12h

function cookieName(code: string): string {
  return `sp_pt_${code.toLowerCase()}`;
}

function sign(body: string): string {
  return crypto.createHmac("sha256", SECRET).update(body).digest("base64url");
}

function makeToken(playerId: string, roomId: string): string {
  const body = Buffer.from(JSON.stringify({ pid: playerId, rid: roomId })).toString(
    "base64url",
  );
  return `${body}.${sign(body)}`;
}

function verifyToken(token: string | undefined): { pid: string; rid: string } | null {
  if (!token || !SECRET) return null;
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  const expected = sign(body);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const parsed = JSON.parse(Buffer.from(body, "base64url").toString());
    if (typeof parsed?.pid === "string" && typeof parsed?.rid === "string") return parsed;
  } catch {
    // fall through
  }
  return null;
}

/** Issue the guest cookie after a successful join (Server Action / Route Handler). */
export async function setGuestCookie(
  code: string,
  playerId: string,
  roomId: string,
): Promise<void> {
  const store = await cookies();
  store.set(cookieName(code), makeToken(playerId, roomId), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}

/** Resolve the guest's playerId for a room from the cookie, or `null`. */
export async function readGuestPlayerId(
  code: string,
  roomId: string,
): Promise<string | null> {
  const store = await cookies();
  const token = store.get(cookieName(code))?.value;
  const payload = verifyToken(token);
  if (!payload || payload.rid !== roomId) return null;
  return payload.pid;
}

/** Clear the guest cookie (on leave). */
export async function clearGuestCookie(code: string): Promise<void> {
  const store = await cookies();
  store.delete(cookieName(code));
}
