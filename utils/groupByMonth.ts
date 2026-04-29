import { MediaItem, MonthSession } from '@/types';

function formatMonthKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

export function groupByMonth(items: MediaItem[]): MonthSession[] {
  const sorted = [...items].sort((a, b) => b.creationTime - a.creationTime);
  const grouped = new Map<string, MediaItem[]>();

  sorted.forEach((item) => {
    const date = new Date(item.creationTime);
    const monthKey = formatMonthKey(date);

    if (!grouped.has(monthKey)) {
      grouped.set(monthKey, []);
    }

    grouped.get(monthKey)!.push(item);
  });

  return Array.from(grouped.entries()).map(([monthKey, monthItems]) => ({
    id: monthKey,
    displayName: monthKey,
    items: monthItems,
    totalCount: monthItems.length,
    coverPhotoUri: monthItems[0]?.uri ?? '',
    currentIndex: 0,
  }));
}
