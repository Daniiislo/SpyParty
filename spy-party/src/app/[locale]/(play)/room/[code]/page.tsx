import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";

import { getRoomView } from "@/lib/data/rooms";
import { getOfflineTopics } from "@/lib/data/word-bank";
import type { BankLocale } from "@/lib/game/word-bank";
import { RoomClient } from "@/components/room/room-client";

export const dynamic = "force-dynamic";

export default async function RoomPage({
  params,
}: PageProps<"/[locale]/room/[code]">) {
  const { locale, code } = await params;
  setRequestLocale(locale);

  const bankLocale: BankLocale = locale === "en" ? "en" : "vi";
  // Load the room view (one query + one auth for both state & card) and topics
  // in parallel instead of three sequential awaits behind the loading screen.
  const [view, topics] = await Promise.all([
    getRoomView(code),
    getOfflineTopics(bankLocale),
  ]);
  if (!view) notFound();

  return (
    <RoomClient
      code={view.state.code}
      roomId={view.state.roomId}
      initialState={view.state}
      initialCard={view.card}
      topics={topics}
    />
  );
}
