**Snapshot**

- Background layer: `src/background/background.ts` (Chrome MV3 service worker; message handling, Whisparr/Stash networking, permissions, caching), `src/background/background-firefox.ts` (Firefox MV3 background script with duplicated logic), `src/background/stash/graphql.ts` (Stash GraphQL client + URL helpers).
- Content layer: `src/content/content.ts` (UI injection, SceneCardObserver, status caches, runtime messaging, dev panel), `src/content/pageParser.ts` (page parsing + ID extraction), `src/content/options.ts` and `src/content/options.html` (options UI).
- Options location: no `src/options/`; options page is bundled from `src/content/options.ts` and referenced by manifests.
- Shared helpers: `src/shared/messages.ts` (message constants + request/response types), `src/shared/storage.ts` (settings/catalogs/selections), `src/shared/navigation.ts` (openExternalLink bridge injected as content script).
- Manifests: `manifest/chrome/manifest.json` uses `background/background.js` (module SW) and content scripts; `manifest/firefox/manifest.json` uses `background/background-firefox.js` (script) and the same content scripts/options page.
- Guards/build: `scripts/build.mjs` per target; `scripts/tripwire.mjs` enforces bundle hygiene.

**Duplication Hotspots**
**Hotspots (Core)**

- Message constants + routing boilerplate duplicated across `src/shared/messages.ts`, `src/background/background.ts` (long if-chain in onMessage), `src/background/background-firefox.ts` (local MESSAGE_TYPES), and `src/content/content.ts` (local request types).
- Fetch/timeout/error handling duplicated in `src/background/background.ts` (`handleFetchJson`), `src/background/background-firefox.ts` (similar logic), and `src/background/stash/graphql.ts` (separate timeout/parse/error shaping).
- Base URL normalization + permission checks repeated in `src/background/background.ts`, `src/background/stash/graphql.ts`, and `src/content/options.ts`, with many handlers each re-checking `ext.permissions.contains`.
- Storage wrappers duplicated: `src/shared/storage.ts` exists, but `src/background/background-firefox.ts` re-implements get/save for settings/catalogs/selections.

**Hotspots (UI/DOM)**

- Status caching/batching duplicated: `sceneCardStatusCache` + batch limit in `src/background/background.ts` vs `statusQueue`, `statusBySceneId`, `statusCache`, `stashMatchCache` in `src/content/content.ts`.
- Scene ID parsing/navigation duplication: `src/content/pageParser.ts` parses IDs/canonical links while `SceneCardObserver.extractScene` in `src/content/content.ts` re-parses hrefs; navigation polling (popstate + interval) exists in two places.
- MutationObserver/debounce logic is bespoke in `SceneCardObserver` and not reusable for other injected UI.
- Button/icon UI patterns are repeated with inline styles in `SceneCardObserver.injectControls` in `src/content/content.ts` (action/search/exclude/monitor/view buttons) and ad-hoc disabled state handling.

**Target Spines**
**Messaging**

- Purpose: typed message map + router to reduce handler boilerplate and unify Result/AppError shapes.
- Location: `src/shared/messages.ts`; `src/shared/result.ts`; `src/shared/messaging.ts` (or `src/background/router.ts` for the runtime listener).
- Public API: `type MessageMap`; `type Result<T>`; `type AppError`; `createMessageRouter(handlers)`; `sendMessage<K>(req)`.
- Adopters: `src/background/background.ts`; `src/background/background-firefox.ts`; `src/content/content.ts`; `src/content/options.ts`.
- Trade-offs/Risks: upfront refactor cost and stricter typing; must preserve current response payloads and error strings.

**Background HTTP**

- Purpose: single fetch wrapper with timeout, JSON/text parsing, and error normalization.
- Location: `src/background/http.ts`.
- Public API: `requestJson<T>(url, init, { timeoutMs })`; `requestText(url, init, { timeoutMs })`; `normalizeHttpError(...)`.
- Adopters: `src/background/background.ts`; `src/background/stash/graphql.ts`; `src/background/background-firefox.ts`.
- Trade-offs/Risks: subtle error-string changes can regress UI; keep behavior identical per endpoint.

**Permissions**

