# [x] Task 4.SCENE_CARDS.1

You are working in enymawse/stasharr inside /extension.
Read /extension/docs/ARCHITECTURE.md and /extension/docs/SCENE_CARDS.md first; they are authoritative.

Task 4.SCENE_CARDS.1: Implement the foundational Scene Card augmentation mechanics:

- detect Scene Cards robustly on stashdb.org list/grid pages
- inject a minimal Stasharr UI affordance into each card
- wire click events to background via runtime messaging (no networking)

Requirements:
A) Scene card detection + extraction (content script)

1. Implement a SceneCardObserver using MutationObserver with debouncing.
2. Identify cards via anchors matching scene routes (see SCENE_CARDS.md).
3. Extract:
   - sceneId (string)
   - sceneUrl (absolute URL)
4. Ensure idempotency: no duplicate injection per card.

B) UI injection (content script)

1. Inject a small, non-invasive UI element into each card:
   - badge: "Stasharr"
   - status placeholder: "unknown"
   - button: "+" (enabled) that triggers a stub action
2. Use unique container id/class and minimal styling to avoid layout disruption.

C) Background message hook (no real API yet)

1. Add a background message handler for:
   - SCENE_CARD_ACTION_REQUESTED { sceneId, sceneUrl, action: "stub_add" }
2. Return a stub response (e.g., { ok: true }).

D) UI interaction

1. On click, update local UI state (e.g., status becomes "clicked") and send message.
2. Display the stub response (optional).

E) Guardrails

1. No fetch/XHR in content/options bundles.
2. No "/api/v3" strings in content/options bundles.
3. Keep existing DEV fetch trap intact.

Deliverables:

- Working card injection on pages with many scene cards
- Works with infinite scroll / cards added after load
- No duplicates, no orphaned UI on navigation
- Commits:
  - "extension: scene card observer + ui injection + stub action"

Acceptance criteria:

- On a stashdb scene listing page, each card gets exactly one Stasharr control.
- New cards added by scrolling also get controls.
- Clicking the button sends a runtime message and updates local UI state.

# [x] Task 4.SCENE_CARDS.2

You are working in /extension. Read ARCHITECTURE.md and SCENE_CARDS.md first.

Task 4.SCENE_CARDS.2: Implement Whisparr status checks for Scene Cards using background-only networking.
This adds real value: each card shows whether the scene already exists in Whisparr.

Requirements:
A) Background: batch status API

1. Add message type:
   - SCENE_CARDS_CHECK_STATUS { items: [{ sceneId, sceneUrl }] }
2. Implement batching + rate limiting:
   - Accept up to N items per request (e.g., 25-50)
   - Debounce multiple calls from content script into fewer background calls
3. Return normalized results:
   - { sceneId, exists: boolean, whisparrId?: number, monitored?: boolean, tagIds?: number[] }
4. Cache results in background (in-memory) with TTL (e.g., 5-15 minutes) keyed by sceneId/sceneUrl.
5. Use stored config + optional host permissions. Do not accept apiKey from content.

B) Content: request status efficiently

1. When new cards are detected, enqueue them for status check:
   - batch them (debounce) and call SCENE_CARDS_CHECK_STATUS
2. Update each card UI:
   - "unknown" -> "in whisparr" / "not in whisparr"
   - show a subtle visual indicator (text/icon) only

C) Error handling

1. If background returns an error:
   - show "error" state on affected cards
   - include a small tooltip or "retry" control (optional)
2. Do not spam retries automatically.

D) Guardrails

1. Ensure content/options bundles still contain no api/v3 strings.
2. Background-only networking enforced.

Deliverables:

- Scene cards display existence status from Whisparr
- Batched + cached calls to avoid flooding Whisparr
- Commit:
  - "extension: scene card status check (batched + cached)"

Acceptance criteria:

- On a page with 50+ cards, status populates without overwhelming the network.
- Scrolling adds cards and they get status.
- Firefox shows no CSP upgrade logs (no document-context fetch).

