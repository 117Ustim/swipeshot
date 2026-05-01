import { MediaItem } from '@/types';
import { getMediaItemFileSize } from '@/utils/mediaLibrary';

export interface DuplicateGroup {
  key: string;
  items: MediaItem[];
}

export interface ScanProgress {
  stage: 'filenames' | 'metadata' | 'filesize' | 'done';
  current: number;
  total: number;
}

/**
 * Нормализует имя файла: убирает суффиксы копий вроде (1), _copy, -2
 * IMG_1234 (1).jpg -> IMG_1234.jpg
 * photo_copy.jpg -> photo.jpg
 * video-2.mp4 -> video.mp4
 */
function normalizeFilename(filename: string): string {
  // Убираем расширение
  const dotIndex = filename.lastIndexOf('.');
  const ext = dotIndex >= 0 ? filename.slice(dotIndex) : '';
  const name = dotIndex >= 0 ? filename.slice(0, dotIndex) : filename;

  // Убираем суффиксы: (1), (2), _1, _2, -1, -2, _copy, _copy2, copy, - Copy
  const cleaned = name
    .replace(/\s*\(\d+\)$/, '')        // " (1)", "(2)"
    .replace(/\s*-\s*Copy(\s*\d+)?$/i, '') // " - Copy", " - Copy 2"
    .replace(/_copy\d*$/i, '')          // "_copy", "_copy2"
    .replace(/\s+copy\s*\d*$/i, '')     // " copy", " copy 2"
    .replace(/[-_]\d{1,2}$/, '')        // "_1", "-2" (только 1-2 цифры в конце)
    .trim();

  return (cleaned + ext).toLowerCase();
}

/**
 * Округляет timestamp до секунды для сравнения
 */
function roundToSecond(timestamp: number): number {
  return Math.floor(timestamp / 1000);
}

/**
 * Этап 1: Быстрая группировка по нормализованному имени файла + разрешению + типу
 * Это мгновенная операция, отсекает 90%+ файлов
 */
function findCandidatesByFilename(items: MediaItem[]): Map<string, MediaItem[]> {
  const groups = new Map<string, MediaItem[]>();

  for (const item of items) {
    const normalizedName = normalizeFilename(item.filename);
    const key = `${normalizedName}_${item.width}x${item.height}_${item.mediaType}`;

    const existing = groups.get(key);
    if (existing) {
      existing.push(item);
    } else {
      groups.set(key, [item]);
    }
  }

  // Оставляем только группы с 2+ файлами
  const result = new Map<string, MediaItem[]>();
  groups.forEach((groupItems, key) => {
    if (groupItems.length >= 2) {
      result.set(key, groupItems);
    }
  });

  return result;
}

/**
 * Этап 2: Уточнение — проверяем совпадение даты создания (до секунды)
 * Настоящие дубликаты всегда имеют одинаковую дату создания
 */
function refineCandidatesByMetadata(candidates: Map<string, MediaItem[]>): Map<string, MediaItem[]> {
  const refined = new Map<string, MediaItem[]>();

  candidates.forEach((items, baseKey) => {
    // Подгруппировка по дате создания
    const byDate = new Map<number, MediaItem[]>();

    for (const item of items) {
      const dateKey = roundToSecond(item.creationTime);
      const existing = byDate.get(dateKey);
      if (existing) {
        existing.push(item);
      } else {
        byDate.set(dateKey, [item]);
      }
    }

    // Оставляем только группы с совпадающей датой
    byDate.forEach((dateItems, dateKey) => {
      if (dateItems.length >= 2) {
        const key = `${baseKey}_t${dateKey}`;
        refined.set(key, dateItems);
      }
    });
  });

  return refined;
}

/**
 * Этап 3: Финальная верификация — загружаем и сравниваем размер файла
 * Это самая медленная операция, выполняется только для подтверждённых кандидатов
 */
