# AGENTS.md

This document is a quick, practical guide for agentic coding assistants working in this repository. It summarizes how the project is structured, where to make changes, how to validate them, and how to ship them safely with the repo’s conventions and tooling.

## Project Snapshot

- Type: Browser userscript that augments StashDB and integrates with Whisparr v3+
- Framework: SolidJS + TypeScript
- Build: Webpack (webpack-userscript)
- Styles: SCSS + Bootstrap
- Quality: ESLint + Prettier + Husky + commitlint (Conventional Commits)
- Package manager: npm

Key value props:

- One‑click scene actions and bulk actions
- Progress modal for bulk feedback (noisy toasts avoided in bulk flows)
- Service layer separation for StashDB/Whisparr calls

## Common Commands

- Install deps: `npm ci`
- Dev server (proxy userscript): `npm run dev`
- Build production userscript: `npm run build`
- Lint + autofix: `npm run lint`
- Conventional commit helper: `npm run cm`

Husky + commitlint enforce Conventional Commits and body line length in commit messages.

## Codebase Map (where to change what)

- UI entry (bulk actions): `src/components/BulkActionDropdown.tsx`

  - Owns the Stasharr Actions dropdown and confirmation modals
  - Starts/updates bulk progress via FeedbackService
  - Uses StashDBService for titles and SceneService for work

- Progress UI: `src/components/ProgressModal.tsx`

  - Renders overall progress, item statuses, skipped info, and empty-state infoMessage

- Feedback + operations state: `src/service/FeedbackService.ts`

  - Global state source for ProgressModal
  - Methods returned by `startBulkOperation`: `updateItem`, `addItems`, `removeItem`, `updateItemName(s)`, `setSkippedInfo`, `setInfo`, `complete`
  - Button state helpers: `startButtonOperation`, `completeButtonOperation`

- Scene domain logic: `src/service/SceneService.ts`

  - Lookup/add/search flows
  - Bulk orchestration helpers (`lookupAndAddAll`, `triggerWhisparrSearchAll`, `addAllMissingScenes`)
  - Accepts `{ suppressToasts?: boolean }` where appropriate to keep bulk UX clean

- Comparison logic: `src/service/SceneComparisonService.ts`

  - Cross-checks StashDB vs. Whisparr and computes missing scenes
  - Supports `suppressToasts` in bulk flows

- StashDB GraphQL: `src/service/StashDBService.ts`

  - `getSceneById(id)` via GraphQL `findScene`
  - `getSceneTitlesByIds(ids)` resolves titles by ID (no text “OR” search)
  - All queries support `suppressToasts`

- Whisparr REST: `src/service/WhisparrService.ts`
  - `getAllScenes`, `command`, profiles, etc. (`suppressToasts` supported in bulk)

## Patterns and Conventions

Coding

- Keep changes minimal and targeted; prefer surgical edits over large refactors
- Follow existing style and component organization
- Avoid introducing new global state—extend FeedbackService if you need bulk UI changes
- Prefer in-place updates (e.g., update item names by ID) instead of remove+add cycles

UX rules of thumb

- Bulk operations use the Progress Modal for all detailed feedback
- Use `setSkippedInfo(count, "already in Whisparr")` to summarize skips
- For “nothing to do” cases, start a bulk op with no items and set `setInfo("No scenes available …")` then `complete()`; do not add dummy “success” items
- Titles shown in progress should be Scene Titles (via StashDB by ID), not hashes

Toasts

- Bulk flows: avoid toasts; rely on the modal and per‑item messages
- Non-bulk flows: toasts are fine for quick feedback

Commits & PRs

- Conventional commits required; keep body lines ≤ 100 chars
- Group commits by logical change:
  - `feat(stashdb): add getSceneById …`
  - `feat(actions,ui): … modal feedback …`
  - `fix(ui): … empty-state …`
  - `chore(lint): … ts-expect-error …`
- Use GitHub CLI for PRs: `gh pr create --base main --head <branch> --title "feat(...): ..."`

## Typical Agent Flows

Add/improve a bulk action

1. Update `BulkActionDropdown.tsx` to collect scene IDs and open a bulk operation
2. If you need more progress data, add methods/fields in `FeedbackService`
3. Use `StashDBService.getSceneById` or `getSceneTitlesByIds` to show titles
4. Call into `SceneService` for the behavior (lookup/add/search)
5. Ensure skipped info and empty-state are handled; keep toasts suppressed

Display/UX change for bulk progress

1. Adjust `ProgressModal.tsx` (e.g., sections guarded by item count)
2. Pass any new props from `SceneList.tsx` reading FeedbackService state
3. Extend `FeedbackService` to expose new state/methods

Service/API work

1. Implement in `StashDBService` or `WhisparrService`
2. Return typed data; catch and log errors; use `suppressToasts` where caller is bulk
3. Thread options through upstream services that call you

## Validation Checklist

- `npm run lint` passes (eslint + prettier)
- No stray `@ts-ignore` (use `@ts-expect-error` with rationale when needed)
- Commit messages follow Conventional Commits and commitlint constraints
- Bulk UI:
  - Progress shows titles, per-item statuses
  - Skipped info says “already in Whisparr”
  - Empty-state shows info, not “1/1 succeeded”

## Dev Setup (for local manual testing)

1. `npm run dev` (webpack dev server)
2. Install `http://localhost:8080/stasharr.dev.proxy.user.js` in Tampermonkey/Violentmonkey
3. Reload StashDB; iteratively test bulk actions and UI

## Notes for Sandboxed Agents

- Use fast file/text search: `rg`
- Read files in ≤ 250‑line chunks to avoid truncation
- Edit files via `apply_patch` only
- Prefer not to install new tools unless necessary
- Pushing branches / making PRs is supported via `gh` CLI when credentials exist
