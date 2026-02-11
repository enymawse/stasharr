<img src="docs/assets/brand/stasharr-128.png" alt="Stasharr logo" width="128">

# Stasharr — StashDB Extension

[![GitHub Release](https://img.shields.io/github/v/release/enymawse/stasharr?filter=!v.*.*.*&style=for-the-badge)](https://github.com/enymawse/stasharr/releases?q=stasharr-extension)
[![GitHub License](https://img.shields.io/github/license/enymawse/stasharr?style=for-the-badge)](https://github.com/enymawse/stasharr/blob/main/LICENSE)
![GitHub Actions Workflow Status](https://img.shields.io/github/actions/workflow/status/enymawse/stasharr/release-please.yml?branch=extension&style=for-the-badge)
[![Commitizen friendly](https://img.shields.io/badge/commitizen-friendly-brightgreen.svg?style=for-the-badge)](http://commitizen.github.io/cz-cli/)

[![Mozilla Add-on Version](https://img.shields.io/amo/v/stasharr?style=for-the-badge)](https://addons.mozilla.org/en-US/firefox/addon/stasharr/)
[![Static Badge](https://img.shields.io/badge/firefox_add_on-manual_install-orange?style=for-the-badge&label=mozilla%20add-on)](https://github.com/enymawse/stasharr/releases?q=stasharr-extension)
[![Static Badge](https://img.shields.io/badge/chrome_extension-manual_install-brightgreen?style=for-the-badge)](https://github.com/enymawse/stasharr/releases?q=stasharr-extension)

**A browser extension that augments StashDB with Whisparr and Stash integrations.**

<img width="1218" height="269" alt="Screenshot 2026-02-10 064630" src="https://github.com/user-attachments/assets/44694327-38c5-4221-b583-e49a3ebbafd8" />

## Repository Layout

- `src/` — Extension source (content scripts + background services)
- `scripts/` — Build/pack scripts
- `manifest/` — Chrome/Firefox manifests
- `docs/` — Architecture and development notes

## Features

- Scene card actions: add to Whisparr, trigger search for missing files, monitor/unmonitor, exclude/include
- Status indicators on scene cards (in library, missing file, excluded, error)
- Bulk actions on list pages (Add All / Search All / Add Missing) with progress modal feedback
- Scene details panel with status, quality profile selection, tags editing, and monitor/exclude toggles
- Performer and studio panels with status, add/check, monitor toggle, tags/quality editing, and Whisparr links
- Copy StashDB scene IDs from scene cards and the scene details panel
- Direct links to Whisparr and Stash scenes (when configured)
- Options UI with validation and discovery for quality profiles, root folders, and tags
- Background-only networking for LAN services (Firefox-safe)

## Installation (local build)

From repo root:

```bash
npm ci
npm run build
```

Build outputs:

- `dist/chrome`
- `dist/firefox`

### Load unpacked in Chrome

1. Open `chrome://extensions/`.
2. Enable **Developer mode**.
3. Click **Load unpacked**.
4. Select `dist/chrome`.

### Load temporary add-on in Firefox

1. Open `about:debugging#/runtime/this-firefox`.
2. Click **Load Temporary Add-on**.
3. Select `dist/firefox/manifest.json`.

## Configuration

1. Open the extension’s options page.
2. Configure Whisparr: base URL (include protocol) and API key, then validate and refresh lists.
3. Configure Stash (optional): base URL (include protocol) and API key.
4. Choose whether external links open in a new tab.

The extension will request host permissions for configured domains. Grant access
for Whisparr/Stash to enable API calls.

## Usage

### Scene list pages

- Each scene card gets a status indicator and action row.
- Actions include Add, Search (for missing files), Monitor/Unmonitor, Exclude/Include.
- View buttons jump directly to Whisparr or Stash scenes when configured.
- Bulk actions are available on list pages and show progress in a modal.

### Scene details pages

- A fixed extension panel shows scene status and actions.
- Update quality profile and tags directly from the panel.
- Copy the StashDB scene ID from the panel.

### Performer and studio pages

- A fixed extension panel shows status and actions.
- Add/Check, Monitor toggle, update quality profile and tags, and open in Whisparr.

## Troubleshooting

- **Buttons not appearing:** Reload StashDB and confirm the extension is enabled.
- **Permission errors:** Ensure the configured domains were granted host permissions.
- **Validation failures:** Base URLs must include `http://` or `https://`.

## Development

From repo root:

```bash
npm run lint
npm run build
npm run tripwire
```

## License

This project is released under the **GNU General Public License v3.0**.
See `LICENSE` for details.

## Credits

**Created by [enymawse](https://github.com/enymawse)**  
Original inspiration from [randybudweiser's stash2whisparr](https://github.com/randybudweiser/stash2whisparr)
