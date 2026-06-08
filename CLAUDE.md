# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository layout

The git root is `f:\SpyParty`, but the actual application lives in the `spy-party/` subdirectory. **All `npm` commands must be run from `spy-party/`**, not the repo root. There is a second `spy-party/CLAUDE.md` that imports `spy-party/AGENTS.md` (the Next.js 16 agent rules) — that import loads automatically when working inside the app directory.

## Project documentation

Product/domain docs live in `docs/` — **read these for product context before implementing features**:

- [docs/GAME_CONCEPT.md](docs/GAME_CONCEPT.md) — game rules, player roles, room types (online/offline), game flow, win conditions, and open questions. Living doc; keep it updated as decisions are made.
- [docs/DESIGN_SYSTEM.md](docs/DESIGN_SYSTEM.md) — locked visual direction ("Classified Dossier": dark-first, amber primary, crimson alert), color tokens (oklch), typography, spy motifs, and motion conventions. Follow it for all new UI.
- [docs/GIT_WORKFLOW.md](docs/GIT_WORKFLOW.md) — commit, branch, and PR conventions (summarized below).

## Commands

Run from `spy-party/`:

- `npm run dev` — start the dev server (http://localhost:3000)
- `npm run build` — production build
- `npm run start` — serve the production build
- `npm run lint` — ESLint (flat config, `eslint-config-next` core-web-vitals + typescript)

There is no test runner or test suite configured yet.

## Git & PR conventions

Full guide: [docs/GIT_WORKFLOW.md](docs/GIT_WORKFLOW.md). Essentials:

- **Conventional Commits** (`type(scope): subject`, imperative, English). Split unrelated work into separate **atomic** commits.
- **Branch off `dev`**, named `<type>/<short-kebab-desc>` (e.g. `feature/room-creation`). Never commit directly to or force-push `dev`/`main`.
- **PRs target `dev`** by default (only `main` for releases/hotfixes). Title = a clear Conventional-Commit summary of the whole PR; description follows [.github/pull_request_template.md](.github/pull_request_template.md) (Summary / Changes / Impact / Verification / …).
- **Pre-flight before a PR** (from `spy-party/`): `npm run lint`, `npx tsc --noEmit`, `npm run build` must pass.

## Critical: this is Next.js 16, not the version you were trained on

Next.js 16 has breaking changes to APIs, conventions, and file structure. **Before writing or modifying any Next.js code, read the relevant guide in `spy-party/node_modules/next/dist/docs/`** (organized into `01-app`, `02-pages`, `03-architecture`). Heed deprecation notices. Concrete examples of what changed:

- **Middleware is now `proxy.ts`.** The Clerk middleware lives at [src/proxy.ts](spy-party/src/proxy.ts) (exporting `clerkMiddleware()` with a `config.matcher`), not `middleware.ts`.
- **React Compiler is enabled** (`reactCompiler: true` in [next.config.ts](spy-party/next.config.ts), via `babel-plugin-react-compiler`). Do not add manual `useMemo`/`useCallback`/`memo` for performance — the compiler handles memoization.

## Architecture & conventions

- **App Router** under `src/app/` (React Server Components by default). React 19.2, TypeScript strict mode.
- **Path alias:** `@/*` → `src/*` (e.g. `@/lib/utils`, `@/components/ui/button`).
- **Auth is Clerk** (`@clerk/nextjs` v7). `<ClerkProvider>` wraps the app in [src/app/layout.tsx](spy-party/src/app/layout.tsx); auth UI uses Clerk's `<SignInButton>`, `<SignUpButton>`, `<UserButton>`, and the `<Show when="signed-in|signed-out">` control component. Keys come from `spy-party/.env.local` (`NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`) — gitignored, as is `.clerk/`. There is no `.env` at the repo root.
- **Tailwind CSS v4** — there is **no `tailwind.config.js`**. Configuration is CSS-first in [src/app/globals.css](spy-party/src/app/globals.css), which imports `tailwindcss`, `tw-animate-css`, and `shadcn/tailwind.css`. The `@theme inline { ... }` block maps design tokens (colors, fonts, `--radius-*` scale) to CSS variables; light/dark palettes are oklch variables under `:root` / `.dark`; dark mode is class-based via `@custom-variant dark (&:is(.dark *))`. PostCSS uses `@tailwindcss/postcss`.
- **UI is shadcn/ui** (style `radix-nova`, configured in [components.json](spy-party/components.json)). Components live in `src/components/ui/`. Two conventions differ from older shadcn:
  - Primitives import from the **unified `radix-ui` package** (`import { Slot } from "radix-ui"`), not individual `@radix-ui/react-*` packages.
  - Components are plain functions tagged with `data-slot`/`data-variant`/`data-size` attributes and styled via `class-variance-authority`; merge classes with `cn()` from [src/lib/utils.ts](spy-party/src/lib/utils.ts).
- **Icons:** `lucide-react`.

## State of the project

This is essentially the create-next-app + Clerk + shadcn starter — `src/app/page.tsx` is still the default template page. There is no domain logic, data layer, or API routes yet. The product being built is **Ai Là Gián Điệp** (a "who is the spy" word game) — see [docs/GAME_CONCEPT.md](docs/GAME_CONCEPT.md) for rules and scope.
