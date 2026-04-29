import { Image, NativeModules, Platform } from 'react-native';

import { MediaItem } from '@/types';
import {
  getCachedResolvedMediaUri,
  isUnsupportedMediaUri,
  resolveMediaUri,
} from '@/utils/resolveMediaUri';

type PreviewPreset = 'card' | 'list' | 'prefetch';

type CropImageOptions = {
  offset: { x: number; y: number };
  size: { width: number; height: number };
  displaySize?: { width: number; height: number };
  resizeMode?: 'cover' | 'contain' | 'stretch' | 'center' | 'repeat';
};

type ImageEditingManager = {
  cropImage: (
    uri: string,
    cropData: CropImageOptions,
    successCallback: (uri: string) => void,
    errorCallback: (error: string) => void
  ) => void;
};

const previewUriCache = new Map<string, string>();
const resolvingPreviewUriCache = new Map<string, Promise<string>>();
const MAX_PREVIEW_URI_CACHE = 240;

const PRESET_SIZE: Record<PreviewPreset, { width: number; height: number }> = {
  card: { width: 900, height: 1260 },
  list: { width: 140, height: 140 },
  prefetch: { width: 520, height: 780 },
};

function createPreviewKey(assetId: string, preset: PreviewPreset): string {
  return `${assetId}:${preset}`;
}

function touchPreviewCache(key: string, uri: string): void {
  if (previewUriCache.has(key)) {
    previewUriCache.delete(key);
  }

  previewUriCache.set(key, uri);

  while (previewUriCache.size > MAX_PREVIEW_URI_CACHE) {
    const oldest = previewUriCache.keys().next().value;
    if (!oldest) {
      break;
    }
    previewUriCache.delete(oldest);
  }
}

function touchPendingPreview(key: string, resolver: Promise<string>): void {
  resolvingPreviewUriCache.set(key, resolver);
}

function isCropSupported(uri: string, mediaType: MediaItem['mediaType']): boolean {
  if (Platform.OS === 'web' || Platform.OS === 'ios') {
    return false;
  }

  if (mediaType !== 'photo') {
    return false;
  }

  if (isUnsupportedMediaUri(uri)) {
    return false;
  }

  return uri.startsWith('file://') || uri.startsWith('content://');
}

function getImageEditingManager(): ImageEditingManager | null {
  const module = NativeModules.ImageEditingManager as ImageEditingManager | undefined;
  if (!module?.cropImage) {
    return null;
  }
  return module;
}

async function getImageSize(uri: string, item: MediaItem): Promise<{ width: number; height: number }> {
  if (item.width > 0 && item.height > 0) {
    return { width: item.width, height: item.height };
  }

  return new Promise((resolve) => {
    Image.getSize(
      uri,
      (width, height) => resolve({ width, height }),
      () => resolve(PRESET_SIZE.card)
    );
  });
}

async function cropImageAsync(uri: string, options: CropImageOptions): Promise<string> {
  const manager = getImageEditingManager();
  if (!manager) {
    return uri;
  }

  return new Promise((resolve) => {
    manager.cropImage(
      uri,
      options,
      (nextUri) => {
        if (!nextUri || nextUri.startsWith('rct-image-store://')) {
          resolve(uri);
          return;
        }
        resolve(nextUri);
      },
      () => resolve(uri)
    );
  });
}

async function createOptimizedPreview(
  uri: string,
  item: MediaItem,
  preset: PreviewPreset
): Promise<string> {
  if (!isCropSupported(uri, item.mediaType)) {
    return uri;
  }

  const source = await getImageSize(uri, item);
  const target = PRESET_SIZE[preset];
  const sourceWidth = Math.max(1, Math.round(source.width));
  const sourceHeight = Math.max(1, Math.round(source.height));

  // Already near target resolution; keep source to avoid extra transforms.
  if (sourceWidth <= target.width * 1.15 && sourceHeight <= target.height * 1.15) {
    return uri;
  }

  const croppedUri = await cropImageAsync(uri, {
    offset: { x: 0, y: 0 },
    size: { width: sourceWidth, height: sourceHeight },
    displaySize: target,
    resizeMode: 'cover',
  });

  return croppedUri;
}

export function getCachedOptimizedPreviewUri(item: MediaItem, preset: PreviewPreset): string {
  const key = createPreviewKey(item.id, preset);
  const cached = previewUriCache.get(key);
  if (cached) {
    touchPreviewCache(key, cached);
    return cached;
  }

  return getCachedResolvedMediaUri(item.id, item.uri);
}

export async function resolveOptimizedPreviewUri(
  item: MediaItem,
  preset: PreviewPreset
): Promise<string> {
  const key = createPreviewKey(item.id, preset);
  const cached = previewUriCache.get(key);
  if (cached) {
    touchPreviewCache(key, cached);
    return cached;
  }

  const inFlight = resolvingPreviewUriCache.get(key);
  if (inFlight) {
    return inFlight;
  }

  const resolver = (async () => {
    try {
      const sourceUri = await resolveMediaUri(item.id, item.uri);
      const optimizedUri = await createOptimizedPreview(sourceUri, item, preset);
      if (optimizedUri.startsWith('rct-image-store://')) {
        touchPreviewCache(key, sourceUri);
        return sourceUri;
      }
      touchPreviewCache(key, optimizedUri);
      return optimizedUri;
    } catch {
      return item.uri;
    } finally {
      resolvingPreviewUriCache.delete(key);
    }
  })();

  touchPendingPreview(key, resolver);
  return resolver;
}

export function clearOptimizedPreviewCache(assetId: string): void {
  const prefix = `${assetId}:`;

  for (const key of previewUriCache.keys()) {
    if (key.startsWith(prefix)) {
      previewUriCache.delete(key);
    }
  }

  for (const key of resolvingPreviewUriCache.keys()) {
    if (key.startsWith(prefix)) {
      resolvingPreviewUriCache.delete(key);
    }
  }
}

export function pruneOptimizedPreviewCache(keepAssetIds: string[]): void {
  const keepSet = new Set(keepAssetIds);

  for (const key of previewUriCache.keys()) {
    const [assetId] = key.split(':');
    if (!keepSet.has(assetId)) {
      previewUriCache.delete(key);
    }
  }

  for (const key of resolvingPreviewUriCache.keys()) {
    const [assetId] = key.split(':');
    if (!keepSet.has(assetId)) {
      resolvingPreviewUriCache.delete(key);
    }
  }
}
