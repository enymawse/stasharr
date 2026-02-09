# AGENTS.md

This document is a quick, practical guide for agentic coding assistants working in this repository. It summarizes how the project is structured, where to make changes, how to validate them, and how to ship them safely with the repo’s conventions and tooling.

## Project Snapshot

- Type: Browser extension (Chrome + Firefox) that augments StashDB and integrates with Whisparr v3+ and Stash
- Framework: TypeScript (content scripts + background services)
- Build: esbuild via `scripts/*.mjs`
- Styles: Inline CSS in content/option UIs
- Quality: ESLint + Prettier + Husky + commitlint (Conventional Commits)
- Package manager: npm

Key value props:

- One‑click scene actions (add/search/exclude/monitor)
- Scene card status indicators and quick navigation
- Background-only networking via typed runtime messaging

## Common Commands

Run from repo root:

- Install deps: `npm ci`
- Build: `npm run build`
- Package zips: `npm run pack:chrome` / `npm run pack:firefox`
- Typecheck: `npm run lint`
- Bundle safety: `npm run tripwire`

Husky + commitlint enforce Conventional Commits and body line length in commit messages.

## Codebase Map (where to change what)

- Content UI + observers: `src/content/content.ts`
  - Scene card augmentation and scene page extension panel
  - Runtime messaging to background (no networking)
- UI helpers: `src/content/ui/*`
  - Buttons, icons, status indicator overlays
- Options UI: `src/content/options.ts` + `src/content/options.html`
  - Settings form + validation via background messages
- Background entrypoints:
  - Chrome: `src/background/background.ts`
  - Firefox: `src/background/background-firefox.ts`
- Background services:
  - Whisparr: `src/background/services/whisparr.ts`
  - Stash: `src/background/services/stash.ts`
- Shared contracts: `src/shared/messages.ts`, `src/shared/storage.ts`, `src/shared/navigation.ts`

## Patterns and Conventions

Coding

- Keep changes minimal and targeted; prefer surgical edits over large refactors
- Follow existing style and component organization
- No networking in content or options; background only
- Keep messaging payloads stable; avoid changing error strings

Commits & PRs

- Conventional commits required; keep body lines ≤ 100 chars
- Group commits by logical change:
  - `feat(stashdb): add getSceneById …`
  - `feat(actions,ui): … modal feedback …`
  - `fix(ui): … empty-state …`
  - `chore(lint): … ts-expect-error …`
- Use GitHub CLI for PRs: `gh pr create --base main --head <branch> --title "feat(...): ..."`

## Typical Agent Flows

Add or change a scene card action

1. Update `src/content/content.ts` to render UI and send a new message
2. Add request/response types in `src/shared/messages.ts`
3. Handle the message in `src/background/services/whisparr.ts`
4. Update status/state handling in content once response returns

Add or change settings behavior

1. Update `src/content/options.ts` + `src/content/options.html`
2. Extend `src/shared/storage.ts` for new settings
3. Validate/enforce in background service handlers

## Validation Checklist

- `npm run lint` passes (typecheck)
- No stray `@ts-ignore` (use `@ts-expect-error` with rationale when needed)
- Commit messages follow Conventional Commits and commitlint constraints

## Dev Setup (for local manual testing)

1. `npm run build` from repo root
2. Load unpacked extension from `dist/chrome` (Chrome) or temporary add-on from `dist/firefox` (Firefox)
3. Reload StashDB; iterate on scene card and scene page behaviors

## Notes for Sandboxed Agents

- Use fast file/text search: `rg`
- Read files in ≤ 250‑line chunks to avoid truncation
- Edit files via `apply_patch` only
- Prefer not to install new tools unless necessary
- Pushing branches / making PRs is supported via `gh` CLI when credentials exist
