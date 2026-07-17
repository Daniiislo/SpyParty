# Spec: Bilingual EN/VI internationalization (i18n)

> Step 2 artifact of the feature workflow. Source of truth for the i18n work.
> Concept: [../ideas/i18n-bilingual.md](../ideas/i18n-bilingual.md). Decisions were
> locked in an up-front Q&A and the overall plan was approved before coding.

## Objective

Make Spy Party fully bilingual (Vietnamese + English) from a single codebase, and
establish "no hard-coded UI string" as a durable project convention. A first-time
visitor to `/` is redirected to a locale-prefixed route (`/vi` by default, `/en`
if their browser prefers English); a header control switches language on any page;
all current UI **and** Clerk's own auth UI render in the active locale.

**Users:** Vietnamese players (primary, default) and English-speaking players
(new audience this unlocks).

## Tech Stack

- **next-intl** v4 (i18n library) — Next.js 16 App Router, URL-prefixed routing.
- Next.js **16.2.7** (App Router, `proxy.ts` middleware convention), React **19.2.4**, TypeScript strict, React Compiler ON.
- Auth: **@clerk/nextjs** ^7.4.3 + **@clerk/localizations** ^4.7.1 (`viVN`, `enUS`).
- Testing (new): **Vitest** + `@vitejs/plugin-react` + `jsdom` + Testing Library + `vite-tsconfig-paths`.

## Locale model

| Setting | Value |
|---|---|
| Locales | `vi`, `en` |
| Default | `vi` |
| Routing | `localePrefix: "always"` → `/vi/*`, `/en/*` |
| Detection | `localeDetection: true` (browser `Accept-Language` on `/`) |
| Persistence | next-intl locale cookie (no DB) |

## Commands (run from `spy-party/`)

```
Dev:        npm run dev
Build:      npm run build
Lint:       npm run lint
Typecheck:  npx tsc --noEmit
Test:       npm run test            # vitest (new)
Test once:  npm run test -- --run
Install i18n: npm i next-intl       # add --legacy-peer-deps if peer conflict
```

## Project Structure (target; all under `spy-party/`)

```
messages/en.json                      NEW  message catalog (English)
messages/vi.json                      NEW  message catalog (Vietnamese)
src/i18n/routing.ts                   NEW  defineRouting(locales, defaultLocale, localePrefix, localeDetection)
src/i18n/request.ts                   NEW  getRequestConfig — loads messages for the request locale
src/i18n/navigation.ts                NEW  createNavigation(routing) — locale-aware Link/usePathname/useRouter
src/app/globals.css                   STAYS (Tailwind entry)
src/app/[locale]/layout.tsx           MOVED root layout: <html lang>, providers, generateMetadata, generateStaticParams
src/app/[locale]/page.tsx             MOVED landing page — strings via getTranslations + t.rich
src/app/[locale]/not-found.tsx        NEW  in-locale 404
src/app/global-not-found.tsx          NEW  full-document 404 (experimental.globalNotFound)
src/components/language-switcher.tsx  NEW  compact EN/VI header control
src/components/dossier-reveal.tsx     EDIT client component → useTranslations
src/proxy.ts                          EDIT clerkMiddleware × next-intl createMiddleware
next.config.ts                        EDIT createNextIntlPlugin('./src/i18n/request.ts') + experimental.globalNotFound
vitest.config.ts / vitest.setup.ts    NEW  test runner config
tests/ or *.test.ts colocated         NEW  i18n tests
```

## Code Style

Match the existing codebase (Server Components by default, `@/` alias, `cn()` for
classes, shadcn primitives, no manual memoization — React Compiler is on).

Server Component reading translations:
```tsx
import { setRequestLocale, getTranslations } from "next-intl/server";

export default async function Home({ params }: PageProps<"/[locale]">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("hero");
  return <h1>{t("createRoom")}</h1>;
}
```

Client Component:
```tsx
"use client";
import { useTranslations } from "next-intl";
const t = useTranslations("dossier");
```

Rich text (hero paragraph with an inline highlighted span) — one message, one unit:
```tsx
t.rich("tagline", { hl: (chunks) => <span className="text-foreground">{chunks}</span> })
```

Catalog: namespaced JSON, keys in `camelCase`, sections
`metadata / nav / hero / roles / steps / cta / footer / dossier`.

## Testing Strategy

- **Vitest** + jsdom + Testing Library; `@vitejs/plugin-react` (Babel) — do **not**
  add react-compiler to the test transform. `vite-tsconfig-paths` resolves `@/`.
- Tests colocated as `*.test.ts(x)` (or under `tests/`). Add `"test": "vitest"`.
- **Five required tests:**
  1. **Catalog key parity** — flatten `en.json` + `vi.json` to dot-keys; the two key sets must be identical.
  2. **Rich-tag parity** — any value containing `<hl>` in one locale contains it in the other.
  3. **Locale redirect** — `createMiddleware(routing)`: `/` → `/vi`; with `accept-language: en` → `/en`. (Test the intl middleware directly; no Clerk keys needed.)
  4. **Language switcher** — clicking calls `router.replace({pathname, params}, {locale})` with the other locale.
  5. **Component render** — `DossierReveal` in an EN provider shows the EN decode label; in a VI provider shows "Giải mã hồ sơ".

## Boundaries

- **Always:** run lint + `tsc --noEmit` + test + build before the PR; keep every user-facing string in the catalogs; import internal `Link`/navigation from `@/i18n/navigation`; keep `src/proxy.ts` (never create `middleware.ts`); mobile-first per DESIGN_SYSTEM.md.
- **Ask first:** adding any dependency beyond next-intl + the Vitest set; any DB/schema change; changing CI config; touching Clerk auth logic beyond the `localization` prop.
- **Never:** commit secrets or `.env*`; hard-code UI copy; force-push `dev`/`main`; remove/skip tests to make them pass; broaden the proxy matcher unnecessarily.

## Success Criteria (testable)

1. Visiting `/` redirects to `/vi` (default) or `/en` (browser prefers English).
2. `/vi` and `/en` render the full landing page + header/footer in that language; an unknown locale (`/fr`) 404s.
3. The header EN/VI switcher changes language and **preserves the current path**.
4. Clerk sign-in/sign-up modals render in the active locale (`viVN`/`enUS`).
5. `dossier-reveal` labels, topic, role words, and hints are localized (client component reads the provider).
6. `<html lang>` matches the active locale; localized `<title>`/description + `hreflang` alternates are emitted.
7. `npm run lint`, `npx tsc --noEmit`, `npm run test`, `npm run build` all pass; the 5 tests above pass.
8. No user-facing hard-coded string remains in `page.tsx`, `layout.tsx`, `dossier-reveal.tsx` (verified by review).

## Assumptions (proceeding on these; validated during implementation)

1. next-intl v4 runs on Next 16.2.7 / React 19.2 (peer-range warning tolerated).
2. `createMiddleware` composes inside `clerkMiddleware()` in one `proxy.ts` without breaking Clerk/`__clerk`/`api` routes.
3. Per-locale Clerk `localization` re-localizes its modals.
4. Full SSG won't occur (Clerk makes routes dynamic); `setRequestLocale` + `generateStaticParams` are kept for correctness/future.

## Open Questions

None blocking. DB-persisted preference, extra locales, and a richer language
picker are explicitly out of scope (see the "Not Doing" list in the concept doc).
