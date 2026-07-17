# Bilingual EN/VI (i18n) for Spy Party

> Idea one-pager (step 1 of the feature workflow). Scope was locked via an
> up-front Q&A round; this records the concept and the trade-offs. The full
> engineering spec lives in [../specs/i18n-bilingual.md](../specs/i18n-bilingual.md).

## Problem Statement

How might we let Spy Party serve both Vietnamese and English players from one
codebase — without hard-coding copy, and with a convention every future screen
follows — so the product can grow beyond a Vietnamese-only audience?

## Recommended Direction

Adopt **next-intl** with **URL-prefixed locales** (`/vi`, `/en`), **Vietnamese as
the default** and **browser auto-detection** on first visit. All user-facing copy
moves into per-locale message catalogs (`messages/vi.json`, `messages/en.json`),
and the app is restructured under an `app/[locale]/` segment so the locale flows
into every layout/page and into `<html lang>` and Clerk's own localized UI.

This is the direction Next.js 16's own docs point to (App Router dropped the
built-in `i18n` config), and next-intl is the top recommendation there. URL
prefixes give shareable, SEO-friendly localized links and clean static params;
next-intl's client provider cleanly solves the one Client Component we have
(`dossier-reveal.tsx`). The cost we accept: restructuring into `[locale]/` and
composing next-intl's middleware inside Clerk's in `src/proxy.ts`.

The deeper bet is on **discipline, not just wiring**: once catalogs exist, "no
hard-coded UI string" becomes a project rule (recorded in the design system), so
i18n stops being a retrofit and becomes the default for every new screen.

## Key Assumptions to Validate
- [ ] next-intl installs and runs on Next 16.2.7 / React 19.2 despite peer ranges — validate by installing and running `build` + `dev`.
- [ ] next-intl's `createMiddleware` composes with `clerkMiddleware()` in a single `proxy.ts` without breaking Clerk auth or `/__clerk` routes — validate with a middleware redirect test + real sign-in modal check.
- [ ] Switching Clerk's `localization` per-locale (`enUS`/`viVN`) fully re-localizes its modals — validate by eye in `dev`.

## MVP Scope
**In:** next-intl setup (routing/request/navigation), `[locale]` restructure,
vi/en catalogs covering *all current UI* (~43 strings across `page.tsx`,
`layout.tsx`, `dossier-reveal.tsx`), a compact header EN/VI switcher, locale-aware
metadata + hreflang, Clerk locale switch, Vitest tests (catalog parity, redirect,
switcher, render), and an i18n convention noted in the design system.

**Out:** persisting language to the DB, a full language-picker UI, translating
demo game-content beyond the sample word pair, and any locale beyond en/vi.

## Not Doing (and Why)
- **DB-persisted language preference (Prisma)** — a cookie + URL locale is enough for the current app; DB persistence adds a migration + server action for marginal gain now. Revisit when user profiles need it.
- **Cookie-only / no URL prefix** — rejected in favor of shareable, SEO-friendly localized URLs and simpler static generation.
- **A third+ locale or region variants (`en-US`, `vi-VN`)** — plain `en`/`vi` keeps routing and catalogs simple; regionalization is speculative.
- **Translating placeholder game words as product content** — `CÀ PHÊ`/`TRÀ SỮA` are demo data; they get a reasonable EN pair but aren't a localization deliverable.

## Open Questions
- None blocking — library, routing, default+detection, and the branch/PR flow were all decided in the planning Q&A. Remaining unknowns are the three assumptions above, resolved during implementation/verification.
