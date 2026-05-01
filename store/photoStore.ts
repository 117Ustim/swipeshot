import * as Localization from 'expo-localization';
import * as MediaLibrary from 'expo-media-library';
import { create } from 'zustand';

import {
    AppState,
    AppTheme,
    DeletionResult,
    GamificationState,
    LanguageCode,
    MediaItem,
    MonthSession,
    PersistedState,
    ReviewMode,
    SessionStats,
    SwipeActionKey,
    SwipeActionVisibility
} from '@/types';
import { buildInitialAchievements, checkAchievements, updateStreak } from '@/utils/achievements';
import { calculateLevel } from '@/utils/levels';
import { logAppError } from '@/utils/errorLogger';
import { addAssetToFavoritesAlbum } from '@/utils/favoritesAlbum';
import { groupByMonth } from '@/utils/groupByMonth';
import { fetchAllMediaItems } from '@/utils/mediaLibrary';
import { clearOptimizedPreviewCache } from '@/utils/optimizedPreview';
import { readPersistedStateFromDisk, writePersistedStateToDisk } from '@/utils/persistence';
import { clearResolvedMediaUri } from '@/utils/resolveMediaUri';

const PERSISTENCE_VERSION = 1;
let didAttemptInitialPermissionRequest = false;
const DEFAULT_LANGUAGE: LanguageCode = 'uk';
const DEFAULT_REVIEW_MODE: ReviewMode = 'monthly';
const DEFAULT_SWIPE_ACTION_VISIBILITY: SwipeActionVisibility = {
  delete: true,
  favorite: true,
  keep: true,
  skip: true,
};

// Поддерживаемые языки приложения
const SUPPORTED_LANGUAGES: LanguageCode[] = ['uk', 'ru', 'en', 'de', 'fr'];

/**
 * Определяет язык системы и возвращает подходящий LanguageCode.
 * Если язык системы не поддерживается — возвращает DEFAULT_LANGUAGE (украинский).
 */
function detectSystemLanguage(): LanguageCode {
  const locales = Localization.getLocales();
  for (const locale of locales) {
    // Берём только код языка без региона (например 'uk' из 'uk-UA')
    const langCode = locale.languageCode?.toLowerCase() ?? '';
    if ((SUPPORTED_LANGUAGES as string[]).includes(langCode)) {
      return langCode as LanguageCode;
    }
  }
  return DEFAULT_LANGUAGE;
}

function normalizeReviewMode(value: unknown): ReviewMode {
  return value === 'yearly' ? 'yearly' : 'monthly';
}

function normalizeSwipeActionVisibility(value: unknown): SwipeActionVisibility {
  const input = (value ?? {}) as Partial<SwipeActionVisibility>;

  return {
    delete: input.delete ?? DEFAULT_SWIPE_ACTION_VISIBILITY.delete,
    favorite: input.favorite ?? DEFAULT_SWIPE_ACTION_VISIBILITY.favorite,
    keep: input.keep ?? DEFAULT_SWIPE_ACTION_VISIBILITY.keep,
    skip: input.skip ?? DEFAULT_SWIPE_ACTION_VISIBILITY.skip,
  };
}

function mergeUniqueItems(items: MediaItem[], nextItem: MediaItem): MediaItem[] {
  if (items.some((item) => item.id === nextItem.id)) {
    return items;
  }

  return [...items, nextItem];
}

function mapIdsToMediaItems(ids: string[], months: MonthSession[]): MediaItem[] {
  const mediaById = new Map<string, MediaItem>();

  for (const month of months) {
    for (const item of month.items) {
      mediaById.set(item.id, item);
    }
  }

  const uniqueIds = Array.from(new Set(ids));
  return uniqueIds
    .map((id) => mediaById.get(id))
    .filter((item): item is MediaItem => Boolean(item));
}

function clampProgressByMonths(
  progress: Record<string, number>,
  months: MonthSession[]
): Record<string, number> {
  const result: Record<string, number> = {};

  months.forEach((month) => {
    const raw = progress[month.id];
    if (raw === undefined) {
      return;
    }

    // Разрешаем сохранять прогресс равный длине списка (т.е. просмотрено всё)
    const maxIndex = month.items.length;
    result[month.id] = Math.min(Math.max(raw, 0), maxIndex);
  });

  return result;
}

