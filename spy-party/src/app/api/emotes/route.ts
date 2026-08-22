import { NextResponse } from "next/server";
import { addMemoryEmote, getMemoryEmotes, type MemoryEmote } from "@/lib/data/room-store";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const since = Number(searchParams.get("since") || 0);

  if (!code) {
    return NextResponse.json({ error: "missing_code" }, { status: 400 });
  }

  const emotes = getMemoryEmotes(code, since);
  return NextResponse.json({ emotes });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { code, emote } = body as { code: string; emote: MemoryEmote };

    if (!code || !emote || !emote.id) {
      return NextResponse.json({ error: "invalid_body" }, { status: 400 });
    }

    addMemoryEmote(code, emote);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
}
