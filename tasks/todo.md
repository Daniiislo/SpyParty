# i18n EN/VI — Task Checklist

Ordered by dependency. Each task leaves the app in a working (buildable) state.
Commands run from `spy-party/`.

---

## Task 1: Install dependencies
**Description:** Add next-intl (runtime) and the Vitest test set (dev).
**Acceptance:**
- [ ] `next-intl` in `dependencies`; `vitest @vitejs/plugin-react jsdom @testing-library/{react,dom,jest-dom,user-event} vite-tsconfig-paths` in `devDependencies`.
- [ ] `package-lock.json` updated; install succeeds (use `--legacy-peer-deps` only if peer conflict).
**Verify:** `npm run build` still passes (no code change yet).
**Dependencies:** None · **Files:** `package.json`, `package-lock.json` · **Scope:** S

## Task 2: i18n core config
**Description:** `routing.ts` (defineRouting), `request.ts` (getRequestConfig + hasLocale), `navigation.ts` (createNavigation); wrap `next.config.ts` with the plugin + `experimental.globalNotFound`.
**Acceptance:**
- [ ] locales `["vi","en"]`, default `vi`, `localePrefix: "always"`, `localeDetection: true`.
- [ ] `request.ts` loads `messages/${locale}.json` with a safe fallback via `hasLocale`.
**Verify:** `npx tsc --noEmit` (types resolve).
**Dependencies:** 1 · **Files:** `src/i18n/{routing,request,navigation}.ts`, `next.config.ts` · **Scope:** M

## Task 3: Restructure into `app/[locale]/`
**Description:** Move `layout.tsx` + `page.tsx` under `src/app/[locale]/`; fix `globals.css` import to `../globals.css`; `<html lang={locale}>`, `setRequestLocale`, `generateStaticParams`; wrap `<NextIntlClientProvider>` around `<ClerkProvider>`. Strings may stay literal in this task (localized in Phase 2) — goal is a building, routed app.
**Acceptance:**
- [ ] `/vi` and `/en` render the landing page; unknown locale 404s (`hasLocale` → `notFound()`).
- [ ] Only one root layout (renders `<html>/<body>`).
**Verify:** `npm run build`; `npm run dev` → open `/vi`, `/en`.
**Dependencies:** 2 · **Files:** `src/app/[locale]/layout.tsx`, `src/app/[locale]/page.tsx` · **Scope:** M

## Task 4: Compose middleware in `src/proxy.ts`
**Description:** Run `createMiddleware(routing)` inside `clerkMiddleware((auth, req) => …)`; early-return (skip i18n) for `/api`, `/trpc`, `/__clerk`; keep the existing `config.matcher`.
**Acceptance:**
- [ ] `/` redirects to `/vi`; `accept-language: en` → `/en`.
- [ ] `/__clerk/*` and `/api/*` are NOT locale-prefixed; Clerk still attaches auth.
**Verify:** `npm run dev` → `/` redirects; sign-in modal opens; middleware redirect test (added in Task 11) passes.
**Dependencies:** 3 · **Files:** `src/proxy.ts` · **Scope:** S

### ▶ Checkpoint A (Foundation): build clean · `/`→`/vi` · `/en` ok · `/fr` 404 · Clerk modal opens

## Task 5: Message catalogs
**Description:** Author `messages/vi.json` + `messages/en.json` with namespaces `metadata, nav, hero, roles, steps, cta, footer, dossier`; hero paragraph as one `<hl>`-tagged message.
**Acceptance:**
- [ ] Every current UI string has a key in both files; key sets identical.
- [ ] EN translations are natural (not machine-literal).
**Verify:** catalog-parity test (Task 11) passes.
**Dependencies:** 2 · **Files:** `messages/{vi,en}.json` · **Scope:** M

## Task 6: Localize `layout.tsx` + language switcher
**Description:** Replace nav/button strings with `getTranslations("nav")`; `generateMetadata` (title/description + hreflang alternates + metadataBase); Clerk `localization={locale==="en"?enUS:viVN}`; new `language-switcher.tsx` (compact EN/VI, preserves path via `@/i18n/navigation`); logo `Link` from `@/i18n/navigation`.
**Acceptance:**
- [ ] Header/footer/metadata localize; switcher toggles locale and keeps the path.
**Verify:** `dev` — toggle EN/VI on `/vi`; `<title>` + `<html lang>` change.
**Dependencies:** 5 · **Files:** `src/app/[locale]/layout.tsx`, `src/components/language-switcher.tsx` · **Scope:** M

## Task 7: Localize `page.tsx`
**Description:** All sections via `getTranslations`; hero via `t.rich("tagline", {hl})`; `STEPS` keeps `no`+`Icon`, text from `steps.items.<no>`.
**Acceptance:**
- [ ] No hard-coded user-facing string; both locales render correctly.
**Verify:** `dev` — compare `/vi` vs `/en`.
**Dependencies:** 5 · **Files:** `src/app/[locale]/page.tsx` · **Scope:** M

## Task 8: Localize `dossier-reveal.tsx`
**Description:** `"use client"` + `useTranslations("dossier")`; move `TOPIC`/`WORDS` reads inside the component (from `t`); localize labels/status/hints/buttons.
**Acceptance:**
- [ ] Topic, role words, labels, hints localized; decrypt animation still works.
**Verify:** `dev` — reveal + switch-perspective in both locales; render test (Task 11).
**Dependencies:** 5 · **Files:** `src/components/dossier-reveal.tsx` · **Scope:** S

## Task 9: Not-found pages
**Description:** `app/[locale]/not-found.tsx` (localized) + `app/global-not-found.tsx` (full document, imports `globals.css`, sets `<html lang>`).
**Acceptance:**
- [ ] `/vi/does-not-exist` shows localized 404 inside layout; a non-locale garbage URL renders the global 404.
**Verify:** `npm run build`; `dev` manual.
**Dependencies:** 3 · **Files:** `src/app/[locale]/not-found.tsx`, `src/app/global-not-found.tsx` · **Scope:** S

### ▶ Checkpoint B (Core): both locales fully localized · switcher preserves path · Clerk localizes · no hard-coded UI string

## Task 10: Vitest setup
**Description:** `vitest.config.ts` (react plugin + tsconfig-paths + jsdom + setup), `vitest.setup.ts` (jest-dom), add `"test": "vitest"`.
**Acceptance:** `npm run test -- --run` runs (0 or passing tests).
**Verify:** `npm run test -- --run`.
**Dependencies:** 1 · **Files:** `vitest.config.ts`, `vitest.setup.ts`, `package.json` · **Scope:** S

## Task 11: Write the five tests
**Description:** catalog key parity; `<hl>` tag parity; locale redirect (`createMiddleware`); switcher `router.replace` call; `DossierReveal` render per locale.
**Acceptance:** all 5 pass.
**Verify:** `npm run test -- --run`.
**Dependencies:** 4,5,6,8,10 · **Files:** `src/**/*.test.ts(x)` (or `tests/`) · **Scope:** M

## Task 12: Document the convention
**Description:** Add an i18n section to `docs/DESIGN_SYSTEM.md` (all UI copy via catalogs; internal `Link` from `@/i18n/navigation`; locales/default/prefix).
**Acceptance:** convention recorded.
**Verify:** doc reads correctly.
**Dependencies:** none (do last) · **Files:** `docs/DESIGN_SYSTEM.md` · **Scope:** XS

### ▶ Checkpoint C (Complete): lint · `tsc --noEmit` · test · build all green · manual dev at 360/768/1280
