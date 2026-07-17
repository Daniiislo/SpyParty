# Spec: Spy Party — full game (offline + online)

> **Status:** approved, in implementation (phased, gated). **Living document** —
> update it as decisions change. Related: [GAME_CONCEPT.md](../GAME_CONCEPT.md),
> [DESIGN_SYSTEM.md](../DESIGN_SYSTEM.md),
> [i18n-bilingual.md](./i18n-bilingual.md), [../../CLAUDE.md](../../CLAUDE.md).

## 1. Objective

Turn the current starter (bilingual landing page + Clerk + next-intl + empty
Prisma) into a real, playable "who is the spy" game in **both** modes:

- **Offline pass-and-play** — one device is the "card dealer": the host configures
  players / #spies / topic; the app deals a civilian word + a similar spy word;
  each player privately decrypts their own word; describe & vote happen in person.
- **Online realtime rooms** — Quizizz-style: a signed-in host opens a room, guests
  join by name + code, gameplay is synced live.

**Success criteria.** A group can play a full match end-to-end in each mode, at
360px and on desktop, in `/vi` and `/en`, including per-turn **timer**,
**multi-round** win logic, the **Mr. White** role, and a persisted **leaderboard /
match history**. `npm run lint`, `npx tsc --noEmit`, `npm run build`, and
`npm test` all pass (run from `spy-party/`).

## 2. Locked decisions

| Decision | Choice |
|---|---|
| Scope | Whole game, both offline + online |
| Word-pair source | Postgres via Prisma (bilingual, one row per pair), seeded |
| Realtime + DB vendor | **Supabase** (Postgres + Realtime — one vendor) |
| Identity | Host = signed-in **Clerk** user; participants join by name + room code (guest, no account) |
| v1 rule features | per-turn timer, multi-round, Mr. White, leaderboard/history |
| Hosting | Vercel serverless (`spy-party-vn`, auto-deploy from `main`) |

## 3. Tech stack

Next.js **16.2.7** App Router · React 19.2 (**React Compiler ON** — no manual
`useMemo`/`useCallback`/`memo`) · TS strict · Clerk v7 · next-intl v4 (locales `vi`
default + `en`, URL-prefixed) · Prisma 7 + `@prisma/adapter-pg` · Tailwind v4
(CSS-first) · shadcn `radix-nova` · Vitest v4. New deps (each **ask-first**):
`@supabase/supabase-js`, `tsx` (seed runner), `jose` (only if we sign tokens),
several shadcn primitives, optional `qrcode`.

## 4. Architecture

### 4.1 Source of truth & realtime
Postgres (Prisma) is the **single source of truth**. Supabase Realtime is a **dumb
broadcast + presence bus** — **not** Postgres Changes (that leaks secret-word
columns to browsers and forces RLS-as-security). All writes go through
authenticated Next **server actions**; after a committed transaction the server
broadcasts a **secret-free** state event; clients subscribe read-only and
refetch/patch. **Secret words never travel over broadcast** — each player fetches
only their own word from the server (token-scoped).

### 4.2 Prisma schema (namespace `spy_party`; every model/enum needs `@@schema`)
`User` (Clerk anchor, `clerkUserId @unique`), `Topic`/`WordPair` (bilingual, four
word columns in one row, per-topic `slug` for idempotent seeding), `Room` (`code
@unique`, `mode`, `status`, `hostUserId`, draft config, `currentMatchId`,
`expiresAt`), `Player` (room seat/identity across matches: `displayName`, `userId?`,
`isHost`, `sessionTokenHash?`, `seatOrder`, presence), `Match` (snapshots config +
`rngSeed` + `winnerSide`), `MatchPlayer` (per-match `role`/`assignedWord`
snapshot/`status`/`isWinner`/`pointsAwarded`), `Round`/`Turn`/`Vote`/`MrWhiteGuess`
(`Turn.deadlineAt` server-authoritative timer; `Vote @@unique([roundId,
voterMatchPlayerId])`), `MatchResult`/`LeaderboardStat` (`@@index([totalPoints])`).

### 4.3 Pure game engine — `src/lib/game/` (framework-agnostic, deterministic)
No React/Next/Prisma/Clerk/Supabase imports. `reduce(state, action) → { state,
effects }` state machine; declarative `Effect`s interpreted by the caller. Modules:
`types`, `rng` (seeded mulberry32 + Fisher–Yates), `deal`, `turns`, `voting`,
`winConditions`, `mrWhite`, `scoring`, `machine`. **Shared by both modes**: offline
runs it in a client `useReducer` and ignores persist/broadcast effects; online maps
DB rows → `GameState`, runs the same `reduce`, writes the diff, then broadcasts.
Rules can never diverge.

Rule decisions (tunable, centralized constants):
- **Tie-break:** one sudden-death revote among tied candidates → **no elimination**
  if still tied (deterministic, no host arbitration, loop-free).
- **Win:** civilians win when no spies/Mr. White remain; impostors win at parity
  (`nonCivilians >= civilians`); `maxRounds` exhausted with an impostor alive →
  spies win.
- **Mr. White:** counts as non-civilian for parity; if eliminated, a short guess
  sub-phase lets them **steal** the win by guessing the civilian word (diacritic-
  folded compare) — a correct steal overrides a civilian win.
- **Scoring:** win +100, participation +10, civilian-survivor +20, spy per-round
  survival +15, correct spy-vote +10, Mr. White steal +150.

