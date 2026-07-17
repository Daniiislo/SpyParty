# Spy Party full game — task checklist

Ordered by dependency; each task leaves the app buildable. Commands run from
`spy-party/`. Spec: [../docs/specs/spy-party-game.md](../docs/specs/spy-party-game.md).
**Gated:** stop for review at each ▶ checkpoint.

---

## Phase 0 — Spec commit (no code)
- [x] Write `docs/specs/spy-party-game.md`, `tasks/plan.md`, `tasks/todo.md`.
- [ ] Update `docs/GAME_CONCEPT.md` §8 open questions with locked decisions.

## Phase 1 — Offline pass-and-play MVP (single round, civilian + spy)
- [ ] **Engine** `src/lib/game/{types,rng,deal,rules}.ts` — pure, deterministic
      (seeded RNG, role/word dealing, single-round vote tally + tie-break +
      win check). No React/Next/Prisma imports.
  - Verify: `npm test` (engine specs green).
- [ ] **Engine tests** `src/lib/game/*.test.ts` — rng determinism, deal counts +
      validation, voting majority/abstain/tie, win check.
- [ ] **Word bank** `src/lib/game/word-bank.ts` — small bilingual (VI/EN) starter
      set of topics + `{civilian, spy}` pairs (DB-backed in Phase 2).
- [ ] **i18n** add namespaces `common`, `modeSelect`, `offline`, `game` to
      `messages/vi.json` + `messages/en.json` (keep parity — test enforces it).
  - Verify: `npm test` parity test green.
- [ ] **shadcn primitives** (ask-first): `input label card badge dialog sonner`.
- [ ] **Components** `src/components/`: `dossier-card`, `phase-banner`,
      `handoff-gate`, `player-count-stepper`, `spy-count-stepper`; EDIT
      `dossier-reveal.tsx` (gameplay props + `prefers-reduced-motion` fix, keep
      demo defaults so existing test passes).
- [ ] **Routes** `src/app/[locale]/(play)/offline/page.tsx` (setup) +
      `offline/play/page.tsx` (client phase-machine: deal → per-player handoff
      reveal → describe → vote → elimination → verdict); wire the landing offline
      CTA (`Button asChild` + `Link` from `@/i18n/navigation`).
- [ ] **Verify (▶ Checkpoint 1):** from `/vi`, 4 players + 1 spy + topic → deal →
      each player privately decrypts a distinct word (spy differs, crimson) →
      describe in person → vote → elimination reveals role → correct verdict.
      Works at 360/768/1280 and in `/en`. `npm test`, `npm run lint`,
      `npx tsc --noEmit`, `npm run build` all green. **Stop for review.**

## Phase 2 — Data layer (word pairs from Postgres, read-only)
- [ ] `prisma/schema.prisma` Topic + WordPair (`@@schema("spy_party")`) + migration.
- [ ] `prisma/seed.ts` + `prisma.config.ts` `migrations.seed` (add `tsx` dep).
- [ ] Read-only `getWordPair` server action; `topic-picker`; offline reads DB.
- [ ] **▶ Checkpoint 2:** DB topics list per-locale; a match uses a real pair; no
      writes during play; seed reproducible. **Stop for review.**

## Phase 3 — Online realtime rooms MVP
- [ ] Chrome refactor → `(marketing)`/`(play)` route groups.
- [ ] `create` (Clerk-gated), `join[/[code]]`, `room/[code]/{page,loading,error,not-found}`.
- [ ] `src/lib/supabase/{client,server}`, `use-room-channel`, guest-session cookie.
- [ ] Server actions `createRoom/joinRoom/startMatch/submitClue/castVote/eliminate`.
- [ ] Prisma Room/Player/Match/MatchPlayer/Round/Vote; `proxy.ts` host gate.
- [ ] Add `@supabase/supabase-js` + shadcn `input-otp/avatar/skeleton/separator`;
      Supabase env vars; rewire landing Create/Join.
- [ ] **▶ Checkpoint 3:** host creates room; guest joins by code+name; live lobby +
      presence; synced deal/describe/vote/elimination across two devices; refresh
      rejoins at current phase. **Stop for review.**

## Phase 4 — Advanced (sub-slices, both modes)
- [ ] 4a Timer: `timer-ring` + `use-countdown` + `Turn.deadlineAt` + watchdog/cron.
- [ ] 4b Multi-round: loop to a win condition; round-end standings.
- [ ] 4c Mr. White: third role; neutral reveal; end-of-match steal.
- [ ] 4d Leaderboard/history: `leaderboard` + `match/[id]` + points aggregation.
- [ ] **▶ Checkpoint 4:** each sub-slice verified in the browser. **Final review.**
