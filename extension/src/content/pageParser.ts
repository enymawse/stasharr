type StashDbPageType = 'scene' | 'studio' | 'performer' | 'other';

type StashDbPageParseResult = {
  type: StashDbPageType;
  stashIds: string[];
  canonicalUrl: string | null;
  url: string;
};

const UUID_RE =
  /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

function isUuid(value: string | null | undefined): value is string {
  if (!value) return false;
  return UUID_RE.test(value);
}

function extractUuidFromPath(pathname: string): string | null {
  const segments = pathname.split('/').filter(Boolean);
  for (const segment of segments) {
    if (isUuid(segment)) return segment;
  }
  return null;
}

function extractSceneIdFromUrl(url: URL): string | null {
  if (!url.pathname.startsWith('/scenes/')) return null;
  const match = url.pathname.match(/\/scenes\/([^/]+)/i);
  const candidate = match?.[1] ?? null;
  return isUuid(candidate) ? candidate : null;
}

function extractSceneIdFromCanonical(
  doc: Document,
  origin: string,
): string | null {
  const canonical = doc.querySelector('link[rel="canonical"]')?.getAttribute('href');
  if (!canonical) return null;
  try {
    const canonicalUrl = new URL(canonical, origin);
    return extractSceneIdFromUrl(canonicalUrl);
  } catch {
    return null;
  }
}

function parseStashDbPage(
  doc: Document = document,
  locationObj: Location = window.location,
): StashDbPageParseResult {
  const url = new URL(locationObj.href);
  let type: StashDbPageType = 'other';
  const stashIds = new Set<string>();

  if (url.pathname.startsWith('/scenes/')) {
    type = 'scene';
  } else if (url.pathname.startsWith('/studios/')) {
    type = 'studio';
  } else if (url.pathname.startsWith('/performers/')) {
    type = 'performer';
  }

  const sceneIdFromUrl = extractSceneIdFromUrl(url);
  if (sceneIdFromUrl) {
    stashIds.add(sceneIdFromUrl);
  }

  const sceneIdFromPath = extractUuidFromPath(url.pathname);
  if (sceneIdFromPath) {
    stashIds.add(sceneIdFromPath);
  }

  const sceneIdFromCanonical = extractSceneIdFromCanonical(doc, url.origin);
  if (sceneIdFromCanonical) {
    stashIds.add(sceneIdFromCanonical);
  }

  let canonicalUrl: string | null = null;
  if (type === 'scene') {
    const primaryId = stashIds.values().next().value;
    if (primaryId) {
      canonicalUrl = `${url.origin}/scenes/${primaryId}`;
    }
  }

  return {
    type,
    stashIds: Array.from(stashIds),
    canonicalUrl,
    url: url.toString(),
  };
}

// Attach to global for non-module content script usage.
(globalThis as { StasharrPageParser?: { parseStashDbPage: typeof parseStashDbPage } }).StasharrPageParser =
  { parseStashDbPage };
