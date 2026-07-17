"use client";

import { useTranslations } from "next-intl";
import { RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { PhaseBanner } from "@/components/phase-banner";

export default function RoomError({
  reset,
  unstable_retry,
}: {
  error?: Error;
  reset?: () => void;
  unstable_retry?: () => void;
}) {
  const t = useTranslations("online");
  const retry = unstable_retry ?? reset;
  return (
    <main className="bg-blueprint flex min-h-dvh flex-col items-center justify-center gap-6 px-4 text-center">
      <PhaseBanner title={t("connError")} description={t("connErrorDesc")} />
      <Button onClick={() => retry?.()} className="h-11 gap-2 px-6">
        <RotateCcw className="size-4" /> {t("retry")}
      </Button>
    </main>
  );
}
