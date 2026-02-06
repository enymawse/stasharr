# Feature Parity Checklist (Legacy Userscript Reference)

This checklist is derived from the legacy userscript behavior for reference only.
Do not import or bundle legacy code. All networking remains background-only.

## Supported StashDB Page Types

- [ ] Scene list pages (any view rendering `.SceneCard` / `.scenes-list`)
- [x] Scene details page (`/scenes/<stash-id>`)
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

- [x] Add/Search/Status button on each scene card
- [ ] Scene status stored on card via `data-stasharr-scenestatus`
- [x] Whisparr link button appears when scene exists in Whisparr
- [x] Stash link button appears when Stash config is valid and scene exists
- [ ] Copy Stash ID button on each card's action button area

### Scene Card Status Indicators

- [x] "Already Downloaded" state (disabled, success icon)
- [ ] "In Whisparr" state (searchable, tooltip explains monitored state)
- [x] "Add to Whisparr" state (download icon)
- [x] "Excluded" state (disabled, excluded icon)
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

- [x] Base URL
- [x] API key
- [x] Quality profile selection (from Whisparr)
- [x] Root folder selection (from Whisparr)
- [x] Tags multi-select (from Whisparr)
- [x] System status gate (selectors only after validation)

### Stash App

- [x] Stash base URL
- [x] Stash API key

### General

- [x] Open links in new tab toggle

## Required Settings by Action

### Whisparr actions (all)

- [x] Whisparr base URL
- [x] Whisparr API key

### Add scene / add studio / add performer

- [x] Quality profile
- [x] Root folder path
- [ ] Search-on-add flag
- [x] Tags (optional)

### Search in Whisparr (single/bulk)

- [x] Whisparr base URL + API key

### Scene details (quality + size)

- [x] Whisparr base URL + API key

### Whisparr link buttons

- [x] Whisparr base URL

### Stash links + details

- [x] Stash base URL
- [x] Stash API key (required to resolve Stash scene ID)

### Add All Missing (comparison workflow)

- [ ] Whisparr base URL + API key
- [ ] StashDB authenticated (stashbox cookie)
- [ ] Exclusion list access

## Status/Badge Behavior

- [x] Card buttons reflect status: downloaded / searchable / add / excluded
- [x] Excluded scenes never offer add/search
- [ ] Progress modal shows skipped counts and reason
- [ ] Scene card UI refreshes after bulk operations

## Backend Endpoints Used (Reference)

### Whisparr REST (base: `/api/v3/`)

- [x] `system/status` (validation gate)
- [ ] `health` (health check)
- [x] `qualityProfile` (quality profiles)
- [x] `rootFolder` (root folders)
- [x] `tag` (tags)
- [x] `movie?stashId=<id>` (scene lookup)
- [x] `lookup/scene?term=stash:<id>` (scene lookup + add)
- [x] `movie` (POST add scene)
- [ ] `movie?page=<n>&pageSize=<n>` (inventory for comparison)
- [x] `command` (MoviesSearch)
- [ ] `performer?stashId=<id>` (performer lookup)
- [ ] `performer` (POST add performer)
- [ ] `performer/<id>` (PUT update performer monitoring)
- [ ] `studio?stashId=<id>` (studio lookup)
- [ ] `studio` (POST add studio)
- [ ] `studio/<id>` (PUT update studio monitoring)
- [x] `exclusions` (GET list, POST add)
- [x] `exclusions?stashId=<id>` (GET by stashId)
- [x] `exclusions/<id>` (DELETE)

### StashDB GraphQL

- [ ] `https://stashdb.org/graphql` (`queryScenes`, `findScene`)
- [ ] Requires `stashbox` cookie

### Stash GraphQL

- [x] `{stashBaseUrl}/graphql` (`systemStatus`, `findScenes` by `stash_id`)
