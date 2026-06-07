# Design System — "Hồ Sơ Mật" / Classified Dossier

> **Living document** for the UI/UX style and direction. All new UI must follow
> it. Related: [GAME_CONCEPT.md](./GAME_CONCEPT.md), [CLAUDE.md](../CLAUDE.md).
>
> **Status: LOCKED & APPLIED** — *Classified Dossier* concept · **dark-first**
> (light mode available) · **amber** primary · **crimson** alert. Tokens and
> helpers are live in [globals.css](../spy-party/src/app/globals.css); a demo
> homepage applies them ([page.tsx](../spy-party/src/app/page.tsx),
> [layout.tsx](../spy-party/src/app/layout.tsx),
> [dossier-reveal.tsx](../spy-party/src/components/dossier-reveal.tsx)).

## 1. Concept

The UI reads like a **high-end intelligence tool**: a dark briefing-room
backdrop, player cards styled as **agent dossiers**, and secret words shown as
**redacted bars (████)** until they are "decrypted". Modern, elegant,
professional — the "spy game" flavor comes from **motifs + motion**, not from
loud colors.

## 2. Three core principles

1. **Dark-first.** Dark is the default; light mode is polished but secondary.
2. **Disciplined palette.** One accent (amber) + one **alert** color (crimson)
   reserved for tense moments (voting, elimination, spy reveal). Elegance comes
   from restraint.
3. **Spy flavor via motifs & motion**, never via garish color.

## 3. Color tokens

Mapped onto the existing shadcn variables in
[globals.css](../spy-party/src/app/globals.css). The oklch values below are the
**currently applied** ones — tune by eye and check WCAG contrast (especially text
on amber/crimson).

### 3.1. Semantic roles

| Role | Color | Used for |
|---|---|---|
| **Primary (amber)** | gold/amber | primary CTAs, brand, focus ring, agent highlight |
| **Destructive / Alert (crimson)** | red | dangerous actions, voting/elimination, **spy reveal** |
| **Background / Card** | warm charcoal | base & dossier-card surfaces |
| **Muted** | warm gray | secondary text, metadata, "waiting…" |

> Convention: **amber = brand/positive action**, **crimson = danger/drama**. Do
> not use crimson for ordinary buttons — keep its weight for spy moments.

### 3.2. Dark mode (default — `.dark`)

```css
--background: oklch(0.16 0.006 75);        /* warm charcoal */
--foreground: oklch(0.94 0.008 80);        /* warm off-white */
--card: oklch(0.21 0.006 75);
--primary: oklch(0.8 0.13 85);             /* amber / gold */
--primary-foreground: oklch(0.18 0.02 80); /* dark text on amber */
--muted-foreground: oklch(0.7 0.01 80);
--destructive: oklch(0.62 0.21 22);        /* crimson */
--border: oklch(1 0 0 / 10%);
--ring: oklch(0.8 0.13 85);                /* focus = amber */
```

### 3.3. Light mode (secondary — `:root`)

```css
--background: oklch(0.98 0.004 85);        /* warm off-white */
--foreground: oklch(0.2 0.006 75);
--primary: oklch(0.68 0.12 78);            /* darker amber for contrast */
--destructive: oklch(0.58 0.22 25);
```

> See globals.css for the full token set (`--secondary`, `--accent`, `--popover`,
> `--chart-*`, `--sidebar-*`, etc.). `--radius` stays at `0.625rem`.

## 4. Typography

Reuse the **already-installed** fonts — do not add new ones.

- **Geist (sans):** all UI, headings, body. Modern, clean, professional.
- **Geist Mono:** the "agent" texture → codenames, countdowns, room codes,
  `> decrypting…` lines, redacted text, `CLASSIFIED` labels. Use deliberately for
  accent, never everywhere.

> ✅ **Wiring fixed.** `@theme` now sets `--font-sans: var(--font-geist-sans)` and
> the Next-font CSS variables live on `<html>` (in
> [layout.tsx](../spy-party/src/app/layout.tsx)), so `font-sans` resolves
> correctly. Use the `.text-classified` helper for the mono/uppercase/wide-tracked
> label style.

## 5. Iconography

`lucide-react`. Preferred "spy-flavored" set (all verified available in v1.17):
`VenetianMask`, `Fingerprint`, `Search`, `Eye` / `EyeOff`, `ShieldAlert`,
`Lock` / `LockOpen`, `Radar`, `ScanFace`, `FileLock2`, `Vote`, `ScrollText`,
`UserRound` / `UsersRound`. Default icons inherit `currentColor`; use amber for
brand icons.

## 6. Motif & motion helpers (implemented in globals.css)

Reusable CSS helpers — prefer these over ad-hoc arbitrary values:

| Class | Effect |
|---|---|
| `.text-classified` | Geist Mono, uppercase, `0.16em` tracking — labels/eyebrows/codenames |
| `.bg-blueprint` | faint engineering-grid backdrop (hero/lobby surfaces) |
| `.glow-hero` | soft radial amber glow (full-bleed overlay) |
| `.glow-amber-tr` / `.glow-crimson-tr` | corner glow for civilian / spy cards |
| `.animate-glow-pulse` | amber box-shadow pulse (active civilian state) |
| `.animate-alert-pulse` | crimson box-shadow pulse (spy reveal / danger) |
| `.animate-scanline` | thin line sweeping a card top→bottom |

- The interactive **decrypt/scramble** reveal lives in JS
  ([dossier-reveal.tsx](../spy-party/src/components/dossier-reveal.tsx)): redacted
  ████ → character scramble → settles on the real word, colored amber (civilian)
  or crimson (spy).
- All animations are disabled under `prefers-reduced-motion: reduce`.
- **React Compiler is on** → do NOT add manual `useMemo`/`useCallback`/`memo`.
- `tw-animate-css` is available for additional enter/exit animations.

### Motif vocabulary (build these over time)

Redacted bars ████ · agent dossier cards (`CODENAME / STATUS / action`) ·
`CLASSIFIED` / `TOP SECRET` stamps · monospace codenames · blueprint/grid +
subtle noise backdrops.

## 7. Component conventions (shadcn radix-nova)

- Keep the `radix-nova` style and current radius (`--radius: 0.625rem`).
- Import primitives from the unified `radix-ui` package
  (`import { Slot } from "radix-ui"`), **not** individual `@radix-ui/react-*`.
- Components are plain functions tagged with `data-slot` / `data-variant` /
  `data-size`, styled via `class-variance-authority`; merge classes with `cn()`
  from [utils.ts](../spy-party/src/lib/utils.ts).
- Primary cards: thin `border-border` + subtle amber `ring`/glow when active.
- Add new components via the shadcn CLI (registry `radix-nova`) into
  `src/components/ui/`.

## 8. Where it lives

- Tokens, helpers, keyframes → [globals.css](../spy-party/src/app/globals.css)
- App shell / header / dark-first `<html>` → [layout.tsx](../spy-party/src/app/layout.tsx)
- Demo homepage → [page.tsx](../spy-party/src/app/page.tsx)
- Interactive reveal demo → [dossier-reveal.tsx](../spy-party/src/components/dossier-reveal.tsx)

## 9. Status

- ✅ Done: concept locked; dark-first; amber/crimson tokens applied; `--font-sans`
  wiring fixed; motif/motion helpers added; demo homepage built and building
  cleanly.
- ⬜ Open: light-mode visual QA & contrast pass; theme toggle (light/dark); a
  logo/wordmark asset; real word-pair data; reusable dossier-card primitive;
  Clerk modal dark theming (`@clerk/themes`).
