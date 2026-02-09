# Stasharr Extension

## Build

From repo root:

```bash
npm ci
npm run build
```

Outputs:

- `dist/chrome`
- `dist/firefox`

## Permissions note

- Current host permissions include `http://*/*` to allow LAN test calls from the background script.
- Task 3 will switch to optional host permissions with explicit user approval.

## Load unpacked in Chrome

1. Open `chrome://extensions/`.
2. Enable **Developer mode**.
3. Click **Load unpacked**.
4. Select `dist/chrome`.

## Load temporary add-on in Firefox

1. Open `about:debugging#/runtime/this-firefox`.
2. Click **Load Temporary Add-on**.
3. Select `dist/firefox/manifest.json`.

## Packaging

```bash
npm run pack:chrome
npm run pack:firefox
```

Outputs:

- `dist/stasharr-chrome.zip`
- `dist/stasharr-firefox.zip`
