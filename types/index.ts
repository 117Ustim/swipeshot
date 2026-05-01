export type MediaType = 'photo' | 'video';
export type LanguageCode = 'uk' | 'ru' | 'en' | 'de' | 'fr';
export type SwipeActionKey = 'delete' | 'favorite' | 'keep' | 'skip';
export type ReviewMode = 'monthly' | 'yearly';
export type AppTheme = 'light' | 'dark' | 'system';

export interface SwipeActionVisibility {
  delete: boolean;
  favorite: boolean;
  keep: boolean;
  skip: boolean;
}

export interface MediaItem {
  id: string;
  uri: string;
  filename: string;
  mediaType: MediaType;
  width: number;
  height: number;
  creationTime: number;
  modificationTime?: number;
  duration?: number;
  fileSize: number;
  albumId?: string;
}

export interface MonthSession {
  id: string;
  displayName: string;
  items: MediaItem[];
  totalCount: number;
  coverPhotoUri: string;
  currentIndex: number;
}

export interface PersistedState {
  version: number;
  deletionQueue: string[];
  safeItems: string[];
  favorites: string[];
  monthProgress: Record<string, number>;
  language?: LanguageCode;
  reviewMode?: ReviewMode;
  swipeActionVisibility?: Partial<SwipeActionVisibility>;
  showSwipeButtons?: boolean;
  theme?: AppTheme;
  gamification?: Partial<GamificationState>;
  lastSync: number;
}

export interface DeletionResult {
  deletedCount: number;
  failedCount: number;
}

// ─── Геймификация ────────────────────────────────────────────────────────────

export type AchievementId =
  | 'first_swipe'
  | 'first_delete'
  | 'first_favorite'
  | 'month_done'
  | 'hundred'
  | 'on_fire'
  | 'destroyer'
  | 'legendary'
  | 'cleaner'
  | 'space_saver'
  | 'storage_hero'
  | 'king_of_space'
  | 'speed_demon'
  | 'turbo'
  | 'streak_3'
  | 'streak_7'
  | 'streak_30'
  | 'night_owl'
  | 'early_bird'
  | 'video_master';

export interface Achievement {
  id: AchievementId;
  icon: string;
  unlockedAt: number | null; // timestamp или null
}

export interface GamificationStats {
  xp: number;
  level: number;
  totalDeleted: number;       // всего удалено за всё время
  totalFavorites: number;     // всего в избранное
  totalKept: number;          // всего оставлено (свайп вправо)
  totalFreedBytes: number;    // всего освобождено байт
  sessionsCount: number;      // количество завершённых сессий
  currentStreak: number;      // текущий стрик (дней подряд)
  lastSessionDate: string | null; // дата последней сессии 'YYYY-MM-DD'
}

export interface SessionStats {
  deletedCount: number;
  favoritesCount: number;
  keptCount: number;
  freedBytes: number;
  earnedXp: number;
  startedAt: number; // timestamp
}

export interface GamificationState {
  enabled: boolean;
  achievements: Record<AchievementId, Achievement>;
  stats: GamificationStats;
  currentSession: SessionStats | null;
  // Очередь достижений для показа тостов
  pendingToastAchievementIds: AchievementId[];
}

export interface AppState {
  months: MonthSession[];
  isLoadingGallery: boolean;
  galleryError: Error | null;

  currentMonthId: string | null;
  currentIndex: number;
  monthProgress: Record<string, number>;

  deletionQueue: MediaItem[];
  safeItems: MediaItem[];
  favorites: MediaItem[];

  language: LanguageCode;
  reviewMode: ReviewMode;
  swipeActionVisibility: SwipeActionVisibility;
  showSwipeButtons: boolean;
  theme: AppTheme;
  activeSession: MonthSession | null;

  hasMediaLibraryPermission: boolean;
  galleryLoadedAt: number | null;

  loadGallery: (forceRefresh?: boolean) => Promise<void>;
  setCurrentMonth: (monthId: string) => void;
  setCurrentIndex: (index: number) => void;
  addToDeletionQueue: (item: MediaItem) => void;
  removeFromDeletionQueue: (itemId: string) => void;
  updateItemFileSize: (itemId: string, fileSize: number) => void;
  addToSafe: (item: MediaItem) => void;
  addToFavorites: (item: MediaItem) => void;
  removeFromFavorites: (itemId: string) => void;
  confirmDeletion: () => Promise<DeletionResult>;
  setLanguage: (language: LanguageCode) => void;
  setReviewMode: (reviewMode: ReviewMode) => void;
  setSwipeActionVisibility: (action: SwipeActionKey, visible: boolean) => void;
  setShowSwipeButtons: (show: boolean) => void;
  setTheme: (theme: AppTheme) => void;
  setActiveSession: (session: MonthSession | null) => void;
  getSessionById: (sessionId: string) => MonthSession | null;
  saveState: () => Promise<void>;
  loadState: () => Promise<void>;

  // Геймификация
  gamification: GamificationState;
  setGamificationEnabled: (enabled: boolean) => void;
  recordSwipeAction: (action: 'delete' | 'favorite' | 'keep', freedBytes: number) => void;
  startGamificationSession: () => void;
  endGamificationSession: () => void;
  clearPendingToast: () => void;
  resetGamification: () => void;
}
