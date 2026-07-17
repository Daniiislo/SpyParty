// Full-document 404 for URLs that never match a locale segment. Bypasses the
// normal layout tree, so it must render its own <html>/<body> and import global
// styles + fonts. Rendered in the default locale.
import "./globals.css";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { getTranslations } from "next-intl/server";
import { routing } from "@/i18n/routing";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations({
    locale: routing.defaultLocale,
    namespace: "notFound",
  });
  return { title: t("title"), description: t("description") };
}

export default async function GlobalNotFound() {
  const t = await getTranslations({
    locale: routing.defaultLocale,
    namespace: "notFound",
  });

  return (
    <html
      lang={routing.defaultLocale}
      className={`dark ${geistSans.variable} ${geistMono.variable}`}
    >
      <body className="flex min-h-dvh flex-col items-center justify-center antialiased">
        <main className="flex flex-col items-center px-4 py-24 text-center">
          <span className="text-classified text-5xl font-bold text-primary/40">
            404
          </span>
          <h1 className="mt-4 text-2xl font-semibold sm:text-3xl">
            {t("title")}
          </h1>
          <p className="mt-3 max-w-sm text-sm text-muted-foreground">
            {t("description")}
          </p>
          <a
            href={`/${routing.defaultLocale}`}
            className="mt-8 inline-flex h-11 items-center rounded-lg bg-primary px-6 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/80"
          >
            {t("home")}
          </a>
        </main>
      </body>
    </html>
  );
}
