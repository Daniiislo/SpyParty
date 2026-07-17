# Implementation plan — Spy Party full game

Canonical spec: [../docs/specs/spy-party-game.md](../docs/specs/spy-party-game.md).
This file is the file-by-file implementation map; [todo.md](./todo.md) is the
ordered task checklist. All paths are under `spy-party/`.

## File map (new / changed)

```
prisma/schema.prisma                     Topic, WordPair, Room, Player, Match,
                                         MatchPlayer, Round, Turn, Vote,
                                         MrWhiteGuess, MatchResult, LeaderboardStat
prisma/seed.ts + prisma.config.ts        migrations.seed (tsx); bilingual starter bank
src/lib/game/*                           pure engine (types/rng/deal/turns/voting/
                                         winConditions/mrWhite/scoring/machine) + tests
src/lib/game/word-bank.ts                Phase-1 in-repo bilingual bootstrap
src/lib/actions/*.ts                     'use server' mutations (auth re-verified)
src/lib/auth/guest-session.ts            issue/verify guest cookie
src/lib/supabase/{server,client}.ts      service-role broadcast / anon Realtime
src/hooks/use-room-channel.ts            subscribe + presence
src/data/rooms.ts                        server-only DAL (never returns others' words)
src/app/[locale]/layout.tsx              refactor chrome → (marketing)/(play) groups
src/app/[locale]/(marketing)/page.tsx    landing (wire CTAs)
src/app/[locale]/(play)/offline/...      offline setup + phase-machine play screen
src/app/[locale]/(play)/create           online create (Clerk-gated)
src/app/[locale]/(play)/join[,/[code]]   guest join by code + name
src/app/[locale]/(play)/room/[code]/...  room shell + loading/error/not-found
src/app/[locale]/leaderboard, /match/[id]  standings + shareable recap
src/app/api/{realtime/token,cron/sweep-timers}/route.ts
src/components/*                          dossier-card, room-code-display, copy-button,
                                         player-list/presence-dot, timer-ring,
                                         vote-panel, results-table, handoff-gate,
                                         phase-banner, count steppers, topic-picker,
                                         word-mark; EDIT dossier-reveal.tsx
messages/{vi,en}.json                    new namespaces (parity test enforced)
src/proxy.ts                             add host-only createRouteMatcher gate
```

## Reuse (don't reinvent)

- `src/components/dossier-reveal.tsx` — the redact→scramble→settle reveal; parametrize
  (`word`/`role`/`topic`/`mode`/`onDone`), keep demo defaults so existing tests pass,
  add a `prefers-reduced-motion` short-circuit.
- `src/components/ui/button.tsx` — `asChild` + `Link` from `@/i18n/navigation`
  (pattern already in `not-found.tsx`).
- `src/lib/utils.ts` `cn()`; `src/lib/prisma.ts` singleton; `src/i18n/navigation.ts`.
- Design tokens/motifs in `src/app/globals.css`.

## Phase order & dependencies

P0 spec → P1 offline MVP (engine is the shared foundation) → P2 data layer (prereq
for both modes) → P3 online rooms (largest risk; depends on the proven engine) → P4
advanced (additive; layers onto a working core). **Review gate between phases.**

## Risks & mitigations

| Risk | Impact | Mitigation |
|------|--------|-----------|
| Vercel serverless can't hold WebSockets | High | Supabase Realtime as hosted bus; server broadcasts over HTTPS; timers via client watchdog + cron |
| Secret words leaking to clients | High | Never broadcast words; token-scoped per-player fetch; no Postgres Changes; `server-only` DAL |
| Guest impersonation | Med | Opaque 256-bit token, hashed at rest, httpOnly cookie; server re-verifies every mutation |
| Rules diverging between offline/online | Med | One pure engine (`src/lib/game/`) shared by both; deterministic seeded tests |
| Next 16 API drift from training data | Med | Consult `node_modules/next/dist/docs/` before each Next API use |
