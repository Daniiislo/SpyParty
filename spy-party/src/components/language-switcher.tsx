"use client";

import { useTransition } from "react";
import { useLocale } from "next-intl";
import { Languages } from "lucide-react";
import { usePathname, useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";

// Compact header control that toggles between vi and en, preserving the current
// path. `usePathname` (from @/i18n/navigation) returns the path without the
// locale prefix; `router.replace(pathname, { locale })` re-attaches the target.
export function LanguageSwitcher() {
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const nextLocale = locale === "vi" ? "en" : "vi";

  function switchLocale() {
    startTransition(() => {
      router.replace(pathname, { locale: nextLocale });
    });
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={switchLocale}
      disabled={isPending}
      aria-label={
        locale === "vi" ? "Switch to English" : "Chuyển sang tiếng Việt"
      }
      className="gap-1.5"
    >
      <Languages className="size-4" />
      {locale === "vi" ? "EN" : "VI"}
    </Button>
  );
}
