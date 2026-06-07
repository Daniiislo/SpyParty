# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository layout

The git root is `f:\SpyParty`, but the actual application lives in the `spy-party/` subdirectory. **All `npm` commands must be run from `spy-party/`**, not the repo root. There is a second `spy-party/CLAUDE.md` that imports `spy-party/AGENTS.md` (the Next.js 16 agent rules) — that import loads automatically when working inside the app directory.

## Commands

Run from `spy-party/`:

- `npm run dev` — start the dev server (http://localhost:3000)
- `npm run build` — production build
- `npm run start` — serve the production build
- `npm run lint` — ESLint (flat config, `eslint-config-next` core-web-vitals + typescript)

There is no test runner or test suite configured yet.

## Critical: this is Next.js 16, not the version you were trained on

Next.js 16 has breaking changes to APIs, conventions, and file structure. **Before writing or modifying any Next.js code, read the relevant guide in `spy-party/node_modules/next/dist/docs/`** (organized into `01-app`, `02-pages`, `03-architecture`). Heed deprecation notices. Concrete examples of what changed:

- **Middleware is now `proxy.ts`.** The Clerk middleware lives at [src/proxy.ts](spy-party/src/proxy.ts) (exporting `clerkMiddleware()` with a `config.matcher`), not `middleware.ts`.
- **React Compiler is enabled** (`reactCompiler: true` in [next.config.ts](spy-party/next.config.ts), via `babel-plugin-react-compiler`). Do not add manual `useMemo`/`useCallback`/`memo` for performance — the compiler handles memoization.

## Architecture & conventions

- **App Router** under `src/app/` (React Server Components by default). React 19.2, TypeScript strict mode.
- **Path alias:** `@/*` → `src/*` (e.g. `@/lib/utils`, `@/components/ui/button`).
- **Auth is Clerk** (`@clerk/nextjs` v7). `<ClerkProvider>` wraps the app in [src/app/layout.tsx](spy-party/src/app/layout.tsx); auth UI uses Clerk's `<SignInButton>`, `<UserButton>`, and the `<Show when="signed-in|signed-out">` component. Keys come from `.env` at the repo root (`NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`).
- **Tailwind CSS v4** — there is **no `tailwind.config.js`**. Configuration is CSS-first in [src/app/globals.css](spy-party/src/app/globals.css): `@import "tailwindcss"`, the `@theme inline { ... }` block maps design tokens, and light/dark palettes are defined as oklch CSS variables under `:root` / `.dark`. PostCSS uses `@tailwindcss/postcss`.
- **UI is shadcn/ui** (style `radix-nova`, configured in [components.json](spy-party/components.json)). Components live in `src/components/ui/`. Two conventions differ from older shadcn:
  - Primitives import from the **unified `radix-ui` package** (`import { Slot } from "radix-ui"`), not individual `@radix-ui/react-*` packages.
  - Components are plain functions tagged with `data-slot`/`data-variant`/`data-size` attributes and styled via `class-variance-authority`; merge classes with `cn()` from [src/lib/utils.ts](spy-party/src/lib/utils.ts).
- **Icons:** `lucide-react`.

## State of the project

This is essentially the create-next-app + Clerk + shadcn starter — `src/app/page.tsx` is still the default template page. There is no domain logic, data layer, or API routes yet.
