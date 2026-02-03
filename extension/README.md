# Stasharr Extension

## Build

From `extension/`:

```bash
npm ci
npm run build
```

Outputs:

- `extension/dist/chrome`
- `extension/dist/firefox`

## Load unpacked in Chrome

1. Open `chrome://extensions/`.
2. Enable **Developer mode**.
3. Click **Load unpacked**.
4. Select `extension/dist/chrome`.

## Load temporary add-on in Firefox

1. Open `about:debugging#/runtime/this-firefox`.
2. Click **Load Temporary Add-on**.
3. Select `extension/dist/firefox/manifest.json`.

## Packaging

```bash
npm run pack:chrome
npm run pack:firefox
```

Outputs:

- `extension/dist/stasharr-chrome.zip`
- `extension/dist/stasharr-firefox.zip`