- Purpose: standardized optional host permission checks/requests + origin building.
- Location: `src/shared/url.ts` (pure helpers); `src/background/permissions.ts` (contains/request wrappers).
- Public API: `normalizeBaseUrl(raw)`; `toOriginPattern(baseUrl)`; `checkHostPermission(origin)`; `requestHostPermission(origin)`.
- Adopters: `src/background/background.ts`; `src/background/stash/graphql.ts`; `src/background/background-firefox.ts`; `src/content/options.ts`.
- Trade-offs/Risks: options UI error messaging is user-facing; keep text and scheme-sensitive behavior unchanged.

**Caching/Batching**

- Purpose: shared TTL cache + batcher to unify status lookups and reduce duplicated queue logic.
- Location: `src/shared/cache.ts`; `src/shared/batch.ts`.
- Public API: `createTtlCache<K, V>({ ttlMs, maxSize? })`; `createBatcher<T, R>({ maxBatch, maxWaitMs, handler })`.
- Adopters: `src/background/background.ts` (scene status cache); `src/content/content.ts` (status queue and stash match cache).
- Trade-offs/Risks: changes in batching timing can impact UI; preserve current constants/ordering.

**UI Primitives**

- Purpose: centralized icon rendering, icon buttons, and status indicators to cut inline style duplication.
- Location: `src/content/ui/icons.ts`; `src/content/ui/buttons.ts`; `src/content/ui/statusIndicator.ts`.
- Public API: `renderIcon(name, { size, spin })`; `createIconButton({ label, icon, variant, disabled })`; `setButtonState(button, state)`; `createStatusIndicator({ state })`.
- Adopters: `src/content/content.ts` (SceneCardObserver and any panel UI).
- Trade-offs/Risks: visual diffs are easy; lock current colors/sizes as defaults and migrate without restyling.

**URL Normalization**

- Purpose: single source for base URL validation and safe URL joins without leaking API endpoints into content/options bundles.
- Location: `src/shared/url.ts`.
- Public API: `normalizeBaseUrl(raw)`; `stripTrailingSlash(url)`; `safeJoin(base, ...segments)`; `buildWhisparrSceneUrl(base, id)`; `buildStashSceneUrl(base, id)`; `parseSceneIdFromUrl(url)`.
- Adopters: `src/background/background.ts`; `src/background/stash/graphql.ts`; `src/content/content.ts`; `src/content/pageParser.ts`; `src/content/options.ts`.
- Trade-offs/Risks: URL normalization changes can alter permission origins; keep output identical to current helpers.

**Roadmap** (Task List)
**Task 1**

- Scope: `src/shared/messages.ts`; `src/shared/result.ts`; `src/shared/messaging.ts`; `src/background/background.ts`; `src/background/background-firefox.ts`; `src/content/content.ts`; `src/content/options.ts` (migrate 3–5 messages: PING/GET_SETTINGS/GET_CONFIG_STATUS/OPEN_OPTIONS_PAGE).
- Invariants: no behavior change; response payloads unchanged; no API endpoint strings in shared; background-only networking; Firefox baseline.
- Commits: 1) feat(shared): add Result/AppError + MessageMap + typed sendMessage. 2) refactor(background): router + migrate selected messages in both entrypoints. 3) refactor(content/options): typed sendMessage for migrated messages.
- Verification: `npm run lint`; `npm run build`; `npm run tripwire` (from repo root); manual: options page loads settings, content script initializes on StashDB.

**Task 2**

- Scope: `src/shared/url.ts`; `src/background/permissions.ts`; `src/background/background.ts`; `src/background/background-firefox.ts`; `src/background/stash/graphql.ts`; `src/content/options.ts`; optional `src/content/content.ts` for link builders.
- Invariants: identical validation errors and origin patterns; no API endpoints in shared; no network in content/options.
- Commits: 1) feat(shared): add URL/origin helpers. 2) refactor(background): replace normalizeBaseUrl/hostOriginPattern usage. 3) refactor(options/content): reuse helpers for validation + link building.
- Verification: `npm run build`; `npm run tripwire`; manual: Whisparr/Stash validation and permission status in options; Stash/Whisparr link buttons still work.

**Task 3**

