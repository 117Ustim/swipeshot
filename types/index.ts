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
  lastSync: number;
}

export interface DeletionResult {
  deletedCount: number;
  failedCount: number;
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

  loadGallery: () => Promise<void>;
  setCurrentMonth: (monthId: string) => void;
  setCurrentIndex: (index: number) => void;
  addToDeletionQueue: (item: MediaItem) => void;
  removeFromDeletionQueue: (itemId: string) => void;
  updateItemFileSize: (itemId: string, fileSize: number) => void;
  addToSafe: (item: MediaItem) => void;
  addToFavorites: (item: MediaItem) => void;
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
}