# [x] Task 4.SCENE_CARDS.3

You are working in /extension. Read ARCHITECTURE.md first.

Task 4.SCENE_CARDS.3: Implement "Add to Whisparr" from Scene Cards using background-only networking and configured selections.

Requirements:
A) UI behavior (content script)

1. On cards where exists=false:
   - "Add to Whisparr" button is enabled and labeled "Add"
2. On cards where exists=true:
   - button disabled
3. On click:
   - optimistic UI state: "adding..."
   - disable button until response returns

B) Background: add action

1. Add message:
   - SCENE_CARD_ADD { sceneId, sceneUrl }
2. Background constructs payload using stored selections:
   - qualityProfileId
   - rootFolderPath (or id)
   - tagIds
3. Submit add request and return:
   - { ok, whisparrId?, error? }
4. Update background cache so the card immediately flips to exists=true.

C) Error handling

1. Missing selections => actionable error returned (tell user to configure options)
2. 401/403/400 => surfaced clearly
3. After failure, restore button to enabled state.

Deliverables:

- Add-to-Whisparr works directly from cards
- Commit:
  - "extension: add scene to whisparr from scene cards"

Acceptance criteria:

- Clicking Add on a not-yet-added card results in success and UI updates to Added.
- Failure shows a clear error and does not break other cards.

# [x] Task 4.SCENE_CARDS.4

You are working in /extension. Read /extension/docs/ARCHITECTURE.md first; it is authoritative.

Task 4.SCENE_CARDS.4: Add a “Search / Refresh” action on Scene Cards for items that already exist in Whisparr but have no file.
This action should trigger a Whisparr search/refresh so Whisparr attempts to find and/or import the file.

Constraints:

- Background-only networking (no fetch/XHR in content/options)
- No /legacy imports, no GM\_\* APIs
- Must integrate with the existing Scene Card status model/caching from prior tasks

Goal:
For cards where:

- exists=true AND hasFile=false (or equivalent “missing file” state),
  render a small icon-only control that triggers a Whisparr search for that item.
  The UI should also make the “missing” state visible at a glance.

A) Determine the “missing file” signal

1. In background, extend the status-check result to include a missing-file flag:
   - hasFile: boolean (preferred), OR
   - missing: boolean, OR
   - fileCount: number
2. Implement this by querying the relevant Whisparr data returned during status lookup.
   - If status lookup doesn’t currently retrieve enough fields, update it to do so efficiently.
3. Normalize this into the status response:
   - { sceneId, exists, whisparrId, hasFile, ... }

B) Background: search trigger API

1. Add a message:
   - SCENE_CARD_TRIGGER_SEARCH { whisparrId }
2. Implement the Whisparr API call to trigger a search for that item.
   - Use the correct endpoint and method for Whisparr’s search/command operation.
   - Include proper headers (X-Api-Key) using stored config.
   - Use timeouts and structured error responses.
3. Return:
   - { ok: true } on success
   - { ok: false, error: { code, message } } on failure

C) Content: icon-only UI control + state

1. On cards where exists=true and hasFile=false:
   - show a “missing” indicator icon (e.g., warning/empty file)
   - show an action icon button for “search/refresh”
2. On cards where hasFile=true:
   - do not show the search control
3. When user clicks the search icon:
   - disable the icon button
   - show a transient “in progress” state (spinner icon)
   - send SCENE_CARD_TRIGGER_SEARCH to background
   - on success, show a brief success icon state
   - optionally schedule a status refresh for that card after a short delay (e.g., 5–15s) via existing status check batching

D) Icon requirements (no text labels)

1. Replace any text labels with custom-rendered icons:
   - Provide an internal Icon component (inline SVG) for:
     - Missing (warning/empty)
     - Search/refresh
     - Loading (spinner)
     - Success (check)
     - Error (x)
