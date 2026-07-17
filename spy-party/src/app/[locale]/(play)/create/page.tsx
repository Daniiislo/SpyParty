import { auth } from "@clerk/nextjs/server";
import { SignInButton } from "@clerk/nextjs";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { getOfflineTopics } from "@/lib/data/word-bank";
import type { BankLocale } from "@/lib/game/word-bank";
import { Button } from "@/components/ui/button";
import { PhaseBanner } from "@/components/phase-banner";
import { CreateRoomForm } from "./create-form";

export const dynamic = "force-dynamic";

export default async function CreatePage({
  params,
}: PageProps<"/[locale]/create">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { userId } = await auth();
  const t = await getTranslations("online");

  // Host must be signed in. In-page modal gate (the app uses Clerk modal auth,
  // no dedicated sign-in route); the createRoom action re-verifies server-side.
  if (!userId) {
    return (
      <main className="bg-blueprint flex min-h-dvh flex-col items-center justify-center gap-8 px-4 text-center">
        <PhaseBanner
          eyebrow={t("clearanceTitle")}
          title="SPY PARTY"
          description={t("clearanceDesc")}
        />
        <SignInButton mode="modal">
          <Button className="h-11 gap-2 px-6 text-sm font-semibold">
            {t("signInToCreate")}
          </Button>
        </SignInButton>
      </main>
    );
  }

  const bankLocale: BankLocale = locale === "en" ? "en" : "vi";
  const topics = await getOfflineTopics(bankLocale);
  return <CreateRoomForm topics={topics} locale={bankLocale} />;
}
