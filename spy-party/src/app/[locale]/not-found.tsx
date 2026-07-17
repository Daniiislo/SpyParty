import { getTranslations } from "next-intl/server";
import { FileLock2 } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";

// In-locale 404: rendered inside app/[locale]/layout.tsx, so it inherits the
// <html>, providers, and active locale. Locale is resolved from the request.
export default async function NotFound() {
  const t = await getTranslations("notFound");

  return (
    <main className="relative flex flex-1 flex-col items-center justify-center overflow-hidden px-4 py-24 text-center">
      <div className="bg-blueprint pointer-events-none absolute inset-0 opacity-40" />
      <div className="glow-hero pointer-events-none absolute inset-0" />
      <div className="relative flex flex-col items-center">
        <span className="flex size-14 items-center justify-center rounded-xl border border-primary/30 bg-primary/10 text-primary">
          <FileLock2 className="size-7" />
        </span>
        <span className="text-classified mt-6 text-5xl font-bold text-primary/40">
          404
        </span>
        <h1 className="mt-4 text-2xl font-semibold sm:text-3xl">{t("title")}</h1>
        <p className="mt-3 max-w-sm text-sm text-muted-foreground">
          {t("description")}
        </p>
        <Button asChild className="mt-8 h-11 gap-2 px-6 text-sm font-semibold">
          <Link href="/">{t("home")}</Link>
        </Button>
      </div>
    </main>
  );
}