2. Buttons should include:
   - accessible aria-labels (e.g., aria-label="Trigger Whisparr search")
   - title tooltip on hover (optional)
3. Icons must be lightweight and not depend on external libraries unless already present.

E) Guardrails + tests

1. Ensure content/options bundles contain no "/api/v3" strings and no "X-Api-Key".
2. Ensure background-only networking enforcement remains intact.
3. Add a small unit test or a dev checklist entry verifying:
   - missing state renders correctly
   - clicking search triggers background call
   - UI state transitions (loading -> success/error)

Deliverables:

- Status model includes hasFile/missing signal
- Scene Cards show icon-only missing indicator + search action
- Clicking triggers Whisparr search via background and updates UI state
- Commit:
  - "extension: scene card search action for missing files (icon UI)"

# [x] Task 4.SCENE_CARDS.5

You are working in /extension. Read /extension/docs/ARCHITECTURE.md first; it is authoritative.

Task 4.SCENE_CARDS.5: Implement exclusion display + toggling for existing Whisparr items from Scene Cards.

Goal:
On Scene Cards where the item exists in Whisparr, show when it is excluded, and allow toggling excluded/unexcluded
directly from the card using icon-only controls.

Non-negotiable constraints:

- Background-only networking (no fetch/XHR in content/options)
- No /legacy imports, no GM\_\* APIs
- Must integrate with existing Scene Card status model/caching and batching

Requirements:

A) Status model: include exclusion state

1. Extend the Scene Card status result (from Task 4.SCENE_CARDS.2) to include:
   - excluded: boolean
   - (optional) excludeReason or excludedUntil if Whisparr provides it
2. If the existing status lookup does not retrieve exclusion fields, update background status retrieval to do so efficiently.
3. Normalize the output:
   - { sceneId, exists, whisparrId, excluded, hasFile?, monitored?, ... }

B) Content UI: display exclusion state (icon-only)

1. For exists=true cards:
   - Display an exclusion indicator icon reflecting the current state:
     - excluded=true: show a clear “excluded” icon state (e.g., ban/slash)
     - excluded=false: show the status that the scene otherwise has (e.g. in whisparr with no file or in whisparr with file)
2. Tooltip/title and aria-label must explain the state:
   - e.g., aria-label="Excluded from Whisparr" / "Not excluded"

C) Content UI: toggle control (icon-only)

1. For exists=true cards, render a single icon button to toggle:
   - if excluded=false → clicking excludes the item
   - if excluded=true → clicking un-excludes the item
2. UI behavior:
   - disable button while request is in-flight
   - show loading spinner icon while updating
   - on success:
     - update the card UI immediately
     - update local cache/state so the card reflects the new excluded state
   - on error:
     - show error icon state briefly and surface message (tooltip or small inline text)
     - restore previous state

D) Background: exclusion toggle API

1. Add message:
   - SCENE_CARD_SET_EXCLUDED { whisparrId: number, excluded: boolean }
2. Implement the correct Whisparr API call(s) to toggle exclusion:
   - Use stored config (baseUrl, apiKey)
   - Use background fetch utilities (timeout, structured errors)
   - Return normalized response:
     - { ok: true, excluded: boolean } on success
     - { ok: false, error: { code, message } } on failure
3. Ensure idempotency:
   - If the item is already in the requested state, return ok:true with current state.

E) Icons (no text labels)

1. Implement/extend the internal Icon component (inline SVG) to include:
   - Excluded (ban/slash)
   - Search (warning/triangle/magnifying glass)
   - Loading (spinner)
   - Success (check)
   - Error (x)
2. Buttons must use aria-labels; optional title tooltips.

F) Guardrails

1. Ensure content/options bundles contain no:
   - "/api/v3"
   - "X-Api-Key"
2. Ensure all exclusion-related API logic exists only in src/background/\*\*.
3. Keep existing CI/build scans and DEV fetch traps intact.

