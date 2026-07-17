import { setRequestLocale } from "next-intl/server";

import { getOfflineTopics } from "@/lib/data/word-bank";
import type { BankLocale } from "@/lib/game/word-bank";
import { OfflineSetupForm } from "./offline-setup";

// Topics come from the database at request time; keep this dynamic so a fresh
// seed/edit shows up without a rebuild.
export const dynamic = "force-dynamic";

export default async function OfflineSetupPage({
  params,
}: PageProps<"/[locale]/offline">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const bankLocale: BankLocale = locale === "en" ? "en" : "vi";
  const topics = await getOfflineTopics(bankLocale);

  return <OfflineSetupForm topics={topics} locale={bankLocale} />;
}
