import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';

import { MediaItem } from '@/types';

function normalizeTimestamp(value: number | undefined): number {
  if (!value || !Number.isFinite(value)) {
    return Date.now();
  }

  return value < 1_000_000_000_000 ? value * 1000 : value;
}

function mapAssetToMediaItem(asset: MediaLibrary.Asset): MediaItem {
  const assetWithSize = asset as MediaLibrary.Asset & { fileSize?: number };

  return {
    id: asset.id,
    uri: asset.uri,
    filename: asset.filename ?? '',
    mediaType: asset.mediaType === MediaLibrary.MediaType.video ? 'video' : 'photo',
    width: asset.width ?? 0,
    height: asset.height ?? 0,
    creationTime: normalizeTimestamp(asset.creationTime),
    modificationTime: asset.modificationTime ? normalizeTimestamp(asset.modificationTime) : undefined,
    duration: asset.duration ?? undefined,
    fileSize: assetWithSize.fileSize ?? 0,
    albumId: asset.albumId ?? undefined,
  };
}

export async function fetchAllMediaItems(): Promise<MediaItem[]> {
  let hasNextPage = true;
  let after: string | undefined;
  const assets: MediaLibrary.Asset[] = [];

  while (hasNextPage) {
    const page = await MediaLibrary.getAssetsAsync({
      first: 500,
      after,
      mediaType: [MediaLibrary.MediaType.photo, MediaLibrary.MediaType.video],
      sortBy: [MediaLibrary.SortBy.creationTime],
    });

    assets.push(...page.assets);
    after = page.endCursor ?? undefined;
    hasNextPage = page.hasNextPage;
  }

  // НЕ загружаем размер файлов сразу - это слишком медленно
  // Размер будет загружаться по требованию на экране подтверждения
  return assets.map(mapAssetToMediaItem);
}

// Функция для получения размера конкретного файла (вызывается по требованию)
export async function getMediaItemFileSize(assetId: string): Promise<number> {
  try {
    const asset = await MediaLibrary.getAssetInfoAsync(assetId);
    
    // Пробуем получить размер из AssetInfo
    const assetWithSize = asset as MediaLibrary.AssetInfo & { fileSize?: number };
    if (typeof assetWithSize.fileSize === 'number' && assetWithSize.fileSize > 0) {
      return assetWithSize.fileSize;
    }

    // Если fileSize нет, пробуем через localUri или uri
    const uriCandidates = [asset.localUri, asset.uri].filter((uri): uri is string => Boolean(uri));
    
    for (const rawUri of uriCandidates) {
      try {
        // iOS может добавлять фрагменты к URI (например "...MOV#..."), убираем их
        const normalizedUri = rawUri.split('#')[0];
        
        // Пробуем получить информацию о файле
        const fileInfo = await FileSystem.getInfoAsync(normalizedUri);
        
        if (fileInfo.exists && 'size' in fileInfo && typeof fileInfo.size === 'number' && fileInfo.size > 0) {
          return fileInfo.size;
        }
      } catch (uriError) {
        // Пробуем следующий URI
        continue;
      }
    }

    // Если ничего не сработало, возвращаем примерный размер на основе типа медиа
    // Это fallback, чтобы хоть что-то показать пользователю
    if (asset.mediaType === 'video') {
      // Примерный размер видео: duration * 2MB/sec (грубая оценка)
      const duration = asset.duration ?? 10;
      return Math.round(duration * 2 * 1024 * 1024);
    } else {
      // Примерный размер фото на основе разрешения
      const pixels = asset.width * asset.height;
      // Примерно 3 байта на пиксель для JPEG
      return Math.round(pixels * 3);
    }
  } catch (error) {
    // Ошибка получения размера файла - возвращаем 0
    return 0;
  }
}