Deliverables:

- Exclusion state shown on Scene Cards
- Icon-only toggle to exclude/unexclude
- Background-only implementation with cache updates
- Commit:
  - "extension: exclusion display + toggle from scene cards"

# [] Task 4.SCENE_CARDS.6 (wont do)

You are working in /extension. Read ARCHITECTURE.md first.

Task 4.SCENE_CARDS.6: Harden scene card augmentation for SPA navigation and performance.

Requirements:

1. Ensure observers detach/re-init appropriately on route changes.
2. Ensure no memory leaks:
   - use WeakMap for element tracking where possible
   - cleanup listeners on card removal
3. Improve batching heuristics:
   - cap concurrent requests
   - avoid re-checking cards already checked in this session
4. Add a small dev diagnostics toggle (optional) to show:
   - number of cards tracked
   - number of status requests
   - cache hit rate

Deliverables:

- More stable and performant scene card features
- Commit:
  - "extension: harden scene card augmentation (spa + perf)"

# [x] Task 4.STASH.0

You are working in enymawse/stasharr inside /extension.
Read /extension/docs/ARCHITECTURE.md first; it is authoritative.

Task 4.STASH.0: Create a feature parity checklist for Stash integration only.

Requirements:

1. Add /extension/docs/STASH_FEATURES.md describing:
   - What “Stash integration” means in this extension (scene link on scene page, scene cards, etc.)
   - Required settings (stashBaseUrl, stashApiKey)
   - UX expectations for “View in Stash”
2. Keep it tightly scoped to what Stasharr claims today:
   - “View in Stash — Direct link to scene in your Stash instance (if configured)”
3. No code changes.

Commit:

- "docs: add stash integration feature checklist"

# [x] Task 4.STASH.1

You are working in /extension. Read ARCHITECTURE.md first.

Task 4.STASH.1: Implement Stash GraphQL client + validation in background only.

Requirements:
A) Background-only GraphQL client

1. Add src/background/stash/graphql.ts implementing:
   - stashGraphqlRequest<T>(query, variables) -> { ok, data?, error? }
2. Auth:
   - Use stored stashApiKey (never log)
   - Use correct Stash auth header supported by Stash (document it in code)
3. Timeout + structured errors.

B) Validation message

1. Add message: VALIDATE_CONNECTION { kind: "stash" }
2. Validate via a cheap GraphQL call (e.g. a minimal query that proves auth + endpoint).

C) Permissions

- Use optional host permissions for the configured stash origin.
- No wildcard host permissions.

Deliverable:

- Background can validate Stash config without any document-context networking.

Commit:

- "extension: stash graphql client + background validation"

# [x] Task 4.STASH.2

You are working in /extension. Read ARCHITECTURE.md first.

Task 4.STASH.2: Implement a single-scene lookup that finds the local Stash scene that matches a StashDB scene id.

Background:

- Stash stores "StashID" matches; GraphQL findScenes supports filtering by stash_id via scene_filter.stash_id_endpoint.

Requirements:
A) Background lookup

1. Add message:
   - STASH_FIND_SCENE_BY_STASHDB_ID { stashdbSceneId: string }
2. Implement GraphQL query using findScenes with scene_filter.stash_id_endpoint.stash_id = stashdbSceneId.
   - Prefer omitting endpoint unless required; if required, make endpoint configurable later.
3. Return normalized result:
   - { ok, found: boolean, stashSceneId?: string|number, stashScenePath?: string, title?: string }

Deliverable:

- Given a stashdb scene id, background can return the corresponding local Stash scene id (if any).

Commit:

- "extension: stash lookup by stashdb scene id (background)"

# [x] Task 4.STASH.3

You are working in /extension. Read ARCHITECTURE.md first.

Task 4.STASH.3: On stashdb Scene detail pages, show an action “View in Stash” button on the Stasharr Extension Panel when a matching local Stash scene exists.

Requirements:
A) Content

