# Implementation Plan: Bilingual EN/VI (i18n)

Spec: [../docs/specs/i18n-bilingual.md](../docs/specs/i18n-bilingual.md) · Concept: [../docs/ideas/i18n-bilingual.md](../docs/ideas/i18n-bilingual.md)

## Overview
Add next-intl with URL-prefixed locales (`/vi`, `/en`), default `vi` + browser
auto-detection. Foundation first (config + `[locale]` restructure + middleware —
the riskiest part), then localize every surface, then tests + docs.

## Architecture Decisions
- **next-intl v4**, `localePrefix: "always"`, `localeDetection: true`, default `vi`.
- **Root layout moves into `app/[locale]/layout.tsx`** (single root layout; no double `<html>`); `global-not-found.tsx` handles unmatched URLs.
- **`src/proxy.ts`** runs `createMiddleware(routing)` inside `clerkMiddleware()`, early-returning (skip i18n) for `/api`, `/trpc`, `/__clerk`; matcher unchanged.
- **`<NextIntlClientProvider>`** wraps `<ClerkProvider>` so the one Client Component (`dossier-reveal`) and Clerk both localize; Clerk `localization` picked per-locale (`viVN`/`enUS`).
- **Vitest** (Babel react plugin, no react-compiler in test transform).

## Task List

### Phase 1: Foundation (highest risk first)
- [ ] Task 1: Install dependencies (next-intl + Vitest set)
- [ ] Task 2: i18n core config (routing/request/navigation + next.config plugin)
- [ ] Task 3: Restructure into `app/[locale]/` + providers + `<html lang>`
- [ ] Task 4: Compose middleware in `src/proxy.ts`

### Checkpoint: Foundation
- [ ] `npm run build` clean; `/` → `/vi`; `/en` renders; `/fr` 404s; Clerk sign-in modal still opens.

### Phase 2: Localize all surfaces
- [ ] Task 5: Message catalogs `messages/{en,vi}.json` (all namespaces)
- [ ] Task 6: Localize `layout.tsx` (nav + generateMetadata + Clerk locale) + `language-switcher.tsx`
- [ ] Task 7: Localize `page.tsx` (hero `t.rich`, roles, steps, cta, footer)
- [ ] Task 8: Localize `dossier-reveal.tsx` (client `useTranslations`)
- [ ] Task 9: `not-found.tsx` (in-locale) + `global-not-found.tsx`

### Checkpoint: Core
- [ ] Both locales render full UI; switcher preserves path; Clerk modal localizes; no hard-coded UI string remains.

### Phase 3: Tests + docs
- [ ] Task 10: Vitest config/setup + `test` script
- [ ] Task 11: Five required tests (parity, rich-tag parity, redirect, switcher, render)
- [ ] Task 12: Update `docs/DESIGN_SYSTEM.md` with the i18n convention

### Checkpoint: Complete
- [ ] lint + `tsc --noEmit` + test + build all pass; manual `dev` check at 360/768/1280.

## Risks and Mitigations
| Risk | Impact | Mitigation |
|------|--------|------------|
| next-intl peer range excludes Next 16 | Med | `--legacy-peer-deps`; validate with build/dev early (Task 1–3) |
| Middleware composition breaks Clerk/`__clerk`/api | High | Early return for those paths; redirect test; manual sign-in check at checkpoint |
| Client component can't read messages | Med | Ensure `NextIntlClientProvider` wraps the tree in `[locale]/layout` |
| React Compiler + module-scope translated words | Low | Read `t("words.*")` inside the component, not at module scope |

## Open Questions
None blocking (see spec).