async function verifyByFileSize(
  candidates: Map<string, MediaItem[]>,
  onProgress?: (current: number, total: number) => void,
): Promise<DuplicateGroup[]> {
  const result: DuplicateGroup[] = [];

  // Собираем все уникальные ID для загрузки размеров
  const allItems: MediaItem[] = [];
  candidates.forEach((items) => {
    for (const item of items) {
      if (item.fileSize === 0) {
        allItems.push(item);
      }
    }
  });

  const total = allItems.length;
  let loaded = 0;

  // Загружаем размеры батчами по 5
  const BATCH = 5;
  for (let i = 0; i < allItems.length; i += BATCH) {
    const batch = allItems.slice(i, i + BATCH);
    await Promise.all(
      batch.map(async (item) => {
        try {
          const size = await getMediaItemFileSize(item.id);
          item.fileSize = size;
        } catch {
          // Оставляем 0
        }
        loaded++;
        onProgress?.(loaded, total);
      })
    );
  }

  // Теперь группируем по размеру файла внутри каждой группы кандидатов
  candidates.forEach((items, baseKey) => {
    const bySize = new Map<number, MediaItem[]>();

    for (const item of items) {
      // Пропускаем если размер не удалось получить
      if (item.fileSize === 0) continue;

      const existing = bySize.get(item.fileSize);
      if (existing) {
        existing.push(item);
      } else {
        bySize.set(item.fileSize, [item]);
      }
    }

    bySize.forEach((sizeItems, fileSize) => {
      if (sizeItems.length >= 2) {
        const sorted = [...sizeItems].sort((a, b) => a.creationTime - b.creationTime);
        result.push({
          key: `${baseKey}_s${fileSize}`,
          items: sorted,
        });
      }
    });
  });

  // Сортируем группы по размеру (тяжёлые первые)
  result.sort((a, b) => (b.items[0]?.fileSize ?? 0) - (a.items[0]?.fileSize ?? 0));

  return result;
}

/**
 * Основная функция — 3-этапный поиск дубликатов
 * Все этапы выполняются автоматически, прогресс сообщается через callback
 */
export async function findDuplicatesAsync(
  allItems: MediaItem[],
  onProgress?: (progress: ScanProgress) => void,
): Promise<DuplicateGroup[]> {
  // Этап 1: Быстрая фильтрация по имени файла
  onProgress?.({ stage: 'filenames', current: 0, total: allItems.length });
  const candidates = findCandidatesByFilename(allItems);
  onProgress?.({ stage: 'filenames', current: allItems.length, total: allItems.length });

  if (candidates.size === 0) {
    onProgress?.({ stage: 'done', current: 0, total: 0 });
    return [];
  }

  // Этап 2: Уточнение по метаданным (дата создания)
  const candidateCount = Array.from(candidates.values()).reduce((s, g) => s + g.length, 0);
  onProgress?.({ stage: 'metadata', current: 0, total: candidateCount });
  const refined = refineCandidatesByMetadata(candidates);
  onProgress?.({ stage: 'metadata', current: candidateCount, total: candidateCount });

  if (refined.size === 0) {
    onProgress?.({ stage: 'done', current: 0, total: 0 });
    return [];
  }

  // Этап 3: Верификация размером файла
  const refinedCount = Array.from(refined.values()).reduce((s, g) => s + g.length, 0);
  onProgress?.({ stage: 'filesize', current: 0, total: refinedCount });

  const result = await verifyByFileSize(refined, (current, total) => {
    onProgress?.({ stage: 'filesize', current, total });
  });

  onProgress?.({ stage: 'done', current: result.length, total: result.length });

  return result;
}

/**
 * Считает сколько места можно освободить удалив дубликаты
 * (оставляем по одному файлу из каждой группы)
 */
export function calcDuplicatesSavings(groups: DuplicateGroup[]): number {
  return groups.reduce((total, group) => {
    const toDelete = group.items.slice(1);
    return total + toDelete.reduce((sum, item) => sum + (item.fileSize ?? 0), 0);
  }, 0);
}
