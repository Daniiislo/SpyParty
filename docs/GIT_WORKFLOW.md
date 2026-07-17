# Git & GitHub Workflow

> Conventions for commits, branches, and pull requests. Follow this for every
> change. Written in English (see repo docs convention). Related:
> [CLAUDE.md](../CLAUDE.md).

## 1. Branching model

| Branch          | Role                                                                                               |
| --------------- | -------------------------------------------------------------------------------------------------- |
| `main`          | Production / stable. Updated only via PR, typically from `dev` at release time. Tag releases here. |
| `dev`           | Integration branch and the **default base for PRs**. All feature work lands here first.            |
| `<type>/<desc>` | Short-lived working branches, created **off `dev`**.                                               |

- Working-branch names: `<type>/<short-kebab-description>`, where `type` ∈
  `feature`, `fix`, `hotfix`, `chore`, `docs`, `refactor`, `test`, `ci`.
  - e.g. `feature/room-creation`, `fix/vote-tie-break`, `docs/git-workflow`.
- Branch off the latest `dev`; sync regularly (rebase or merge `dev` in) to keep
  conflicts small. Keep branches short-lived.
- **Never** commit directly to `dev` or `main`, and **never force-push** shared
  branches (`dev`/`main`).

## 2. Commits — Conventional Commits

Format:

```
<type>(<optional scope>): <subject>

<optional body — what & why, wrapped ~72 cols>

<optional footer(s)>
```

- **Types:** `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`,
  `build`, `ci`, `chore`, `revert`.
- **Scope** (optional): the area touched, lower-kebab — e.g. `auth`, `homepage`,
  `design-system`, `rooms`, `deps`.
- **Subject:** imperative present tense ("add", not "added"/"adds"), no trailing
  period, ≤ ~72 chars, **English**.
- **Body** (optional): the _what_ and _why_, not the _how_.
- **Footer:**
  - Breaking change: a `!` after type/scope (`feat(api)!: …`) **and/or** a
    `BREAKING CHANGE: <description>` line.
  - Issue refs: `Closes #12`, `Refs #34`.
  - Claude-authored commits end with a `Co-Authored-By: Claude …` trailer.

Good examples:

```
feat(rooms): deal civilian/spy words for offline rooms
fix(vote): resolve tie by triggering a revote
docs: add git workflow guide
refactor(design-system): extract reusable dossier card
chore(deps): bump next to 16.2.7
```

## 3. Atomic commits — split by concern

- **One logical change per commit.** If the working tree mixes unrelated work
  (e.g. a bug fix + a new feature + reformatting), split it into separate
  commits so each is easy to review, revert, and cherry-pick.
- Stage selectively by path (`git add <path>`) or by hunk (`git add -p`) to
  build each commit.
- Don't bundle a refactor with a behavior change — commit the refactor
  separately.
- Aim for each commit to lint/build clean on its own.

> Harness note: interactive Git (`git add -i`, `git rebase -i`) is not available
> in this environment — stage by path or patch instead.

## 4. Pull requests

- **Base branch: `dev`** by default. Only target `main` for releases or
  hotfixes — and state that explicitly in the PR.
- **Title:** a single, clear Conventional-Commit-style line that summarizes the
  **entire** PR — e.g. `feat: landing page and Clerk authentication`. It is the
  TL;DR of everything being merged, not a vague label.
- **Description:** professional and structured — use the template in
  [`.github/pull_request_template.md`](../.github/pull_request_template.md):
  - **Summary** — what & why (1–3 sentences).
  - **Changes** — grouped bullet list of notable changes.
  - **Impact** — user-facing/behavioral effects, performance, data/migrations,
    risk areas.
  - **Type of change** — feat / fix / docs / …
  - **How to test / Verification** — exact steps and the commands you ran
    (lint / typecheck / build) plus what you observed.
  - **Screenshots / recordings** — for any UI change (before/after).
  - **Breaking changes** — describe, or "None".
  - **Related** — `Closes #…`, tickets.
  - **Checklist** + **Follow-ups / Notes** — known gaps, deferred work.
- Keep PRs **focused and small**; prefer several small PRs over one giant PR.
- Open as a **Draft** while WIP; mark ready only after self-review + green checks.
- PR bodies generated via Claude Code end with the "Generated with Claude Code"
  footer.

## 5. Pre-flight (before opening a PR)

Run from `spy-party/` and make sure all pass:

```
npm run lint
npx tsc --noEmit
npm run build
```

(No test suite exists yet; add `npm test` here once it does.) Self-review the
full diff. Confirm no secrets (`.env*`), keys, or debug code are committed.

## 6. Review & merge

- ≥ 1 approval before merge (once there are other collaborators); resolve all
  conversations; CI must be green.
- **Merge into `dev`: squash-merge (recommended)** so each PR becomes one clean,
  conventional commit on `dev` — readable history, changelog-friendly. (If a
  branch already has a clean, meaningful commit history, a merge commit is fine.
  Pick one approach and stay consistent.)
- **Delete the branch** after merge.
- **`dev → main`:** via a release PR; preserve history with a merge commit and
  tag the release on `main` using SemVer (`vX.Y.Z`).

## 7. Recommended additions (professional polish)

- **PR template** — `.github/pull_request_template.md` (added; auto-loads in new
  PRs).
- **Default base branch** — set the GitHub repo's default branch to `dev` so new
  PRs target it automatically.
- **CI on PRs** — GitHub Actions running lint + typecheck + build (snippet
  below). Ask to enable it as a real workflow file.
- **Branch protection** on `main` and `dev` — require a PR, require status checks
  (CI) to pass, require up-to-date branches, disallow force-push.
- **Labels** — `type:feat|fix|…`, `area:auth|rooms|ui`, `status:wip|needs-review`.
- **CODEOWNERS** — auto-request reviewers once the team grows.
- **Conventional commits → automation later** — enables auto-changelog and
  SemVer bumps (e.g. release-please / changesets) when ready.
- _(Optional)_ **commitlint + husky** (or a `commit-msg` hook) to enforce
  Conventional Commits locally.

### CI snippet — save as `.github/workflows/ci.yml`

> Note: the app lives in `spy-party/`, hence `working-directory: spy-party`.
