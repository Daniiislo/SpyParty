import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";

import { getMyCard, getRoomState } from "@/lib/data/rooms";
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

  return (
    <RoomClient
      code={state.code}
      roomId={state.roomId}
      initialState={state}
      initialCard={card}
    />
  );
}