- Scope: `src/background/http.ts`; migrate `handleFetchJson` usage in `src/background/background.ts` and `src/background/background-firefox.ts` (start with validateConnection + discovery catalogs); update `src/background/stash/graphql.ts`.
- Invariants: same status/error text per endpoint; networking remains background-only; no endpoint strings leak to content/options.
- Commits: 1) feat(background): add HTTP wrapper. 2) refactor(background): migrate validateConnection + discovery catalogs. 3) refactor(background/stash): use wrapper for GraphQL.
- Verification: `npm run build`; `npm run tripwire`; manual: Validate Whisparr/Stash in options, discovery lists load.

**Task 4**

- Scope: extract Whisparr/Stash logic from `src/background/background.ts` into `src/background/services/whisparr.ts` and `src/background/services/stash.ts`; create `src/background/core.ts`; wire `src/background/background.ts` and `src/background/background-firefox.ts` to core.
- Invariants: message types and payloads unchanged; Firefox script output preserved; no new cross-layer imports.
- Commits: 1) refactor(background): extract Whisparr/Stash service modules. 2) refactor(background): add core router and make both entrypoints call it.
- Verification: `npm run build`; `npm run tripwire`; manual: add scene, set monitor, update tags, scene card actions in Firefox.

**Task 5**

- Scope: add UI primitives in `src/content/ui/icons.ts`, `src/content/ui/buttons.ts`, `src/content/ui/statusIndicator.ts`; refactor `src/content/content.ts` scene card injection to use them.
- Invariants: same visual/behavioral output; aria labels/tooltips unchanged; no new networking.
- Commits: 1) feat(content/ui): introduce primitives with current styles. 2) refactor(content): migrate SceneCardObserver controls. 3) refactor(content): clean redundant inline styles if safe.
- Verification: `npm run build`; `npm run tripwire`; manual: scene cards show action/search/exclude/monitor/view buttons with correct states.

**Task 6**

- Scope: new DOM/parsing utilities in `src/content/dom/observer.ts` and `src/content/parsing.ts`; update `src/content/pageParser.ts` and `src/content/content.ts`.
- Invariants: same selectors and behavior; no new DOM side effects; no networking.
- Commits: 1) feat(content): add parsing + observer utilities. 2) refactor(content): adopt in pageParser + SceneCardObserver.
- Verification: manual: SPA navigation, infinite scroll, and new scene cards still get injected once.

**Task 7**

- Scope: `src/shared/cache.ts`; `src/shared/batch.ts`; migrate `sceneCardStatusCache` in `src/background/background.ts` and `statusQueue`/`statusBySceneId` in `src/content/content.ts`.
- Invariants: TTL and batch sizes unchanged; no additional requests; UI timing remains stable.
- Commits: 1) feat(shared): add TTL cache + batcher. 2) refactor(background): use TTL cache for scene status. 3) refactor(content): use batcher for status queue.
- Verification: `npm run build`; `npm run tripwire`; manual: scene list status updates remain batched and accurate.

**Task 8**

- Scope: add a Search-on-add setting in `src/content/options.ts` + `src/content/options.html`; persist via `src/shared/storage.ts`; thread the value through add-scene flows in `src/content/content.ts` and `src/background/services/whisparr.ts` (`addOptions.searchForMovie`).
- Invariants: default behavior remains `searchForMovie: true`; no new network calls in content/options; message shapes remain stable; error strings unchanged.
- Commits: 1) feat(options): add search-on-add toggle + persistence. 2) refactor(content): send add requests with search flag. 3) refactor(background): honor setting in add payloads.
- Verification: `npm run lint`; `npm run build`; `npm run tripwire`; manual: toggle off prevents auto-search on add, toggle on restores current behavior.

**Task 9**

- Scope: implement performer + studio support in `src/background/services/whisparr.ts` (lookup/add/monitor endpoints) and expose actions in `src/content/content.ts` on performer/studio pages.
- Invariants: background-only networking; no API endpoints in content/options; permission checks align with existing Whisparr flows; no UI on `/edit/*` pages.
- Commits: 1) feat(background): add performer/studio handlers. 2) feat(content): add performer/studio panel actions + status display. 3) docs: update parsing/scene-card notes if needed.
- Verification: `npm run lint`; `npm run build`; `npm run tripwire`; manual: add performer/studio, toggle monitor, status updates render correctly.

**Task 10**