### 4.4 Identity & auth
- **Host:** Clerk `auth()`. `proxy.ts` keeps the Clerk × next-intl composition and
  adds a `createRouteMatcher` host-only gate (`/(vi|en)/create`, `/(vi|en)/host(.*)`)
  with `auth.protect()` — **optimistic UX only**; every host server action
  independently calls `auth()` **and** checks `room.hostUserId === userId`.
- **Guest:** opaque 256-bit random token, **SHA-256-hashed at rest** in
  `Player.sessionTokenHash`, delivered in a per-room httpOnly+secure+sameSite cookie
  (`sp_pt_<code>`). Server-revocable; no signing-key management. Every guest
  mutation re-hashes the cookie and looks up the player scoped to the room. Name
  alone is never identity.
- **Realtime authorization:** channel topic keyed on the **UUID `roomId`** (not the
  guessable short code); server (service-role key) is the **sole broadcaster**; anon
  clients are **receive-only** (RLS on `realtime.messages`); a Route Handler mints a
  short-lived per-room access token from the guest cookie.

### 4.5 Timer honesty (serverless has no in-process timer)
Server writes `Turn.deadlineAt` and broadcasts the **absolute** deadline + server
`now`. Client countdown is cosmetic; mutations reject after the deadline (small
grace). On expiry the acting client + host run a **watchdog** →
`advanceIfExpired(roomId, version)` (idempotent via optimistic `version`); a Vercel
Cron / `pg_cron` `POST /api/cron/sweep-timers` (secret-gated) is the safety net.

### 4.6 Next.js 16 API choices
UI-driven mutations = **Server Actions** (`createRoom`, `joinRoom`, `startMatch`,
`submitClue`, `castVote`, `mrWhiteGuess`, `nextRound`, token-scoped `getMyCard`);
each re-verifies auth (actions are a public POST surface). **Route Handlers** only
where a custom `Response`/no React render is needed (`/api/realtime/token`,
`/api/cron/sweep-timers`, optional Clerk webhook). Cookies are async
(`await cookies()`), writable only in actions/handlers. `error.tsx` props are
`{ error, unstable_retry }`; `params` are async. Consult
`node_modules/next/dist/docs/` before using any Next API.

## 5. Project structure

See [tasks/plan.md](../../tasks/plan.md) for the file-by-file map and
[tasks/todo.md](../../tasks/todo.md) for the ordered task list.

## 6. Code style & conventions

Follow [DESIGN_SYSTEM.md](../DESIGN_SYSTEM.md) (dark-first; amber =
civilian/positive, crimson = spy/danger/voting; Geist Mono for codes/codenames/
timer/words; motif helpers; **mobile-first non-negotiable** — min-h-dvh, ≥44px tap
targets, sanity-check 360/768/1280) and [i18n-bilingual.md](./i18n-bilingual.md)
(no hard-coded copy; both catalogs in parity; navigation via `@/i18n/navigation`;
wordmark + English motif labels untranslated; topic/word display strings come from
the DB per-locale). Reuse `dossier-reveal.tsx` for the reveal (parametrized; keep
demo defaults; honor `prefers-reduced-motion`), `button.tsx` `asChild`+`Link`,
`cn()`; add shadcn primitives via the CLI (registry `radix-nova`).

## 7. Testing strategy

Engine unit tests (Vitest, node env, seeded RNG): `rng` determinism; `deal`
counts + validation; `voting` majority/abstain/tie→revote→no-elimination;
`winConditions` edge cases; `mrWhite` steal + guess normalization; `scoring`
totals; `machine` full scripted multi-round game + out-of-phase guards. Keep the
i18n catalog **parity** test green as namespaces grow. Manual browser E2E per phase.

## 8. Boundaries

- **Always:** run lint + `tsc --noEmit` + build + test before a PR; keep catalog
  parity; server actions re-verify auth; never send other players' secret words to
  the client; atomic Conventional Commits on a `feature/*` branch.
- **Ask first:** adding dependencies; Prisma migrations; changing `proxy.ts`
  matchers; env-var additions; CI/Vercel config.
- **Never:** commit secrets; put a server secret behind `NEXT_PUBLIC_`; use Supabase
  Postgres Changes for gameplay; let a browser write to the DB; commit to `dev`/
  `main` directly.

## 9. Phased delivery (gated — review between phases)

0. **Spec commit** — this doc + `tasks/plan.md` + `tasks/todo.md`; update
   GAME_CONCEPT open questions. No code.
1. **Offline pass-and-play MVP** (single round, civilian + spy) — pure engine +
   tests, in-repo word-bank bootstrap, offline setup + play phase-machine, reuse
   `dossier-reveal`, shadcn `input/label/card/badge/dialog/sonner`, wire landing.
2. **Data layer** — Prisma `Topic`/`WordPair` + migration + seed (`tsx`); read-only
   `getWordPair`; offline reads DB.
3. **Online realtime rooms MVP** — chrome refactor, create (Clerk-gated)/join/room
   shell, Supabase client/broadcast + presence, guest cookie, server actions,
   Room/Player/Match/… models, `proxy.ts` gate.
4. **Advanced** — 4a timer, 4b multi-round, 4c Mr. White, 4d leaderboard/history.

## 10. Open questions / deferred

Guest→account linking; host disconnect migration / co-host; late-join-as-spectator
(v1 rejects after start); join-code recycling (partial unique index); stale-room GC;
separate Supabase project/keys for preview/dev (setup-vercel.ps1 fans secrets to all
three Vercel envs); public-vote vs secret-ballot display; broadcast atomicity
(app-level + reconcile-on-reconnect for v1).
