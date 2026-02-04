# Stash Integration – Feature Parity Checklist

This document defines the **current** Stash integration scope for the extension.
It is intentionally narrow and only tracks what Stasharr **claims today**.

Claimed feature statement:

- "View in Stash — Direct link to scene in your Stash instance (if configured)"

---

## What "Stash integration" means here

Stash integration in this extension is limited to **exposing a direct "View in Stash" link**
from StashDB surfaces where a scene is visible.

The link appears in:

- The StashDB **scene page** (single-scene detail view)
- StashDB **scene cards** (lists/grid/search results)

No other Stash actions are part of this scope.

---

## Required settings

These settings must be present for Stash integration to be considered configured:

- `stashBaseUrl` (explicit protocol, e.g., `http://` or `https://`)
- `stashApiKey`

If either value is missing, Stash integration is treated as **not configured**.

---

## UX expectations for "View in Stash"

- Only render the link when Stash is configured (`stashBaseUrl` + `stashApiKey`).
- The link should open the user’s Stash instance directly to the matching scene.
- The link should be clearly labeled as "View in Stash."
- When not configured, do not show a misleading link (omit or show a setup hint).

---

## Feature parity checklist (Stash only)

- [ ] Scene page shows a "View in Stash" link when configured.
- [ ] Scene cards show a "View in Stash" link when configured.
- [ ] The link targets the user’s Stash instance (uses `stashBaseUrl`).
- [ ] The link resolves to the correct scene in Stash (direct scene URL).
- [ ] When not configured, the link is not shown or is replaced with a setup hint.
