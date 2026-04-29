import * as MediaLibrary from 'expo-media-library';

const resolvedUriCache = new Map<string, string>();
const resolvingUriCache = new Map<string, Promise<string>>();
const MAX_RESOLVED_URI_CACHE = 160;

export function isUnsupportedMediaUri(uri: string): boolean {
  return uri.startsWith('ph://');
}

function requiresResolution(uri: string): boolean {
  return uri.startsWith('ph://');
}

export function getCachedResolvedMediaUri(assetId: string, fallbackUri: string): string {
  return resolvedUriCache.get(assetId) ?? fallbackUri;
}

function setResolvedMediaUri(assetId: string, uri: string): void {
  if (resolvedUriCache.has(assetId)) {
    resolvedUriCache.delete(assetId);
  }

  resolvedUriCache.set(assetId, uri);

  while (resolvedUriCache.size > MAX_RESOLVED_URI_CACHE) {
    const oldest = resolvedUriCache.keys().next().value;
    if (!oldest) {
      break;
    }
    resolvedUriCache.delete(oldest);
  }
}

export function clearResolvedMediaUri(assetId: string): void {
  resolvedUriCache.delete(assetId);
  resolvingUriCache.delete(assetId);
}

export function pruneResolvedMediaUriCache(keepAssetIds: string[]): void {
  const keepSet = new Set(keepAssetIds);

  for (const assetId of resolvedUriCache.keys()) {
    if (!keepSet.has(assetId)) {
      resolvedUriCache.delete(assetId);
    }
  }

  for (const assetId of resolvingUriCache.keys()) {
    if (!keepSet.has(assetId)) {
      resolvingUriCache.delete(assetId);
    }
  }
}

export async function resolveMediaUri(assetId: string, fallbackUri: string): Promise<string> {
  const cachedUri = resolvedUriCache.get(assetId);
  if (cachedUri) {
    setResolvedMediaUri(assetId, cachedUri);
    return cachedUri;
  }

  if (!requiresResolution(fallbackUri)) {
    setResolvedMediaUri(assetId, fallbackUri);
    return fallbackUri;
  }

  const inFlight = resolvingUriCache.get(assetId);
  if (inFlight) {
    return inFlight;
  }

  const resolver = (async () => {
    try {
      const info = await MediaLibrary.getAssetInfoAsync(assetId);
      const resolvedUri = info.localUri ?? info.uri ?? fallbackUri;
      setResolvedMediaUri(assetId, resolvedUri);
      return resolvedUri;
    } catch {
      return fallbackUri;
    } finally {
      resolvingUriCache.delete(assetId);
    }
  })();

  resolvingUriCache.set(assetId, resolver);
  return resolver;
}
