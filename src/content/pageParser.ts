import { parseStashDbPage } from './parsing.js';

// Attach to global for non-module content script usage.
(globalThis as { StasharrPageParser?: { parseStashDbPage: typeof parseStashDbPage } }).StasharrPageParser =
  { parseStashDbPage };