- Scope: bring performer/studio extension panel sections in `src/content/content.ts` up to scene panel parity: status row, explicit "Check status" action, and Whisparr view link button (openExternalLink) with the same disabled/ready states.
- Invariants: no new networking in content/options; preserve `/edit/*` no-UI rule; keep scene panel behavior unchanged; reuse existing styling and aria labels where possible.
- Commits: 1) feat(content): add status/check/view controls for performer+studio panels. 2) refactor(content): align button state/labels with scene panel conventions.
- Verification: `npm run lint`; `npm run build`; `npm run tripwire`; manual: performer/studio pages show status, check, add/monitor, and view link with correct enabled/disabled states.

**Task 11**

- Scope: align performer/studio panel state handling with scenes: clear state on SPA navigation, refresh status after add/monitor actions, and surface errors consistently in the status row.
- Invariants: no new API endpoints in content/options; no toasts; no console noise; preserve existing scene card observer behavior.
- Commits: 1) refactor(content): add navigation-aware state resets for performer/studio. 2) refactor(content): unify status text/error handling across panel sections.
- Verification: `npm run lint`; `npm run build`; `npm run tripwire`; manual: navigating between scene/performer/studio pages refreshes panel states without stale data.

**Task 12**

- Scope: extend performer/studio panel to support editing tags + quality profile and confirm monitor toggle presence; verify the scene panel already exposes tag/quality editing + monitor toggle and align any missing UI states or disabled logic for parity.
- Invariants: no new networking in content/options; re-use discovery catalogs + selections; preserve existing scene panel behavior unless explicitly missing; avoid new toasts.
- Commits: 1) feat(content): add performer/studio tag/quality controls + save actions. 2) refactor(content): align panel disabled/ready states for tag/quality/monitor controls.
- Verification: `npm run lint`; `npm run build`; `npm run tripwire`; manual: performer/studio panel can edit tags/quality and monitor toggle behaves; scene panel still edits tags/quality and monitor toggle remains functional.

**Task 13**

- Scope: add copy-to-clipboard for StashDB scene IDs on scene cards and the scene details panel in `src/content/content.ts`.
- Invariants: no networking; no layout regressions; provide visible success/failure feedback without toasts.
- Commits: 1) feat(content): add copy buttons + clipboard helper. 2) refactor(content): wire copy buttons into scene card and panel UI.
- Verification: `npm run lint`; `npm run build`; `npm run tripwire`; manual: copy works on cards and scene page, including fallback for restricted clipboard.

**Task 14**

- Scope: add bulk actions UI for scene list pages in `src/content/content.ts` with confirmation prompts and a progress modal; add background batch handlers in `src/background/services/whisparr.ts`.
- Invariants: bulk flows use modal for feedback (no toasts); empty-state shows info message; skipped counts use consistent wording; no dummy success items.
- Commits: 1) feat(content): bulk actions dropdown + confirmations. 2) feat(content): progress modal + state management. 3) feat(background): bulk add/search/missing handlers with suppressed toasts.
- Verification: `npm run lint`; `npm run build`; `npm run tripwire`; manual: Add All / Search All / Add Missing work and show correct progress/summary.

**Task 15**

- Scope: add a settings toggle to show/hide debug details in the extension panel; wire storage + options UI + panel rendering (`src/shared/storage.ts`, `src/content/options.ts`, `src/content/options.html`, `src/content/content.ts`, and shared messages if required).
- Invariants: default is off; no changes to non-debug panel content; no networking in content/options; avoid new error strings or toasts.
- Commits: 1) feat(options): add debug-details toggle + persistence. 2) refactor(content): conditionally render debug details based on setting (and refresh on setting changes).
- Verification: `npm run lint`; `npm run build`; `npm run tripwire`; manual: toggle hides/shows debug section without breaking panel layout.

**Future Work: Firefox Background Refactor Plan**

