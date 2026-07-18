# Changelog

All notable changes to **Spy Party** (*Ai Là Gián Điệp*) are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.2] — 2026-07-18

Lobby/gameplay bug fixes and UX polish.

### Fixed
- **Lobby topic name** now resolves from the database, so newly added topics
  (e.g. "Công nghệ") display their name instead of "—" — in the config panel
  (host and guests) and on the reveal card.
- **Leaving via Home after a match** now removes a guest from the room, so the
  host no longer sees a player who has already left (`leaveRoom` works in
  `COMPLETED`, not only `LOBBY`).

### Changed
- **Removed the start-of-match "Mission Briefing" intro** — it flashed and
  overlapped the game UI.
- **No loading overlay for background actions.** Viewing your word and the timer
  watchdogs refresh state silently; the overlay is reserved for user-initiated,
  UI-changing submits.
- **Clearer ready-state copy:** the dealing footer shows "Mọi người đã sẵn sàng
  — chờ chủ phòng bắt đầu" once everyone has viewed, instead of always showing
  "Đang chờ mọi người xem từ".
- **Enter submits** the create (host name) and join (code / name) forms.
- **Action buttons hug their content** instead of pinning to the bottom with a
  gap; the page scrolls as content grows.
- Dropped two noisy hints (the "two similar words" reveal note and the "stay in
  the room" result note).

## [1.1.1] — 2026-07-18

UX simplification and performance fixes.

### Changed
- **Blind mode is now the default.** Each player's role (spy vs civilian) is
  hidden until match end; revealing roles is an opt-in **"Hiện vai trò"** switch
  in the create form and lobby config. Mr. White is only selectable once roles
  are revealed (still mutually exclusive with blind).
- **Simpler deal flow.** Viewing (decoding) your word now marks you ready — the
  separate "Tôi đã nhớ rồi" confirmation step was removed. The host starts once
  everyone has viewed, for both online (start describing) and offline (reveal
  roles); both transitions are now also enforced server-side.

### Fixed
- The mission-briefing intro no longer covers or blocks the game UI: it stops
  capturing taps while fading out, sits on its own layer, and is shorter (~1.2s).
- The "Đang tải…" action overlay no longer lingers after the background is
  already visible — a short show-delay skips it for fast actions and it clears
  the instant the action resolves.

### Performance
- Every room action is now a single server round-trip instead of two: mutations
  return the fresh post-mutation view, which the acting client applies directly
  (other clients still reconcile via the realtime broadcast).
- Reads share one room load + one Clerk auth (`getRoomView`) instead of
  duplicating the heavy query and auth per refetch; the room page loads its data
  in parallel; a composite `(roomId, createdAt)` index serves the latest-match
  read; and match-end scoring writes are batched into one transaction.

## [1.1.0] — 2026-07-17

Gameplay and UX refinements on top of the first release.

### Added
- **Blind mode** — an optional room setting where nobody is told their role
  (spy vs civilian) until the match ends; the server never sends a player their
  role while blind, so it can't be inspected. Mutually exclusive with Mr. White
  (blind mode auto-disables it, with an in-app explanation).
- **Voting timer** — the voting phase now has a fixed 30-second countdown; the
  round resolves early once everyone has voted, or on expiry (missing ballots
  count as abstain).
- **Always-visible room config** — the room setup (topic, spies, Mr. White,
  blind mode, timer, rounds, max players) is shown to everyone in the lobby; the
  host edits it inline and changes broadcast live. The separate settings page
  was removed.
- **Mission briefing** — a short cinematic intro plays when a match starts,
  distinct from the lobby; the deal/reveal screen was given more polish.
- **Action-loading overlay** — a light overlay gives immediate feedback while a
  button's server round-trip is in flight.

### Changed
- The create-room form hides online-only fields (per-turn timer, describe
  rounds) when the offline (deal-only) mode is selected.
- Topics render dynamically from the database (the curated set), with
  deterministic ordering.

### Fixed
- Topic picker ordering is now stable (`sortOrder` normalized to unique,
  sequential values via migration); dealing always uses the DB's word pairs for
  the selected topic and never falls back to an unrelated topic.
- `prisma db seed` is now non-destructive (runs only when the topic table is
  empty), so it can't clobber the imported word bank.

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

[1.1.2]: https://github.com/Daniiislo/SpyParty/releases/tag/v1.1.2
[1.1.1]: https://github.com/Daniiislo/SpyParty/releases/tag/v1.1.1
[1.1.0]: https://github.com/Daniiislo/SpyParty/releases/tag/v1.1.0
[1.0.0]: https://github.com/Daniiislo/SpyParty/releases/tag/v1.0.0
