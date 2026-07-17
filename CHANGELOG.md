# Changelog

All notable changes to **Spy Party** (*Ai Là Gián Điệp*) are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] — 2026-07-17

First production release: a complete, bilingual "who is the spy" social-deduction
word game playable end-to-end in both offline and online modes.

### Added

#### Gameplay — pure engine
- Deterministic, framework-agnostic game engine (`src/lib/game/`) with a seeded
  RNG (mulberry32 + Fisher–Yates), word dealing, turn order, vote tally, win
  conditions, Mr. White steal, and scoring — fully unit-tested (Vitest).
- **Roles:** Civilian, Spy (similar-but-different word), and **Mr. White** (no
  word; can steal the win by guessing the civilian word when eliminated).
- **Win logic:** civilians win when no impostors remain; impostors win at parity;
  a tie in voting triggers a single sudden-death revote, then no elimination.
- **Scoring & leaderboard:** per-match points (win / participation / survival /
  correct spy-vote / Mr. White steal) aggregated into a lifetime leaderboard and
  per-match history.

#### Offline mode — networked "deal-only" room
- A host opens a room and configures players, impostors, Mr. White, topic, and
  locale; the app deals each player a private word. Describe & vote happen in
  person; the host reveals roles to end the round.

#### Online mode — realtime rooms
- Quizizz-style flow: a signed-in host creates a room with a short code; guests
  join by name + code (no account needed).
- Live lobby with presence, a synchronized **turn-based describe** flow
  (deal → per-player ready-gate → host start → sequential per-turn clues across
  N configurable describe-rounds), then a vote, elimination, and multi-round play
  until a win condition.
- **Per-turn timer** (10 / 15 / 20s), server-authoritative via an absolute
  deadline, with a client watchdog that advances expired turns.
- **Voting** in a closable dialog (clues stay visible), with live "who has voted"
  markers and a "who voted for whom" breakdown.
- **Room lifecycle:** host settings page, stay-in-room after a match, host
  "disband room", and post-match navigation (play again / return to room / home).
- Full per-player clue history shown across rounds.

#### Platform & UX
- **Bilingual (VI default / EN)** via next-intl with URL-prefixed locales and an
  enforced message-catalog parity test.
- **"Classified Dossier" design system** — dark-first, amber/crimson tokens
  (oklch), Geist Mono for codes/words/timers, blueprint grid, radar/scanline
  motifs, and a themed loading screen. Mobile-first, responsive at 360/768/1280,
  and reduced-motion aware.
- **Authentication:** Clerk for hosts; opaque, SHA-256-hashed guest session
  cookies for participants.
- **Data:** Prisma 7 + Postgres (Supabase) as the single source of truth, with a
  bilingual seeded word bank; Supabase Realtime used as a secret-free broadcast
  bus (not Postgres Changes).

### Security
- All host server actions independently re-verify `auth()` **and** ownership
  (`room.hostUserId === userId`) — an IDOR guard beyond the optimistic route gate.
- Secret words never travel over realtime broadcast; each player fetches only
  their own dealt card from the server.
- Guest identity is a random token stored **hashed** at rest; server-revocable.
- No server secret is ever exposed behind a `NEXT_PUBLIC_` prefix.

### Infrastructure
- CI (GitHub Actions) runs lint → build → typecheck → tests on every PR to
  `dev`/`main`.
- Deployed on Vercel (`spy-party-vn`); `main` auto-deploys production.

[1.0.0]: https://github.com/Daniiislo/SpyParty/releases/tag/v1.0.0
