# Scene Cards (StashDB) – Detection, Extraction, and Augmentation

This document describes how Stasharr should find and augment **Scene Cards** on `https://stashdb.org`
(list/browse/search pages that show multiple scenes as cards or rows).

**Why this exists**

- Scene cards are a core interaction surface (bulk browsing, quick actions).
- StashDB is a SPA; DOM changes over time (infinite scroll, client-side navigation).
- The extension must be robust to DOM churn and must not rely on brittle selectors.

> NOTE: This doc intentionally prefers **semantic URL/link-based detection** over CSS classnames.

---

## Where Scene Cards appear

Scene cards commonly appear on pages that list many scenes (e.g., browse, search, studio/performer related listings).

---

## Architectural constraints (important)

- Content scripts may **read DOM, inject UI, and message background**.
- Content scripts may **NOT** fetch LAN endpoints (Whisparr/Stash). Background only.
- Scene card augmentation must be done without injecting page scripts (`<script>` tags).

(See `/extension/docs/ARCHITECTURE.md` for authoritative rules.)

---

## Detection strategy (preferred)

### 1) Identify Scene Cards by scene links (most stable)

A “Scene Card” is any repeated UI container that contains an anchor linking to a scene details route.

**Primary heuristic**

- Find anchors with an `href` that matches the scene route pattern.

Typical route shape:

- `/scenes/<id>` (id may be UUID-like or numeric depending on StashDB evolution)

**Recommended selector approach**

- Query within a candidate card container for:
  - `a[href^="/scenes/"]`

Then treat the _nearest repeated container_ as the card element:

- `anchor.closest(<card-ish container>)`

Because StashDB markup can change, do not hardcode a single class as “the card.”
Instead, define a list of candidate “card container” selectors and fall back to
a safe default like `anchor.closest("article, li, .card, [class*='Card']")`.

### 2) Optional: Use known “Card-ish” class patterns as hints

If you find stable card container classes in practice, maintain them as _optional hints_:

- `[class*="SceneCard"]`
- `[class*="Card"]`
- `[data-testid*="scene"]` (if StashDB uses test ids)

Treat these as accelerators, not dependencies.

---

## Extracting a stable Scene identifier

### Canonical extraction (best)

Extract the canonical scene URL from the anchor:

- `const href = anchor.getAttribute("href")`
- Normalize to absolute URL:
  - `new URL(href, location.origin).toString()`

Then parse an ID from the URL path:

- `/scenes/<sceneId>`

**Store both**

- `sceneId` (string) — parsed from URL
- `sceneUrl` (string) — absolute canonical URL

Reason:

- Some downstream logic may prefer URL (for cross-system linking)
- Some APIs may want the ID

### Fallback extraction (avoid if possible)

If a card does not contain a usable anchor, fallback to:

- dataset attributes (e.g., `data-scene-id`)
- embedded text/labels (fragile)

---

## UI injection guidelines

### Where to inject

Inject into a stable “action area” within the card if it exists.
If not, inject into the card container itself but avoid layout breakage.

Preferred:

- a button row / footer region / existing controls bar

Fallback:

- create a small absolutely-positioned overlay in a corner (top-right / bottom-right)
  using a unique container and minimal z-index.

### What to inject (baseline)

Keep v1 minimal:

- Badge: `Stasharr`
- Status placeholder: `unknown`
- A single button (placeholder) that triggers a background message:
  - e.g., `SCENE_CARD_ACTION_REQUESTED`

Do not implement networking or status lookups in the content layer.

### Uniqueness / idempotency

Every card augmentation must be idempotent:

- Add a marker attribute to the card once augmented:
  - `card.dataset.stasharrAugmented = "true"`
- Or check for a unique child container id/class before injecting.

---

## Lifecycle & SPA considerations

### MutationObserver is required

Cards can appear after initial page load via:

- infinite scroll
- filters/search updates
- client-side navigation

Use a MutationObserver on a high-level container (or `document.body` as fallback)
with debouncing to avoid heavy work per mutation.

### Cleanup

Track augmented cards in a `Map(sceneId -> injectedElement)` or `WeakMap(cardElement -> injectedElement)`.
When a card element is removed from DOM:

- remove injected UI
- detach listeners

### Avoid “scan the whole DOM” loops

Use incremental mutation processing:

- On added nodes, only scan within those nodes for matching anchors.

---

This document is about the **mechanics** of card augmentation only; feature scope is tracked separately.

---

## Manual verification checklist (dev)

Use these checks during development:

1. Open a StashDB page that shows multiple scenes (grid/list).
2. Confirm every scene card:
   - gets exactly one Stasharr injected element
   - does not shift layout noticeably
3. Scroll / paginate / change filters:
   - newly added cards are augmented
4. Navigate to another list page (SPA route change):
   - previous augmentations do not duplicate
   - no orphan nodes remain
5. Click the injected button:
   - it sends a runtime message (no fetch from content)
   - UI updates locally (e.g., “clicked/queued”)

6. Missing-file search action:
   - cards with `hasFile=false` show a warning + search icon
   - clicking the search icon triggers background command and shows loading/success/error

---

## Open questions / TODOs

- Confirm the most stable card container selector(s) for current StashDB UI.
- Decide whether to support both grid and table row layouts explicitly.
- Add batching strategy for status checks (future task):
  - background message receives many sceneIds/urls at once
  - response cached to prevent “Whisparr DDOS” patterns
