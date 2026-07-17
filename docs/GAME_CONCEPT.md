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
- _(TBD — possible future role)_ **Mr. White / blank**: receives no word and must
  infer it from others' descriptions.

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

## 7. Win conditions (current description)

- Eliminate a spy **AND** no spies remain → **civilians WIN**.
- Otherwise → **civilians LOSE**.

> _(TBD)_ Standard multi-round variant: keep playing until all spies are found
> (civilians win) **or** spies reach parity with civilians (spies win); a spy may
> claw back by correctly guessing the civilian word.

## 8. Open questions / to decide

- Realtime stack for online rooms (self-hosted WebSocket? Pusher/Ably? Supabase
  Realtime?).
- **Tie-break** handling on votes.
- Include a **Mr. White** role?
- Scoring across matches / a **leaderboard**?
- Per-turn **timer**?
- Source of the **word-pair** data: hand-authored / AI-generated / existing DB?
- Persistence (which DB? rooms & match history).

## 9. Related docs

- [DESIGN_SYSTEM.md](./DESIGN_SYSTEM.md) — UI/UX style and direction.
