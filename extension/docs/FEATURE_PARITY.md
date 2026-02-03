# Feature Parity Checklist (Legacy Userscript Reference)

This checklist is derived from the legacy userscript behavior for reference only.
Do not import or bundle legacy code. All networking remains background-only.

## Supported StashDB Page Types
- [ ] Scene list pages (any view rendering `.SceneCard` / `.scenes-list`)
- [ ] Scene details page (`/scenes/<stash-id>`)
- [ ] Performer details page (`/performers/<stash-id>`)
- [ ] Studio details page (`/studios/<stash-id>`)
- [ ] Global navbar (Stasharr entry point)

## Scene List Page Features
### Bulk Actions (dropdown)
- [ ] "Stasharr Actions" dropdown renders above scene list
- [ ] Add All on Page (only scenes not in Whisparr)
- [ ] Search All on Page (only scenes in Whisparr without files)
- [ ] Add All Missing (cross-compare StashDB vs Whisparr, contextual to page)
- [ ] Confirmation modals for each bulk action
- [ ] Progress modal with per-item status and summary
- [ ] Empty-state modal info when no scenes match action

### Per-Scene Card UI
- [ ] Add/Search/Status button on each scene card
- [ ] Scene status stored on card via `data-stasharr-scenestatus`
- [ ] Whisparr link button appears when scene exists in Whisparr
- [ ] Stash link button appears when Stash config is valid and scene exists
- [ ] Copy Stash ID button on each card

### Scene Card Status Indicators
- [ ] "Already Downloaded" state (disabled, success icon)
- [ ] "In Whisparr" state (searchable, tooltip explains monitored state)
- [ ] "Add to Whisparr" state (download icon)
- [ ] "Excluded" state (disabled, excluded icon)
- [ ] Tooltips for all card buttons

## Scene Details Page Features
- [ ] Header action button (same behavior as card button)
- [ ] Details line shows size on disk and quality profile
- [ ] Whisparr badge link in details
- [ ] Stash badge link in details (when Stash config valid)
- [ ] Floating copy button for Stash ID

## Performer Page Features
- [ ] Add performer to Whisparr (plus icon when missing)
- [ ] Monitor/unmonitor toggle (bookmark icon state)
- [ ] Tooltip reflects current monitor action

## Studio Page Features
- [ ] Add studio to Whisparr (plus icon when missing)
- [ ] Monitor/unmonitor toggle (bookmark icon state)
- [ ] Tooltip reflects current monitor action

## Settings / Configuration UI
### Whisparr
- [ ] Base URL
- [ ] API key
- [ ] Quality profile selection (from Whisparr)
- [ ] Root folder selection (from Whisparr)
- [ ] Tags multi-select (from Whisparr)
- [ ] Search-on-add toggle
- [ ] System status gate (selectors only after validation)

### Stash App
- [ ] Stash base URL
- [ ] Stash API key

### General
- [ ] Open links in new tab toggle

## Required Settings by Action
### Whisparr actions (all)
- [ ] Whisparr base URL
- [ ] Whisparr API key

### Add scene / add studio / add performer
- [ ] Quality profile
- [ ] Root folder path
- [ ] Search-on-add flag
- [ ] Tags (optional)

### Search in Whisparr (single/bulk)
- [ ] Whisparr base URL + API key

### Scene details (quality + size)
- [ ] Whisparr base URL + API key

### Whisparr link buttons
- [ ] Whisparr base URL

### Stash links + details
- [ ] Stash base URL
- [ ] Stash API key (required to resolve Stash scene ID)

### Add All Missing (comparison workflow)
- [ ] Whisparr base URL + API key
- [ ] StashDB authenticated (stashbox cookie)
- [ ] Exclusion list access

## Status/Badge Behavior
- [ ] Card buttons reflect status: downloaded / searchable / add / excluded
- [ ] Excluded scenes never offer add/search
- [ ] Progress modal shows skipped counts and reason
- [ ] Scene card UI refreshes after bulk operations

## Backend Endpoints Used (Reference)
### Whisparr REST (base: `/api/v3/`)
- [ ] `system/status` (validation gate)
- [ ] `health` (health check)
- [ ] `qualityProfile` (quality profiles)
- [ ] `rootFolder` (root folders)
- [ ] `tag` (tags)
- [ ] `movie?stashId=<id>` (scene lookup)
- [ ] `lookup/scene?term=stash:<id>` (scene lookup + add)
- [ ] `movie` (POST add scene)
- [ ] `movie?page=<n>&pageSize=<n>` (inventory for comparison)
- [ ] `command` (MoviesSearch)
- [ ] `performer?stashId=<id>` (performer lookup)
- [ ] `performer` (POST add performer)
- [ ] `performer/<id>` (PUT update performer monitoring)
- [ ] `studio?stashId=<id>` (studio lookup)
- [ ] `studio` (POST add studio)
- [ ] `studio/<id>` (PUT update studio monitoring)
- [ ] `exclusions` (GET list, POST add)
- [ ] `exclusions?stashId=<id>` (GET by stashId)
- [ ] `exclusions/<id>` (DELETE)

### StashDB GraphQL
- [ ] `https://stashdb.org/graphql` (`queryScenes`, `findScene`)
- [ ] Requires `stashbox` cookie

### Stash GraphQL
- [ ] `{stashBaseUrl}/graphql` (`systemStatus`, `findScenes` by `stash_id`)

## Manual Smoke Test (Acceptance)
1. Configure Whisparr base URL and API key in Options, validate connection.
2. Confirm quality profiles, root folders, and tags populate after validation.
3. Select a quality profile, root folder, tags, and search-on-add; save.
4. Configure Stash base URL + API key; save; ensure validation passes (if present).
5. Open StashDB scene list page:
   - Confirm card buttons, copy button, and Stash/Whisparr link buttons.
   - Confirm scene status tooltips (downloaded/search/add/excluded).
6. Use "Stasharr Actions" dropdown:
   - Add All on Page (only NOT_IN_WHISPARR scenes)
   - Search All on Page (only EXISTS_AND_NO_FILE scenes)
   - Add All Missing (context-aware: studio/performer/global)
   - Confirm progress modal item statuses and completion summary.
7. Open a scene details page:
   - Header action button works (add or search)
   - Details line shows size + quality profile
   - Whisparr and Stash badges link correctly
   - Floating copy button copies Stash ID
8. Open performer and studio pages:
   - Add button appears when missing
   - Monitor toggle updates state and tooltip
9. Restart browser, reload StashDB, and confirm selections persist.
