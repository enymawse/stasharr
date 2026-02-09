# Stasharr Extension – Architecture & Constraints

## Purpose

This document defines the **authoritative architecture** for the Stasharr browser extension.

It exists to:

- Enforce correct browser-extension layering
- Avoid known Firefox CSP and HTTPS-upgrade failures
- Serve as required context for Codex and human contributors

If this document conflicts with assumptions made elsewhere, **this document wins**.

---

## High-Level Design

Stasharr is a **standalone browser extension** (Chrome + Firefox) that integrates with
LAN-hosted services (e.g., Whisparr, Stash) while injecting UI into `https://stashdb.org`.

Key principles:

- **Extension-native implementation** (no userscripts)
- **Strict separation of concerns**
- **Background-only networking**
- **Explicit protocol handling (`http://` vs `https://`)**

---

## Repository Structure (Authoritative)

```

/src/
/background/        # ALL networking, API clients, permissions
/content/           # UI injection + DOM parsing + options UI (NO networking)
/shared/            # Types & helpers (no side effects)
/manifest/          # Chrome/Firefox manifests
/scripts/           # Build/pack/tripwire scripts
/docs/
ARCHITECTURE.md     # This file
/dist/              # Build output

```

---

## Non-Negotiable Constraints

### 1. Background-only networking (MANDATORY)

**ALL** HTTP/LAN/API requests **must** be executed from:

```

/src/background/**

```

❌ Forbidden locations for networking:

- content scripts
- page-injected scripts (`<script>` tags)
- options page
- popup page
- shared helpers used by document contexts

✔ Allowed pattern:

```

content/options → runtime.sendMessage → background → fetch()

```

This is enforced by:

- architectural separation
- runtime dev guards
- CI string scans

---

### 2. Firefox CSP constraint (critical)

`https://stashdb.org` sends a Content Security Policy including:

```

upgrade-insecure-requests

```

Implications:

- Any HTTP request originating from a **document context**
  (page, content script, injected script, options page)
  will be **forcibly upgraded to HTTPS by Firefox**
- This breaks LAN services that run on HTTP (e.g., `http://whisparr.lan`)

**Therefore:**

> Any HTTP request that is upgraded to HTTPS in Firefox indicates an architectural bug.

Correct fix is **never** a Firefox setting workaround.
Correct fix is **background-only networking**.

---

### 3. Content scripts are UI-only

Content scripts may:

- Read the DOM
- Parse the current URL
- Render extension UI
- Read extension storage
- Send messages to background

Content scripts may NOT:

- call `fetch`
- call `XMLHttpRequest`
- import API clients
- know API endpoints
- know API keys

A DEV-only fetch trap is used to enforce this.

---

### 4. Options UI has no direct network access

The Options page:

- Collects configuration (base URLs, API keys)
- Requests optional host permissions
- Displays validation results

But:

- It **must not** fetch APIs directly
- Validation is done via background messaging

---

### 5. Explicit protocol handling

- Users must specify `http://` or `https://` explicitly
- The extension must **never infer or auto-upgrade**
- `.lan` hostnames are valid but problematic in Firefox
- IP addresses are always acceptable

If HTTPS is attempted when HTTP was configured, the extension must:

- Detect the failure
- Explain it clearly
- Offer alternatives (IP address or HTTPS reverse proxy)

---

## Permissions Model

- Use **optional host permissions**
- Never request global wildcards (`http://*/*`)
- Permissions are requested only after user configuration
- Permissions are scheme-aware (`http://` vs `https://`)

---

## Cross-Browser Notes

### Chrome

- More permissive networking
- CSP upgrade issues are less visible
- Still must follow architecture to avoid hidden bugs

### Firefox

- Strict CSP enforcement
- HTTPS-first / upgrade behavior for subresources
- Exposes architectural violations immediately

**Firefox behavior is the correctness baseline.**

---

## CI / Build Guardrails

Builds must fail if:

- Content or Options bundles contain:
  - `/api/v3`
  - known LAN hostnames
  - `http://`
  - `X-Api-Key`
- Any fetch/XHR is detected outside background bundles

These guards exist to protect architecture integrity over time.

---

## Development Philosophy

- **Constraints over convenience**
- **Architecture before features**
- **Firefox correctness over Chrome permissiveness**
- **Explicit boundaries > implicit behavior**

If something “works in Chrome but not Firefox,”
assume the architecture is wrong until proven otherwise.

---

## For Codex / AI Agents

When working on this repo:

- Treat this file as authoritative
- Do not “optimize” around constraints
- Do not introduce cross-layer imports
- Prefer small, vertical, verifiable changes

Violating these rules will break Firefox and will be rejected.

---

## Summary (TL;DR)

- Networking: **background only**
- Content/Options: **UI only**
- Firefox CSP: **non-negotiable**
- Explicit protocol: **required**
- CI guards: **intentional**

This architecture is deliberate.  
Do not fight it—work with it.
