# StashDB Page Parsing (Content Script)

This document describes the page parsing logic used by the extension content script.
No networking is performed in parsing.

## Goals
- Identify page type (scene now; studio/performer placeholders).
- Extract stable scene identifiers from URL/DOM.
- Produce a canonical StashDB URL for the entity.

## Data Shape
The parser returns:
- `type`: `scene` | `studio` | `performer` | `other`
- `stashIds`: array of detected UUIDs
- `canonicalUrl`: canonical StashDB URL for the entity (or null)
- `url`: current page URL

## Detection Logic
1. Determine type from pathname prefix:
   - `/scenes/` -> scene
   - `/studios/` -> studio
   - `/performers/` -> performer
   - otherwise -> other
2. Collect UUIDs from:
   - `/scenes/<uuid>` in the current URL
   - any UUID segment in the current pathname
   - `<link rel="canonical" href="...">` when present
3. For scene pages, build `canonicalUrl` as:
   - `https://stashdb.org/scenes/<uuid>` (origin from current URL)
   - null if no UUID is available

## Examples
- URL: `https://stashdb.org/scenes/123e4567-e89b-12d3-a456-426614174000`
  - type: `scene`
  - stashIds: `[123e4567-e89b-12d3-a456-426614174000]`
  - canonicalUrl: `https://stashdb.org/scenes/123e4567-e89b-12d3-a456-426614174000`

- URL: `https://stashdb.org/performers/aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee`
  - type: `performer`
  - stashIds: `[aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee]`
  - canonicalUrl: null

- URL: `https://stashdb.org/scenes/123...` with canonical link to another scene
  - stashIds includes both URL + canonical UUIDs (deduped)
