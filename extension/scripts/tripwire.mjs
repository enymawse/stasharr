import { readdir, readFile, stat } from 'node:fs/promises';
import { resolve, extname } from 'node:path';

const distRoot = resolve(new URL('.', import.meta.url).pathname, '..', 'dist');
const forbiddenStrings = ['==UserScript==', 'GM_', 'Violentmonkey', 'Tampermonkey'];
const forbiddenExtensions = new Set(['.user.js']);

const failures = [];

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = resolve(dir, entry.name);
    if (entry.isDirectory()) {
      await walk(fullPath);
      continue;
    }
    const ext = extname(entry.name);
    if (forbiddenExtensions.has(ext)) {
      failures.push(`Forbidden file extension found: ${fullPath}`);
    }

    const fileStats = await stat(fullPath);
    if (fileStats.size === 0) {
      continue;
    }

    let content;
    try {
      content = await readFile(fullPath, 'utf8');
    } catch {
      continue;
    }

    for (const token of forbiddenStrings) {
      if (content.includes(token)) {
        failures.push(`Forbidden token "${token}" found in ${fullPath}`);
      }
    }
  }
}

await walk(distRoot);

function collectStrings(value, strings = []) {
  if (typeof value === 'string') {
    strings.push(value);
  } else if (Array.isArray(value)) {
    for (const item of value) {
      collectStrings(item, strings);
    }
  } else if (value && typeof value === 'object') {
    for (const item of Object.values(value)) {
      collectStrings(item, strings);
    }
  }
  return strings;
}

const manifestTargets = ['chrome', 'firefox'];
for (const target of manifestTargets) {
  const manifestPath = resolve(distRoot, target, 'manifest.json');
  const manifestContent = await readFile(manifestPath, 'utf8');
  const manifest = JSON.parse(manifestContent);

  const manifestStrings = collectStrings(manifest);
  const forbiddenPathFragments = ['../', '..\\', '/legacy/', '\\legacy\\'];
  for (const value of manifestStrings) {
    if (forbiddenPathFragments.some((fragment) => value.includes(fragment))) {
      failures.push(`Manifest references path outside /extension: ${value}`);
    }
  }
}

if (failures.length > 0) {
  console.error('Extension tripwire failed:');
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}
