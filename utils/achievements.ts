import { Achievement, AchievementId, GamificationStats, SessionStats } from '@/types';

// ─── Определения всех достижений ─────────────────────────────────────────────

export const ACHIEVEMENT_DEFINITIONS: Record<AchievementId, { icon: string }> = {
  first_swipe:    { icon: '👆' },
  first_delete:   { icon: '🗑️' },
  first_favorite: { icon: '⭐' },
  month_done:     { icon: '📅' },
  hundred:        { icon: '🌟' },
  on_fire:        { icon: '🔥' },
  destroyer:      { icon: '💥' },
  legendary:      { icon: '☄️' },
  cleaner:        { icon: '🧹' },
  space_saver:    { icon: '💪' },
  storage_hero:   { icon: '🦾' },
  king_of_space:  { icon: '👑' },
  speed_demon:    { icon: '🚀' },
  turbo:          { icon: '⚡' },
  streak_3:       { icon: '📆' },
  streak_7:       { icon: '🔥' },
  streak_30:      { icon: '💎' },
  night_owl:      { icon: '🌙' },
  early_bird:     { icon: '☀️' },
  video_master:   { icon: '🎬' },
};

// ─── Начальное состояние достижений ──────────────────────────────────────────

export function buildInitialAchievements(): Record<AchievementId, Achievement> {
  const result = {} as Record<AchievementId, Achievement>;
  for (const id of Object.keys(ACHIEVEMENT_DEFINITIONS) as AchievementId[]) {
    result[id] = { id, icon: ACHIEVEMENT_DEFINITIONS[id].icon, unlockedAt: null };
  }
  return result;
}

// ─── Проверка какие достижения разблокированы ─────────────────────────────────

export function checkAchievements(
  stats: GamificationStats,
  session: SessionStats,
  current: Record<AchievementId, Achievement>
): AchievementId[] {
  const now = Date.now();
  const hour = new Date(now).getHours();
  const unlocked: AchievementId[] = [];

  function check(id: AchievementId, condition: boolean) {
    if (condition && !current[id].unlockedAt) {
      unlocked.push(id);
    }
  }

  // Первые действия
  check('first_swipe',    stats.totalDeleted + stats.totalFavorites + stats.totalKept >= 1);
  check('first_delete',   stats.totalDeleted >= 1);
  check('first_favorite', stats.totalFavorites >= 1);
  check('month_done',     stats.sessionsCount >= 1);

  // Количество удалённых
  check('hundred',    stats.totalDeleted >= 100);
  check('on_fire',    stats.totalDeleted >= 500);
  check('destroyer',  stats.totalDeleted >= 1000);
  check('legendary',  stats.totalDeleted >= 5000);

  // Освобождённое место
  check('cleaner',      stats.totalFreedBytes >= 100 * 1024 * 1024);   // 100 МБ
  check('space_saver',  stats.totalFreedBytes >= 1024 * 1024 * 1024);  // 1 ГБ
  check('storage_hero', stats.totalFreedBytes >= 5 * 1024 * 1024 * 1024); // 5 ГБ
  check('king_of_space',stats.totalFreedBytes >= 10 * 1024 * 1024 * 1024); // 10 ГБ

  // Скорость (в текущей сессии)
  const sessionDurationMin = (Date.now() - session.startedAt) / 60000;
  check('speed_demon', session.deletedCount >= 50 && sessionDurationMin <= 2);
  check('turbo',       session.deletedCount >= 100 && sessionDurationMin <= 5);

  // Стрики
  check('streak_3',  stats.currentStreak >= 3);
  check('streak_7',  stats.currentStreak >= 7);
  check('streak_30', stats.currentStreak >= 30);

  // Время суток
  check('night_owl',  hour >= 0 && hour < 5);
  check('early_bird', hour >= 5 && hour < 7);

  // Видео
  check('video_master', stats.totalDeleted >= 50); // упрощённо — 50 удалений

  return unlocked;
}

// ─── Обновление стрика ────────────────────────────────────────────────────────

export function updateStreak(stats: GamificationStats): GamificationStats {
  const today = new Date().toISOString().slice(0, 10); // 'YYYY-MM-DD'
  const last = stats.lastSessionDate;

  if (last === today) {
    // Уже сегодня была сессия — стрик не меняем
    return stats;
  }

  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

  if (last === yesterday) {
    // Вчера была сессия — продолжаем стрик
    return { ...stats, currentStreak: stats.currentStreak + 1, lastSessionDate: today };
  }

  // Пропустили день — сбрасываем стрик
  return { ...stats, currentStreak: 1, lastSessionDate: today };
}