const DEFAULT_GAMIFICATION_STATE: GamificationState = {
  enabled: true,
  achievements: buildInitialAchievements(),
  stats: {
    xp: 0,
    level: 1,
    totalDeleted: 0,
    totalFavorites: 0,
    totalKept: 0,
    totalFreedBytes: 0,
    sessionsCount: 0,
    currentStreak: 0,
    lastSessionDate: null,
  },
  currentSession: null,
  pendingToastAchievementIds: [],
};

const EMPTY_DELETION_RESULT: DeletionResult = {
  deletedCount: 0,
  failedCount: 0,
};

export const usePhotoStore = create<AppState>((set, get) => ({
  months: [],
  isLoadingGallery: false,
  galleryError: null,

  currentMonthId: null,
  currentIndex: 0,
  monthProgress: {},

  deletionQueue: [],
  safeItems: [],
  favorites: [],

  language: DEFAULT_LANGUAGE,
  reviewMode: DEFAULT_REVIEW_MODE,
  swipeActionVisibility: DEFAULT_SWIPE_ACTION_VISIBILITY,
  showSwipeButtons: true,
  theme: 'dark',
  activeSession: null,
  gamification: DEFAULT_GAMIFICATION_STATE,

  hasMediaLibraryPermission: false,
  galleryLoadedAt: null,

  loadGallery: async (forceRefresh?: boolean) => {
    const state = get();

    // Если галерея уже загружена и не требуется принудительное обновление — пропускаем
    if (
      !forceRefresh &&
      state.months.length > 0 &&
      state.galleryLoadedAt !== null &&
      !state.galleryError
    ) {
      return;
    }

    set({ isLoadingGallery: true, galleryError: null });

    try {
      const currentPermission = await MediaLibrary.getPermissionsAsync();
      let granted = currentPermission.status === 'granted';

      if (!granted && currentPermission.canAskAgain && !didAttemptInitialPermissionRequest) {
        didAttemptInitialPermissionRequest = true;
        const requestedPermission = await MediaLibrary.requestPermissionsAsync();
        granted = requestedPermission.status === 'granted';
      }

      if (!granted) {
        set({
          isLoadingGallery: false,
          galleryError: new Error('PERMISSION_DENIED'),
          hasMediaLibraryPermission: false,
          months: [],
        });
        return;
      }

      const items = await fetchAllMediaItems();
      const grouped = groupByMonth(items);

      set({
        months: grouped,
        isLoadingGallery: false,
        galleryError: null,
        hasMediaLibraryPermission: true,
        activeSession: null,
        galleryLoadedAt: Date.now(),
      });

      await get().loadState();
    } catch (error) {
      void logAppError('store.loadGallery', error);
      set({
        isLoadingGallery: false,
        galleryError: error as Error,
      });
    }
  },
  setCurrentMonth: (monthId: string) => {
    const state = get();
    const month = state.getSessionById(monthId);
    const savedProgress = state.monthProgress[monthId] ?? 0;
    
    let safeIndex = 0;
    if (month) {
      if (savedProgress >= month.items.length) {
        // Если пользователь уже посмотрел все фото (дошел до конца), начинаем с начала
        safeIndex = 0;
      } else {
        const maxIndex = Math.max(month.items.length - 1, 0);
        safeIndex = Math.min(Math.max(savedProgress, 0), maxIndex);
      }
    }
    const isRealMonth = state.months.some((item) => item.id === monthId);

    set({
      currentMonthId: monthId,
      currentIndex: safeIndex,
      activeSession: isRealMonth ? null : state.activeSession,
    });
    void get().saveState();
  },
  setCurrentIndex: (index: number) => {
    const safeIndex = Math.max(0, index);
    set((state) => ({
      currentIndex: safeIndex,
      monthProgress: state.currentMonthId
        ? { ...state.monthProgress, [state.currentMonthId]: safeIndex }
        : state.monthProgress,
    }));
    void get().saveState();
  },
  addToDeletionQueue: (item: MediaItem) => {
    set((state) => ({ deletionQueue: mergeUniqueItems(state.deletionQueue, item) }));
    void get().saveState();
  },
  removeFromDeletionQueue: (itemId: string) => {
    set((state) => ({ deletionQueue: state.deletionQueue.filter((item) => item.id !== itemId) }));
    void get().saveState();
  },
  updateItemFileSize: (itemId: string, fileSize: number) => {
    set((state) => ({
      deletionQueue: state.deletionQueue.map((item) =>
        item.id === itemId ? { ...item, fileSize } : item
      ),
      favorites: state.favorites.map((item) =>
        item.id === itemId ? { ...item, fileSize } : item
      ),
    }));
  },
  addToSafe: (item: MediaItem) => {
    set((state) => ({ safeItems: mergeUniqueItems(state.safeItems, item) }));
    void get().saveState();
  },
  addToFavorites: (item: MediaItem) => {
    const alreadyExists = get().favorites.some((favorite) => favorite.id === item.id);
    set((state) => ({ favorites: mergeUniqueItems(state.favorites, item) }));

    if (!alreadyExists) {
      void addAssetToFavoritesAlbum(item.id).then((success) => {
        if (!success) {
          void logAppError('store.addToFavorites.addAssetToFavoritesAlbum', new Error('FAVORITES_ALBUM_SYNC_FAILED'), {
            assetId: item.id,
          });
        }
      });
    }

    void get().saveState();
  },
  removeFromFavorites: (itemId: string) => {
    set((state) => ({ favorites: state.favorites.filter((item) => item.id !== itemId) }));
    void get().saveState();
  },
  confirmDeletion: async () => {
    const state = get();
    if (state.deletionQueue.length === 0) {
      return EMPTY_DELETION_RESULT;
    }

    const allIds = state.deletionQueue.map((item) => item.id);
    let deletedIds: string[] = [];
    let failedIds: string[] = [];

    try {
      // Удаляем все файлы одним вызовом
      const success = await MediaLibrary.deleteAssetsAsync(allIds);
      
      if (success) {
        deletedIds = allIds;
      } else {
        failedIds = allIds;
        void logAppError('store.confirmDeletion.deleteAssetsAsync', new Error('DELETE_ASSETS_RETURNED_FALSE'), {
          assetIds: allIds,
        });
      }
    } catch (error) {
      failedIds = allIds;
      void logAppError('store.confirmDeletion.deleteAssetsAsync', error, {
        assetIds: allIds,
      });
    }

    set((currentState) => {
      const deletedSet = new Set(deletedIds);
      const updatedMonths = currentState.months
        .map((month) => {
          const nextItems = month.items.filter((item) => !deletedSet.has(item.id));
          if (nextItems.length === 0) {
            return null;
          }

          return {
            ...month,
            items: nextItems,
            totalCount: nextItems.length,
            coverPhotoUri: nextItems[0].uri,
            currentIndex: month.currentIndex >= month.totalCount ? nextItems.length : Math.min(month.currentIndex, Math.max(nextItems.length - 1, 0)),
          };
        })
        .filter((month): month is MonthSession => Boolean(month));

      const activeMonth = currentState.currentMonthId
        ? updatedMonths.find((month) => month.id === currentState.currentMonthId) ?? null
        : null;

      return {
        months: updatedMonths,
        deletionQueue: [],
        safeItems: currentState.safeItems.filter((item) => !deletedSet.has(item.id)),
        favorites: currentState.favorites.filter((item) => !deletedSet.has(item.id)),
        currentMonthId: activeMonth?.id ?? null,
        currentIndex: activeMonth
          ? (currentState.currentIndex >= (currentState.months.find(m => m.id === activeMonth.id)?.totalCount ?? 0)
              ? activeMonth.items.length
              : Math.min(currentState.currentIndex, Math.max(activeMonth.items.length - 1, 0)))
          : 0,
        monthProgress: clampProgressByMonths(currentState.monthProgress, updatedMonths),
        activeSession: null,
      };
    });

    await get().saveState();

    deletedIds.forEach((assetId) => {
      clearResolvedMediaUri(assetId);
      clearOptimizedPreviewCache(assetId);
    });

    return {
      deletedCount: deletedIds.length,
      failedCount: failedIds.length,
    };
  },
  setLanguage: (language: LanguageCode) => {
    set({ language });
    void get().saveState();
  },
  setReviewMode: (reviewMode: ReviewMode) => {
    set({ reviewMode });
    void get().saveState();
  },
  setSwipeActionVisibility: (action: SwipeActionKey, visible: boolean) => {
    set((state) => ({
      swipeActionVisibility: {
        ...state.swipeActionVisibility,
        [action]: visible,
      },
    }));
    void get().saveState();
  },
  setShowSwipeButtons: (show: boolean) => {
    set({ showSwipeButtons: show });
    void get().saveState();
  },
  setTheme: (theme: AppTheme) => {
    set({ theme });
    void get().saveState();
  },
  setActiveSession: (session: MonthSession | null) => {
    set({ activeSession: session });
  },
  getSessionById: (sessionId: string) => {
    const state = get();
    if (state.activeSession?.id === sessionId) {
      return state.activeSession;
    }

    return state.months.find((item) => item.id === sessionId) ?? null;
  },
  saveState: async () => {
    const state = get();
    const payload: PersistedState = {
      version: PERSISTENCE_VERSION,
      deletionQueue: Array.from(new Set(state.deletionQueue.map((item) => item.id))),
      safeItems: Array.from(new Set(state.safeItems.map((item) => item.id))),
      favorites: Array.from(new Set(state.favorites.map((item) => item.id))),
      monthProgress: clampProgressByMonths(state.monthProgress, state.months),
      language: state.language,
      reviewMode: state.reviewMode,
      swipeActionVisibility: state.swipeActionVisibility,
      showSwipeButtons: state.showSwipeButtons,
      theme: state.theme,
      gamification: {
        enabled: state.gamification.enabled,
        achievements: state.gamification.achievements,
        stats: state.gamification.stats,
        currentSession: null,
        pendingToastAchievementIds: [],
      },
      lastSync: Date.now(),
    };

    await writePersistedStateToDisk(payload);
  },
  loadState: async () => {
    const persisted = await readPersistedStateFromDisk();
    if (!persisted || persisted.version !== PERSISTENCE_VERSION) {
      // Первый запуск — устанавливаем язык системы
      set({ language: detectSystemLanguage() });
      return;
    }

    const state = get();
    const restoredDeletionQueue = mapIdsToMediaItems(persisted.deletionQueue, state.months);
    const restoredSafeItems = mapIdsToMediaItems(persisted.safeItems, state.months);
    const restoredFavorites = mapIdsToMediaItems(persisted.favorites, state.months);

    const restoredMonthProgress = clampProgressByMonths(persisted.monthProgress ?? {}, state.months);

    let restoredMonthId = state.currentMonthId;
    let restoredIndex = state.currentIndex;

    if (!restoredMonthId) {
      const [monthId] = Object.keys(restoredMonthProgress);
      if (monthId) {
        restoredMonthId = monthId;
      }
    }

    if (restoredMonthId) {
      const restoredMonth = state.getSessionById(restoredMonthId);
      if (!restoredMonth) {
        restoredMonthId = null;
        restoredIndex = 0;
      } else {
        restoredIndex = restoredMonthProgress[restoredMonthId] ?? 0;
      }
    }

    set({
      deletionQueue: restoredDeletionQueue,
      safeItems: restoredSafeItems,
      favorites: restoredFavorites,
      currentMonthId: restoredMonthId,
      currentIndex: restoredIndex,
      monthProgress: restoredMonthProgress,
      language: persisted.language ?? detectSystemLanguage(),
      reviewMode: normalizeReviewMode(persisted.reviewMode),
      swipeActionVisibility: normalizeSwipeActionVisibility(persisted.swipeActionVisibility),
      showSwipeButtons: persisted.showSwipeButtons ?? true,
      theme: (persisted.theme as AppTheme) ?? 'dark',
      activeSession: null,
      gamification: {
        ...DEFAULT_GAMIFICATION_STATE,
        ...(persisted.gamification ?? {}),
        // Всегда сбрасываем сессионные данные при загрузке
        currentSession: null,
        pendingToastAchievementIds: [],
        // Восстанавливаем достижения с мержем дефолтных
        achievements: {
          ...DEFAULT_GAMIFICATION_STATE.achievements,
          ...(persisted.gamification?.achievements ?? {}),
        },
        stats: {
          ...DEFAULT_GAMIFICATION_STATE.stats,
          ...(persisted.gamification?.stats ?? {}),
          xp: persisted.gamification?.stats?.xp ?? 0,
          level: persisted.gamification?.stats?.level ?? 1,
        },
      },
    });
  },

  // ─── Геймификация ──────────────────────────────────────────────────────────

  setGamificationEnabled: (enabled: boolean) => {
    set((state) => ({
      gamification: { ...state.gamification, enabled },
    }));
    void get().saveState();
  },

  startGamificationSession: () => {
    set((state) => ({
      gamification: {
        ...state.gamification,
        currentSession: {
          deletedCount: 0,
          favoritesCount: 0,
          keptCount: 0,
          freedBytes: 0,
          earnedXp: 0,
          startedAt: Date.now(),
        },
      },
    }));
  },

  endGamificationSession: () => {
    const state = get();
    const { gamification } = state;
    if (!gamification.enabled || !gamification.currentSession) return;

    const session = gamification.currentSession;
    const newXp = (gamification.stats.xp ?? 0) + (session.earnedXp ?? 0);
    const newLevel = calculateLevel(newXp);

    const updatedStats = updateStreak({
      ...gamification.stats,
      xp: newXp,
      level: Math.max(gamification.stats.level ?? 1, newLevel),
      totalDeleted: gamification.stats.totalDeleted + session.deletedCount,
      totalFavorites: gamification.stats.totalFavorites + session.favoritesCount,
      totalKept: (gamification.stats.totalKept ?? 0) + (session.keptCount ?? 0),
      totalFreedBytes: gamification.stats.totalFreedBytes + session.freedBytes,
      sessionsCount: gamification.stats.sessionsCount + 1,
    });

    const newlyUnlocked = checkAchievements(updatedStats, session, gamification.achievements);

    const now = Date.now();
    const updatedAchievements = { ...gamification.achievements };
    newlyUnlocked.forEach((id) => {
      updatedAchievements[id] = { ...updatedAchievements[id], unlockedAt: now };
    });

    set((s) => ({
      gamification: {
        ...s.gamification,
        stats: updatedStats,
        currentSession: null,
        achievements: updatedAchievements,
        pendingToastAchievementIds: [...s.gamification.pendingToastAchievementIds, ...newlyUnlocked],
      },
    }));
    void get().saveState();
  },

  recordSwipeAction: (action: 'delete' | 'favorite' | 'keep', freedBytes: number) => {
    const state = get();
    const { gamification } = state;
    if (!gamification.enabled || !gamification.currentSession) return;

    let xpEarned = 0;
    if (action === 'keep') xpEarned = 1;
    if (action === 'favorite') xpEarned = 2;
    if (action === 'delete') {
      xpEarned = 5 + Math.floor(freedBytes / (1024 * 1024 * 10)); // +1 XP per 10MB
    }

    const updatedSession: SessionStats = {
      ...gamification.currentSession,
      deletedCount: gamification.currentSession.deletedCount + (action === 'delete' ? 1 : 0),
      favoritesCount: gamification.currentSession.favoritesCount + (action === 'favorite' ? 1 : 0),
      keptCount: (gamification.currentSession.keptCount ?? 0) + (action === 'keep' ? 1 : 0),
      freedBytes: gamification.currentSession.freedBytes + (action === 'delete' ? freedBytes : 0),
      earnedXp: (gamification.currentSession.earnedXp ?? 0) + xpEarned,
    };

    const tempNewXp = (gamification.stats.xp ?? 0) + updatedSession.earnedXp;
    const tempNewLevel = calculateLevel(tempNewXp);

    // Временные stats для проверки достижений (с учётом текущей сессии)
    const tempStats = {
      ...gamification.stats,
      xp: tempNewXp,
      level: Math.max(gamification.stats.level ?? 1, tempNewLevel), // never go down
      totalDeleted: gamification.stats.totalDeleted + updatedSession.deletedCount,
      totalFavorites: gamification.stats.totalFavorites + updatedSession.favoritesCount,
      totalKept: (gamification.stats.totalKept ?? 0) + updatedSession.keptCount,
      totalFreedBytes: gamification.stats.totalFreedBytes + updatedSession.freedBytes,
      sessionsCount: gamification.stats.sessionsCount,
      currentStreak: gamification.stats.currentStreak,
      lastSessionDate: gamification.stats.lastSessionDate,
    };

    const newlyUnlocked = checkAchievements(tempStats, updatedSession, gamification.achievements);

    if (newlyUnlocked.length > 0) {
      const now = Date.now();
      const updatedAchievements = { ...gamification.achievements };
      newlyUnlocked.forEach((id) => {
        updatedAchievements[id] = { ...updatedAchievements[id], unlockedAt: now };
      });

      set((s) => ({
        gamification: {
          ...s.gamification,
          currentSession: updatedSession,
          achievements: updatedAchievements,
          // Добавляем новые достижения в очередь тостов
          pendingToastAchievementIds: [...s.gamification.pendingToastAchievementIds, ...newlyUnlocked],
        },
      }));
    } else {
      set((s) => ({
        gamification: {
          ...s.gamification,
          currentSession: updatedSession,
        },
      }));
    }
  },

  clearPendingToast: () => {
    set((state) => ({
      gamification: {
        ...state.gamification,
        pendingToastAchievementIds: state.gamification.pendingToastAchievementIds.slice(1),
      },
    }));
  },

  resetGamification: () => {
    set((state) => ({
      gamification: {
        ...DEFAULT_GAMIFICATION_STATE,
        enabled: state.gamification.enabled, // сохраняем настройку включения/отключения
      },
    }));
    void get().saveState();
  },
}));
