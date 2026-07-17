"use client";

import { useTranslations } from "next-intl";
import { Home } from "lucide-react";

import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { PhaseBanner } from "@/components/phase-banner";

export default function RoomNotFound() {
  const t = useTranslations("online");
  const tc = useTranslations("common");
  return (
    <main className="bg-blueprint flex min-h-dvh flex-col items-center justify-center gap-6 px-4 text-center">
      <PhaseBanner
        eyebrow="404"
        title={t("notFound")}
        description={t("notFoundDesc")}
      />
      <Button asChild className="h-11 gap-2 px-6">
        <Link href="/">
          <Home className="size-4" /> {tc("home")}
        </Link>
      </Button>
    </main>
  );
}
