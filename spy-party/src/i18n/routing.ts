import { defineRouting } from "next-intl/routing";

// Locale routing config shared by the middleware, navigation helpers, and
// request config. See docs/specs/i18n-bilingual.md.
export const routing = defineRouting({
  locales: ["vi", "en"],
  defaultLocale: "vi",
  // URL-prefixed locales: every path is /vi/... or /en/...
  localePrefix: "always",
  // Detect the preferred locale from the Accept-Language header on first visit.
  localeDetection: true,
});

export type Locale = (typeof routing.locales)[number];