1. Reuse existing scene page parsing (stashdb sceneId).
2. Add an action button:
   - If configured + match found -> enabled, opens local Stash scene in a new tab
   - If configured but no match -> disabled state
3. Accessibility:
   - aria-label="View in Stash"
   - optional title tooltip

B) Background

1. Content requests match via STASH_FIND_SCENE_BY_STASHDB_ID
2. Background returns stashSceneId and constructs the URL for the local Stash scene page:
   - baseUrl + "/scenes/<id>" (document assumptions and keep it centralized)

C) Guardrails

- No networking in content/options.
- No leaking stashApiKey to UI or logs.

Commit:

- "extension: scene page view-in-stash link (icon-only)"

### [x] Task 4.STASH.3.1

You are working in /extension. Read ARCHITECTURE.md first.

Task 4.STASH.3.1: On Stash Extension Panel put the "View in Stash" action button on its own row when a matching local Stash scene exists.

### [x] Task 4.STASH.3.2

You are working in /extension. Read ARCHITECTURE.md first.

Task 4.STASH.3.2: On Stash Extension Panel put a "View in Whisparr" action button on the same row as "View in Stash" when a matching Whisparr scene exists.

### [x] Task 4.STASH.3.3

You are working in /extension. Read ARCHITECTURE.md first.

Task 4.STASH.3.3: Add icon action buttons to the stasharr scene card action row for "View in Whisparr" and "View in Stash" actions.

### [x] Task 4.STASH.3.4

You are working in /extension. Read ARCHITECTURE.md first.

Task 4.STASH.3.4: On the Stasharr Extension panel, make the "View in Stash" and "View in Whisparr" action buttons fill their available row and have "Whisparr" and "Stash" text in the button.

### [x] Task 4.STASH.3.5

You are working in /extension. Read ARCHITECTURE.md first.

Task 4.STASH.3.5: On the Scene Card, the "View in Whisparr" and "View in Stash" buttons should use the Whisparr and Stash favicons respectively and be right adjusted in the space they are located.

Requirements:

1. For Whisparr, use the following icon
   - https://raw.githubusercontent.com/Whisparr/Whisparr/refs/heads/eros/Logo/Whisparr.svg
2. For Stash, use the following icon
   - https://stashapp.cc/images/stash.svg

# [x] Task 4.STASH.4 (OBE)

You are working in /extension. Read ARCHITECTURE.md and SCENE_CARDS.md first.

Task 4.STASH.4: Add Stash presence indicator + icon-only “View in Stash” action to Scene Cards.

Reality check:

- Stash GraphQL filter currently supports single stash_id criterion; true batching may require multiple requests or OR chaining (keep modest limits).

Requirements:
A) Content

1. For each augmented Scene Card (from scene-cards tasks), add:
   - a small icon indicator for “exists in Stash”
   - an icon-only link button to open the local Stash scene (when exists)
2. Do not spam requests: enqueue card ids and request in small batches.

B) Background

1. Add message:
   - STASH_FIND_SCENES_FOR_CARDS { stashdbSceneIds: string[] }
2. Implementation approach:
   - Option 1: do N single lookups with concurrency limit (e.g., 3–5 at a time)
   - Option 2: OR chaining with strict max depth (only if reliable)
3. Return mapping:
   - { [stashdbSceneId]: { found, stashSceneId } }
4. Cache results with TTL.

C) UX

- Loading state icon while lookup in flight
- Error icon (non-blocking) if lookup fails

Commit:

- "extension: scene cards stash presence + view-in-stash (throttled background)"

# [x] Task 4.STASH.5 (OBE)

You are working in /extension. Read ARCHITECTURE.md first.

Task 4.STASH.5: Improve Stash settings UX specifically.

Requirements:

1. Options page:
   - Show stash config status: not configured / permission missing / validated / invalid
2. Optional host permissions:
   - request for stash origin on validate