- Goal: refactor `src/background/background-firefox.ts` to reuse shared background core/services while keeping Firefox MV3 script output and identical behavior.
- Scope: message routing, Whisparr/Stash handlers, HTTP/permission helpers, cache usage, and settings/selections/catalog flows.
- Non-goals: no behavior changes, no UI changes, no new APIs or endpoints, no manifest format change.
- Constraints: keep `background/background-firefox.js` as a classic script (not a module); preserve message types/payloads/error strings; no cross-layer imports; background-only networking.
- Phase 1 (Inventory): list every handler and helper in `background-firefox.ts`, map each to `src/background/services/*` or shared helpers; note Firefox-only glue.
- Phase 2 (Core Router): add/extend shared background core router and wire both entrypoints through a thin runtime adapter.
- Phase 3 (Service Adoption): replace inline Firefox handler bodies with calls into `whisparr.ts` and `stash.ts`; keep request/response shapes identical.
- Phase 4 (Shared Utilities): migrate to shared HTTP wrapper, URL/permissions helpers, and message constants/types where parity already exists.
- Phase 5 (Build Output): verify Firefox bundle is still a script and manifest still targets `background/background-firefox.js`.
- Phase 6 (Validation): manual Firefox checks for add scene, set monitor, update tags, scene card actions, and permission prompts.
- Guardrails: do not change error strings; do not change payload keys; do not alter timeouts; do not introduce new fetch/XHR in content/options; keep `/api/v3` and secrets out of content/options bundles.
- Guardrails: do not change `manifest/firefox/manifest.json` `background` entry except for filename renames if required by build output.
- Guardrails: preserve existing telemetry/logging behavior (no new console noise).
- Verification: `npm run lint`, `npm run build`, `npm run tripwire`; manual Firefox smoke tests above.
- Commit plan: 1) refactor(background): add shared core adapter for Firefox entrypoint. 2) refactor(background): replace Firefox handlers with shared services. 3) refactor(background): adopt shared http/url/permissions/messages. 4) chore(build): verify script output if build config touched.
- Phase 1 Inventory Mapping (handlers): handleFetchJson -> `src/background/http.ts`; handleValidateConnection -> `src/background/services/whisparr.ts`; handleFetchDiscoveryCatalogs -> `src/background/services/whisparr.ts`; handleSaveSelections -> `src/background/services/whisparr.ts`; handleCheckSceneStatus -> `src/background/services/whisparr.ts`; handleAddScene -> `src/background/services/whisparr.ts`; handleSetMonitorState -> `src/background/services/whisparr.ts`; handleUpdateTags -> `src/background/services/whisparr.ts`; handleUpdateQualityProfile -> `src/background/services/whisparr.ts`; handleSceneCardAction -> `src/background/services/whisparr.ts`; handleSceneCardsCheckStatus -> `src/background/services/whisparr.ts`; handleSceneCardAdd -> `src/background/services/whisparr.ts`; handleSceneCardTriggerSearch -> `src/background/services/whisparr.ts`; handleSceneCardSetExcluded -> `src/background/services/whisparr.ts`; handleStashFindSceneByStashdbId -> `src/background/services/stash.ts`.
- Phase 1 Inventory Mapping (helpers): MESSAGE_TYPES + request/response shapes -> `src/shared/messages.ts`; normalizeBaseUrl/hostOriginPattern -> `src/shared/url.ts` + `src/background/permissions.ts`; storage wrappers (get/save settings/catalogs/selections) -> `src/shared/storage.ts`; stashGraphqlRequest/buildStashSceneUrl -> `src/background/stash/graphql.ts` + `src/background/services/stash.ts`; hashValue/toUiSelections/normalizeTags/buildUpdatePayload/fetchSceneLookup/reconcileSelections -> `src/background/services/whisparr.ts`.
- Phase 1 Inventory Mapping (glue to keep in Firefox entrypoint): runtime adapter (browser API surface), onMessage listener wiring, manifest script output constraints, and any Firefox-only permission/compat checks.
- Note: Background scene card status cache was removed (Chrome + Firefox) to prevent stale excluded states; status now always reflects live Whisparr data.

**Guardrails**

- Extend `scripts/tripwire.mjs` to scan content/options bundles for `/graphql` and `ApiKey:` (Stash header) in addition to existing `/api/v3` and `X-Api-Key`.
- Add a lightweight source boundary script (e.g., `scripts/boundary.mjs`) that fails if `src/content/**` or `src/content/options.ts` import from `src/background/**`, and wire it into `npm run lint`.
- Add a source scan that flags direct `fetch`/`XMLHttpRequest` usage in `src/content/**` and `src/content/options.ts` except the explicit DEV fetch trap in `src/content/content.ts`.
- Keep `scripts/tripwire.mjs` mandatory in CI for every build target (`npm run tripwire` after `npm run build`).
- Add a manifest check ensuring Firefox continues to use `background/background-firefox.js` as a script (not a module) to preserve MV3 behavior baseline.
