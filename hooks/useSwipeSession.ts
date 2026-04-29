import { useMemo } from 'react';

import { MediaItem, MonthSession } from '@/types';

export function useSwipeSession(month: MonthSession | null, currentIndex: number) {
  const items = useMemo(() => month?.items ?? [], [month]);
  const safeIndex = Math.max(0, Math.min(currentIndex, items.length));
  const currentItem: MediaItem | null = items[safeIndex] ?? null;

  return {
    items,
    currentIndex: safeIndex,
    currentItem,
    total: items.length,
  };
}
