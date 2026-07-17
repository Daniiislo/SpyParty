import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";

import { getMyCard, getRoomState } from "@/lib/data/rooms";
import { getOfflineTopics } from "@/lib/data/word-bank";
import type { BankLocale } from "@/lib/game/word-bank";
import { RoomClient } from "@/components/room/room-client";

export const dynamic = "force-dynamic";

export default async function RoomPage({
  params,
}: PageProps<"/[locale]/room/[code]">) {
  const { locale, code } = await params;
  setRequestLocale(locale);

  const state = await getRoomState(code);
  if (!state) notFound();
  const card = await getMyCard(code);
  const bankLocale: BankLocale = locale === "en" ? "en" : "vi";
  const topics = await getOfflineTopics(bankLocale);

  return (
    <RoomClient
      code={state.code}
      roomId={state.roomId}
      initialState={state}
      initialCard={card}
      topics={topics}
    />
  );
}
