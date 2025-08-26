# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Stasharr is a userscript that integrates StashDB with Whisparr (v3+) and Stash applications. It allows users to add scenes from StashDB directly to Whisparr and provides monitoring capabilities for studios and performers.

## Tech Stack

- **Framework**: SolidJS with TypeScript
- **Build Tool**: Webpack with webpack-userscript plugin
- **Styling**: SCSS with Bootstrap integration
- **Code Quality**: ESLint, Prettier, Husky for git hooks
- **Package Manager**: npm
- **Target**: Browser userscript (Tampermonkey/Violentmonkey)

## Development Commands

```bash
# Install dependencies
npm ci

# Start development server with hot reload
npm run dev

# Build production userscript
npm run build

# Lint and fix code
npm run lint

# Commit with conventional commits
npm run cm
```

## Architecture Overview

### Entry Point

- `src/index.tsx`: Main entry point that initializes all controllers
- Controllers are instantiated with a shared `Config` instance

### Core Architecture Patterns

**Controller Pattern**: Each page type has a dedicated controller:

- `NavbarController`: Handles navigation elements
- `PerformerController`: Manages performer pages
- `StudioController`: Handles studio pages
- `ScenesListController`: Manages scene listing pages
- `CardController`: Handles scene cards
- `DetailsController`: Manages scene detail pages

**Observer Pattern**: Uses `MutationObserverFactory` to watch for DOM changes and react accordingly via `MutationHandler` implementations.

**Service Layer**: API interactions are handled by service classes:

- `WhisparrService`: Whisparr API integration
- `StashSceneService`: Stash GraphQL API
- `ServiceBase`: Base class with common HTTP request functionality

### Key Components Structure

```
src/
├── controller/          # Page-specific controllers using MutationObserver pattern
├── components/          # SolidJS React components for UI elements
├── service/            # API service layer for Whisparr/Stash integration
├── mutation-handlers/  # DOM mutation event handlers
├── builder/           # Payload builders for API requests
├── models/            # Configuration and data models with Zod validation
├── contexts/          # SolidJS contexts for state management
├── enums/            # TypeScript enums for constants
├── types/            # TypeScript type definitions
├── styles/           # SCSS stylesheets with Bootstrap integration
└── util/             # Utility functions
```

### Configuration System

- `Config` class manages user settings with persistence via `GM_setValue`/`GM_getValue`
- Zod validation schemas in `ConfigValidation.ts` ensure type safety
- Settings include Whisparr/Stash API credentials, quality profiles, root folders

### Build Process

- Webpack bundles TypeScript/SolidJS into a single userscript file
- Development mode creates proxy script for hot reloading
- Production mode minifies and optimizes the output
- `metadata.js` defines userscript headers and permissions

### Userscript Integration

- Uses Greasemonkey/Tampermonkey APIs (`GM_*` functions)
- Targets `stashdb.org` domain exclusively
- Requires permissions for cross-origin requests to user's Whisparr/Stash instances

## Development Setup

1. Enable Tampermonkey access to local file URIs
2. Run `npm run dev` to start webpack dev server on port 8080
3. Install the proxy script from `http://localhost:8080/stasharr.dev.proxy.user.js`
4. Changes auto-recompile; reload userscript in browser to see updates

## Testing

No specific test framework is configured. Manual testing is done by:

1. Installing the development userscript
2. Navigating to StashDB and testing functionality
3. Verifying integration with Whisparr/Stash instances
