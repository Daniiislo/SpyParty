import { auth } from "@clerk/nextjs/server";
import { notFound, redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";

import { getRoomConfig } from "@/lib/data/rooms";
import { getOfflineTopics } from "@/lib/data/word-bank";
import type { BankLocale } from "@/lib/game/word-bank";
import { SettingsForm } from "./settings-form";

export const dynamic = "force-dynamic";

export default async function RoomSettingsPage({
  params,
}: PageProps<"/[locale]/room/[code]/settings">) {
  const { locale, code } = await params;
  setRequestLocale(locale);

  const config = await getRoomConfig(code);
  if (!config) notFound();

  const { userId } = await auth();
  // Host-only, and only while the room is still in the lobby.
  if (!userId || userId !== config.hostUserId || config.status !== "LOBBY") {
    redirect(`/${locale}/room/${code}`);
  }

  const bankLocale: BankLocale = locale === "en" ? "en" : "vi";
  const topics = await getOfflineTopics(bankLocale);
  return <SettingsForm code={code} topics={topics} initial={config} />;
}