3. Add an advanced optional setting:
   - stashIdEndpoint (string) used only if required to disambiguate stash_id matching
   - default: empty (means “don’t force endpoint”)
4. Update STASH_FIND_SCENE_BY_STASHDB_ID to use endpoint if configured.

Commit:

- "extension: stash settings UX + optional stashid endpoint support"

# [x] Task 4.STASH.6 (OBE)

You are working in /extension. Read ARCHITECTURE.md first.

Task 4.STASH.6: Polish Stash integration UI to match extension patterns.

Requirements:

1. Icon-only controls (no text labels):
   - View in Stash
   - Exists-in-Stash indicator
   - Loading / Error
2. Respect global link behavior setting (new tab vs same tab) if your extension supports it.
3. Add doc updates:
   - /extension/docs/STASH_FEATURES.md includes troubleshooting and limitations.

Commit:

- "extension: polish stash integration icons + link behavior"

# [x] Task 4.TABS.1

You are working in enymawse/stasharr inside /extension.
Read /extension/docs/ARCHITECTURE.md first; it is authoritative.

Task: Implement a global “Open links in a new tab” toggle option and apply it consistently to all external navigation links
(e.g., “View in Stash”, “View in Whisparr”).

Goal:
Users can choose whether Stasharr opens external links:

- in the current tab, OR
- in a new browser tab

This setting must be respected everywhere the extension navigates to an external site.

Non-negotiable constraints:

- No networking changes
- No imports from /legacy
- No GM\_\* APIs
- Navigation behavior must be centralized and consistent
- Must work in both Chrome and Firefox

---

A) Settings schema + persistence

1. Extend the extension settings schema to include:
   - openExternalLinksInNewTab: boolean
   - default value: true (recommended, but document clearly)

2. Store this value in extension storage alongside other user preferences.

3. Ensure:
   - setting persists across restarts
   - setting is available to content scripts via storage read (no background fetch needed)

---

B) Options UI

1. Add a toggle control to the Options page:
   - Label: “Open external links in a new tab”
   - Description text (concise):
     - “Controls whether links to Stash, Whisparr, etc. open in a new tab or replace the current page.”
2. Toggle must:
   - reflect current stored value on load
   - save immediately or via an explicit Save action (match existing Options UX)
3. No navigation logic in Options page.

---

C) Centralized navigation helper (required)

1. Implement a shared navigation utility (e.g., src/shared/navigation.ts):
   - openExternalLink(url: string, options?: { forceNewTab?: boolean })
2. Behavior:
   - Read openExternalLinksInNewTab from storage
   - If true:
     - open link in a new tab
   - If false:
     - navigate current tab to the URL
3. Allow an optional override (forceNewTab) for rare cases if needed later.

4. Implementation notes:
   - Prefer browser.tabs.create when opening a new tab
   - Prefer location.assign / window.location.href ONLY when explicitly navigating current tab
   - Do not rely on <a target="_blank"> alone (must work from programmatic actions)

---

D) Apply behavior consistently

1. Update all existing external link actions to use the centralized helper:
   - “View in Stash” (scene page + scene cards)
   - “View in Whisparr” (where applicable)
2. Remove any inline usage of:
   - target="\_blank"
   - window.open
   - direct location.href assignments for external links

---

E) Accessibility + UX

1. Icon-only buttons must:
   - retain proper aria-labels (e.g., “View in Stash”)
   - not change visual appearance based on tab behavior
2. Do not show separate UI for “open in new tab” vs “same tab” on the button itself;
   the behavior is governed solely by the global toggle.

---

F) Guardrails

1. No references to this setting should appear in background networking logic.
2. Ensure content/options bundles still contain no API endpoint strings.
3. Keep navigation logic testable and isolated.

---

Deliverables:

- New “Open external links in a new tab” toggle in Options
- Centralized navigation helper
- All external navigation respects the toggle
- Commit(s):
  - "extension: add open external links in new tab setting"
  - "extension: centralize external navigation behavior"

