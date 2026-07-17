# Spy Party — Project Overview

> **Living document.** Update it whenever a decision is made. This is the primary
> product-context source for Claude Code sessions.
>
> **Naming:** the project's name is **Spy Party**. "Ai Là Gián Điệp" (Who Is the
> Spy) is only the Vietnamese descriptive tagline — not the brand. Use "Spy
> Party" in all wordmarks, titles, and metadata; keep the Vietnamese tagline
> where it helps players. Everything else in docs is in English.

## 1. Summary

A social/party web game in the **"Who is the spy"** genre (similar to *谁是卧底 /
Undercover*). Players sign in → create/join a room → receive a secret word →
describe it turn by turn → vote to eliminate the spy.

## 2. Tech stack

Technical details live in [CLAUDE.md](../CLAUDE.md). In short:

- **Next.js 16** (App Router), **React 19.2**, TypeScript strict
- Auth: **Clerk**
- UI: **shadcn/ui** (`radix-nova` style) + **Tailwind CSS v4** (CSS-first)
- Icons: `lucide-react`

## 3. Player roles

- **Civilian** — receives the "civilian word".
- **Spy / Undercover** — receives the "spy word", which is *similar* to the
  civilian word to create ambiguity.
- **Mr. White / blank** *(in v1)*: receives no word and must infer it from others'
  descriptions; if eliminated, may **steal the win** by correctly guessing the
  civilian word.

## 4. Room types

- **Online:** players interact/chat in real time on the web → needs realtime.
- **Offline (pass-and-play):** the app only deals each player their word; players
  describe and vote in person. The app acts purely as the "card dealer".

## 5. Match setup (configured by the host)

- Number of players
- Number of spies
- A chosen **theme/topic**
- → The app randomly deals the **civilian word** to civilians and the **spy word**
  to spies.

**Data requirement:** a **word-pair bank per topic** — each pair is
`{ civilianWord, spyWord }`, close enough to be confusable but still distinct
(e.g. "Coffee" vs "Milk tea", "Tiger" vs "Leopard").

## 6. Game flow (rounds / turns)

1. **Deal words** → each player views their own secret word (with a reveal
   animation).
2. **Describe in turns** → players take turns giving ONE descriptive word/phrase
   for their own word (without saying the word directly).
3. After a full describe round → everyone **votes** for the suspected spy.
4. The most-voted player is **eliminated**.
5. Check win/loss → continue or end.

## 7. Win conditions (v1 — multi-round)

Play continues round by round until one side wins:

- **Civilians win** when no spies and no Mr. White remain alive.
- **Spies (impostors) win** at **parity** — `aliveNonCivilians >= aliveCivilians` —
  or when `maxRounds` is exhausted with an impostor still alive (they evaded
  detection).
- **Mr. White steal:** if Mr. White is eliminated, a short guess sub-phase lets them
  win outright by guessing the civilian word (diacritic-folded compare) — a correct
  steal overrides a civilian win.
- **Tie-break on votes:** one sudden-death revote among the tied candidates; if it is
  still tied, no elimination that round.

## 8. Decisions (v1) & remaining open questions

**Decided** — full detail in [specs/spy-party-game.md](./specs/spy-party-game.md):

- **Realtime + DB:** **Supabase** — Postgres is the source of truth (via Prisma);
  Realtime is a broadcast + presence bus (**not** Postgres Changes).
- **Word-pair data:** stored in **Postgres** (Prisma `WordPair`, bilingual VI/EN),
  seeded; a small in-repo bank bootstraps the offline MVP before the schema lands.
- **Mr. White**, **per-turn timer**, **multi-round**, and **leaderboard/history**:
  all **in v1**.
- **Tie-break:** sudden-death revote → no elimination if still tied.
- **Identity:** host is a signed-in Clerk user; participants join by name + room code
  (guest, no account).

**Still open (deferred, non-blocking):** guest→account linking; host-disconnect
migration / co-host; late-join-as-spectator (v1 rejects after start); join-code
recycling; stale-room GC; separate Supabase project for preview/dev; public vs
secret ballot display.

## 9. Related docs

- [DESIGN_SYSTEM.md](./DESIGN_SYSTEM.md) — UI/UX style and direction.
