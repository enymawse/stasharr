# Stasharr

![GitHub Release](https://img.shields.io/github/v/release/enymawse/stasharr?style=for-the-badge)
![GitHub License](https://img.shields.io/github/license/enymawse/stasharr?style=for-the-badge)
![GitHub Actions Workflow Status](https://img.shields.io/github/actions/workflow/status/enymawse/stasharr/release-please.yml?style=for-the-badge)
[![Commitizen friendly](https://img.shields.io/badge/commitizen-friendly-brightgreen.svg?style=for-the-badge)](http://commitizen.github.io/cz-cli/)

**A browser extension that augments StashDB with Whisparr and Stash integrations.**

## Repository Layout

- `src/` — Extension source (content scripts + background services)
- `scripts/` — Build/pack scripts
- `manifest/` — Chrome/Firefox manifests
- `docs/` — Architecture and development notes

## Features

- Scene card actions: add to Whisparr, trigger search for missing files, monitor/unmonitor, exclude/include
- Status indicators on scene cards (in library, missing file, excluded, error)
- Scene details panel with status, quality profile selection, tags editing, and monitor/exclude toggles
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

### Scene details pages

- A fixed extension panel shows scene status and actions.
- Update quality profile and tags directly from the panel.

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