Acceptance criteria:

- Toggling the option immediately affects subsequent clicks.
- In both Chrome and Firefox:
  - When enabled, external links open in a new tab.
  - When disabled, external links replace the current tab.
- No regression in existing link functionality.

# Task 4.7

You are working in /extension. Read ARCHITECTURE.md first.

Task 4.7: Implement Studio page detection + a minimal Studio-level action.

Requirements:

1. Content parser: detect studio page + extract studio identifier(s).
2. UI: show a studio panel with at least one action:
   - e.g., "Monitor Studio" or "Add Studio" depending on legacy behavior.
3. Background: implement one studio-level API call end-to-end.
4. No bulk multi-step workflows yet; keep it minimal and reliable.

Deliverables:

- Studio detection + one action

Commit (make commitlint friendly):

- "extension: add studio page support + studio action"

# Task 4.8

You are working in /extension. Read ARCHITECTURE.md first.

Task 4.8: Implement Performer page detection + one performer-level action.

Requirements:

1. Content parser: detect performer page + extract performer identifier(s).
2. UI: show performer panel + action button.
3. Background: implement required API call end-to-end.
4. Same robustness standards as scene actions.

Deliverables:

- Performer detection + one action

Commit (make commitlint friendly):

- "extension: add performer page support + performer action"

# Task 4.9

You are working in /extension. Read ARCHITECTURE.md first.

Task 4.9: Improve resilience and UX across implemented features.

Requirements:

1. Centralize error mapping in background:
   - map fetch errors, timeouts, 401, 403, 404, 409 into user-facing messages
2. Add retry controls where appropriate.
3. Add small caching:
   - do not spam status checks on navigation
4. Ensure no secrets leak to logs.

Deliverables:

- Improved reliability + consistency

Commit (make commitlint friendly):

- "extension: polish error handling + caching across actions"

# Task 4.10

You are working in /extension. Read ARCHITECTURE.md first.

Task 4.10: Create a repeatable manual verification checklist for releases.

Requirements:

1. Add /extension/docs/SMOKE_TEST.md covering:
   - Scene: status check, add, monitor toggle, tag edit
   - Studio: action
   - Performer: action
   - Options: validate, fetch catalogs, select values
   - Firefox-specific checks: confirm no CSP upgrade logs
2. Add a release checklist section:
   - build chrome/firefox
   - run smoke tests
   - verify permissions prompts
3. No code changes required unless needed to expose diagnostics toggles.

Deliverables:

- SMOKE_TEST.md

Commit (make commitlint friendly):

- "docs: add smoke test + release checklist"

# Task 5.0

You are working in /extension. Read ARCHITECTURE.md first.

Task 5.0: Build Modernization (pre-refactor).

Goal:
Enable shared TS/ESM authoring while emitting **compatibility-correct outputs**:
- Chrome background: ESM (MV3 service worker)
- Firefox background: classic script (no imports)
- Content scripts: classic script (no imports)
- Options page: ESM allowed

Requirements:

1. Replace the direct `tsc --outDir` build with a bundler-based pipeline
   that supports **multi-entry** builds and **per-entry output format**.
2. Preserve current manifest structure and file names (e.g., `background/background.js`,
   `background/background-firefox.js`, `content/content.js`, `content/options.js`).
3. Keep architecture constraints intact:
   - Background-only networking
   - No content/options API endpoint strings
   - No `/legacy` references
4. Maintain tripwire checks on the built bundles.
5. Ensure Firefox remains the correctness baseline (no CSP regressions).

Deliverables:

- Build pipeline that emits the same paths with correct formats per entry
- Content scripts remain non-module at runtime
- Options page may be module output

Commit (make commitlint friendly):

- "build: modernize extension build pipeline"

Notes:

- This task **must land before any refactor that introduces shared imports**
  into content scripts or Firefox background.
