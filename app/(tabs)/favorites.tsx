import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
    Alert,
    Dimensions,
    FlatList,
    Image,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { EmptyState } from '@/components/EmptyState';
import { GradientBackground } from '@/components/GradientBackground';
import { useAppTheme } from '@/components/useAppTheme';
import { typography } from '@/constants/typography';
import { useFileSizeLoader } from '@/hooks/useFileSizeLoader';
import { useI18n } from '@/hooks/useI18n';
import { usePhotoStore } from '@/store/photoStore';
import { FavoriteAlbum, MediaItem } from '@/types';
import { formatFileSize } from '@/utils/formatFileSize';
import { getCachedOptimizedPreviewUri, resolveOptimizedPreviewUri } from '@/utils/optimizedPreview';
import { isUnsupportedMediaUri } from '@/utils/resolveMediaUri';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GRID_PADDING = 16;
const ITEM_MARGIN = 2;
const NUM_COLUMNS = 3;
const ITEM_WIDTH = (SCREEN_WIDTH - GRID_PADDING * 2 - ITEM_MARGIN * 2 * NUM_COLUMNS) / NUM_COLUMNS;

// ─── Компонент одного фото ────────────────────────────────────────────────────
const FavoriteItem = ({
  item,
  isSelected,
  isSelectionMode,
  onPress,
  onRemove,
  styles,
}: {
  item: MediaItem;
  isSelected: boolean;
  isSelectionMode: boolean;
  onPress: (item: MediaItem) => void;
  onRemove: (item: MediaItem) => void;
  styles: ReturnType<typeof createStyles>;
}) => {
  const [displayUri, setDisplayUri] = useState<string | null>(() => {
    const cached = getCachedOptimizedPreviewUri(item, 'list');
    return isUnsupportedMediaUri(cached) ? null : cached;
  });

  useEffect(() => {
    let isMounted = true;
    void resolveOptimizedPreviewUri(item, 'list').then((uri) => {
      if (isMounted) setDisplayUri(isUnsupportedMediaUri(uri) ? null : uri);
    });
    return () => { isMounted = false; };
  }, [item.id, item.uri]);

  return (
    <Pressable
      style={[styles.itemContainer, isSelected && styles.itemSelected]}
      onPress={() => onPress(item)}
    >
      {displayUri ? (
        <Image source={{ uri: displayUri }} style={styles.thumbnail} resizeMode="cover" />
      ) : (
        <View style={[styles.thumbnail, styles.thumbnailFallback]} />
      )}
      {item.mediaType === 'video' && (
        <View style={styles.videoBadge}>
          <Feather name="play" size={12} color="#fff" />
        </View>
      )}
      {isSelectionMode ? (
        <View style={[styles.checkCircle, isSelected && styles.checkCircleSelected]}>
          {isSelected && <Feather name="check" size={12} color="#fff" />}
        </View>
      ) : (
        <Pressable style={styles.removeButton} onPress={() => onRemove(item)} hitSlop={8}>
          <Feather name="x" size={14} color="#fff" />
        </Pressable>
      )}
    </Pressable>
  );
};

// ─── Компонент карточки альбома ───────────────────────────────────────────────
const AlbumCard = ({
  album,
  coverItem,
  photoCount,
  onPress,
  styles,
}: {
  album: FavoriteAlbum;
  coverItem: MediaItem | null;
  photoCount: number;
  onPress: (album: FavoriteAlbum) => void;
  styles: ReturnType<typeof createStyles>;
}) => {
  const [coverUri, setCoverUri] = useState<string | null>(() => {
    if (!coverItem) return null;
    const cached = getCachedOptimizedPreviewUri(coverItem, 'list');
    return isUnsupportedMediaUri(cached) ? null : cached;
  });

  useEffect(() => {
    if (!coverItem) { setCoverUri(null); return; }
    let isMounted = true;
    void resolveOptimizedPreviewUri(coverItem, 'list').then((uri) => {
      if (isMounted) setCoverUri(isUnsupportedMediaUri(uri) ? null : uri);
    });
    return () => { isMounted = false; };
  }, [coverItem?.id, coverItem?.uri]);

  return (
    <Pressable style={styles.albumCard} onPress={() => onPress(album)}>
      <View style={styles.albumCover}>
        {coverUri ? (
          <Image source={{ uri: coverUri }} style={styles.albumCoverImage} resizeMode="cover" />
        ) : (
          <View style={styles.albumCoverFallback}>
            <Feather name="image" size={28} color="rgba(255,255,255,0.4)" />
          </View>
        )}
      </View>
      <Text style={styles.albumName} numberOfLines={1}>{album.name}</Text>
      <Text style={styles.albumCount}>{photoCount}</Text>
    </Pressable>
  );
};

// ─── Главный экран ────────────────────────────────────────────────────────────
export default function FavoritesScreen() {
  const colors = useAppTheme();
  const { t } = useI18n();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const favorites = usePhotoStore((state) => state.favorites);
  const favoriteAlbums = usePhotoStore((state) => state.favoriteAlbums);
  const photoAlbumMap = usePhotoStore((state) => state.photoAlbumMap);
  const removeFromFavorites = usePhotoStore((state) => state.removeFromFavorites);
  const createFavoriteAlbum = usePhotoStore((state) => state.createFavoriteAlbum);
  const assignPhotosToAlbum = usePhotoStore((state) => state.assignPhotosToAlbum);
  const getAlbumPhotos = usePhotoStore((state) => state.getAlbumPhotos);

  useFileSizeLoader(favorites);

  // Вкладки
  const [activeTab, setActiveTab] = useState<'all' | 'albums'>('all');

  // Selection mode
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Создание альбома
  const [showCreateAlbum, setShowCreateAlbum] = useState(false);
  const [newAlbumName, setNewAlbumName] = useState('');

  const totalSize = useMemo(
    () => favorites.reduce((sum, item) => sum + (item.fileSize ?? 0), 0),
    [favorites]
  );

  // Обложки альбомов — передаём MediaItem для корректного резолвинга URI
  const albumCoverItems = useMemo(() => {
    const map: Record<string, MediaItem | null> = {};
    favoriteAlbums.forEach((album) => {
      const photos = getAlbumPhotos(album.id);
      map[album.id] = photos[0] ?? null;
    });
    return map;
  }, [favoriteAlbums, getAlbumPhotos, photoAlbumMap]);

  const albumPhotoCounts = useMemo(() => {
    const map: Record<string, number> = {};
    favoriteAlbums.forEach((album) => {
      map[album.id] = getAlbumPhotos(album.id).length;
    });
    return map;
  }, [favoriteAlbums, getAlbumPhotos, photoAlbumMap]);

  // ─── Handlers ──────────────────────────────────────────────────────────────

  const handleRemove = useCallback((item: MediaItem) => {
    removeFromFavorites(item.id);
  }, [removeFromFavorites]);

  const handlePhotoPress = useCallback((item: MediaItem) => {
    if (!isSelectionMode) return;
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(item.id)) { next.delete(item.id); } else { next.add(item.id); }
      return next;
    });
  }, [isSelectionMode]);

  const enterSelectionMode = useCallback(() => {
    setIsSelectionMode(true);
    setSelectedIds(new Set());
  }, []);

  const exitSelectionMode = useCallback(() => {
    setIsSelectionMode(false);
    setSelectedIds(new Set());
  }, []);

  const handleAlbumPress = useCallback((album: FavoriteAlbum) => {
    router.push({ pathname: '/album/[albumId]', params: { albumId: album.id } });
  }, [router]);

  const handleCreateAlbum = useCallback(() => {
    const name = newAlbumName.trim();
    if (!name) return;
    const album = createFavoriteAlbum(name);
    // Если есть выбранные фото — сразу добавляем в новый альбом
    if (selectedIds.size > 0) {
      assignPhotosToAlbum(Array.from(selectedIds), album.id);
      exitSelectionMode();
    }
    setNewAlbumName('');
    setShowCreateAlbum(false);
    setActiveTab('albums');
  }, [newAlbumName, createFavoriteAlbum, selectedIds, assignPhotosToAlbum, exitSelectionMode]);

  const handleMoveToAlbum = useCallback(() => {
    if (selectedIds.size === 0) return;
    if (favoriteAlbums.length === 0) {
      // Нет альбомов — предлагаем создать
      setShowCreateAlbum(true);
      return;
    }
    Alert.alert(
      t('albums.selectAlbum'),
      undefined,
      [
        ...favoriteAlbums.map((album) => ({
          text: album.name,
          onPress: () => {
            assignPhotosToAlbum(Array.from(selectedIds), album.id);
            exitSelectionMode();
          },
        })),
        {
          text: t('albums.newAlbum').replace('+ ', ''),
          onPress: () => setShowCreateAlbum(true),
        },
        { text: t('albums.deleteCancel'), style: 'cancel' as const },
      ]
    );
  }, [selectedIds, favoriteAlbums, assignPhotosToAlbum, exitSelectionMode, t]);

  // ─── Render items ───────────────────────────────────────────────────────────

  const renderPhoto = useCallback(
    ({ item }: { item: MediaItem }) => (
      <FavoriteItem
        item={item}
        isSelected={selectedIds.has(item.id)}
        isSelectionMode={isSelectionMode}
        onPress={handlePhotoPress}
        onRemove={handleRemove}
        styles={styles}
      />
    ),
    [selectedIds, isSelectionMode, handlePhotoPress, handleRemove, styles]
  );

  const renderAlbum = useCallback(
    ({ item }: { item: FavoriteAlbum }) => (
      <AlbumCard
        album={item}
        coverItem={albumCoverItems[item.id] ?? null}
        photoCount={albumPhotoCounts[item.id] ?? 0}
        onPress={handleAlbumPress}
        styles={styles}
      />
    ),
    [albumCoverItems, albumPhotoCounts, handleAlbumPress, styles]
  );

  const keyExtractor = useCallback((item: MediaItem | FavoriteAlbum) => item.id, []);

  return (
    <GradientBackground>
      <View style={{ flex: 1 }}>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.container}>

          {/* Заголовок */}
          <View style={styles.headerRow}>
            <Text style={styles.title}>{t('favorites.title')}</Text>
            {activeTab === 'all' && !isSelectionMode && favorites.length > 0 && (
              <Pressable onPress={enterSelectionMode} style={styles.selectBtn} hitSlop={8}>
                <Text style={styles.selectBtnText}>{t('albums.selectMode')}</Text>
              </Pressable>
            )}
            {isSelectionMode && (
              <Pressable onPress={exitSelectionMode} style={styles.selectBtn} hitSlop={8}>
                <Text style={styles.selectBtnText}>{t('albums.selectDone')}</Text>
              </Pressable>
            )}
          </View>

          {/* Вкладки */}
          <View style={styles.tabs}>
            <Pressable
              style={[styles.tab, activeTab === 'all' && styles.tabActive]}
              onPress={() => { setActiveTab('all'); exitSelectionMode(); }}
            >
              <Text style={[styles.tabText, activeTab === 'all' && styles.tabTextActive]}>
                {t('albums.tabAll')}
              </Text>
            </Pressable>
            <Pressable
              style={[styles.tab, activeTab === 'albums' && styles.tabActive]}
              onPress={() => { setActiveTab('albums'); exitSelectionMode(); }}
            >
              <Text style={[styles.tabText, activeTab === 'albums' && styles.tabTextActive]}>
                {t('albums.tabAlbums')}
              </Text>
            </Pressable>
          </View>

          {/* ── Вкладка "Все фото" ── */}
          {activeTab === 'all' && (
            <>
              {favorites.length > 0 && (
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryText}>
                    {t('favorites.summaryFiles', { count: favorites.length })}
                  </Text>
                  <Text style={styles.summaryText}>
                    {t('favorites.summarySize', { size: formatFileSize(totalSize) })}
                  </Text>
                </View>
              )}
              {favorites.length === 0 ? (
                <EmptyState title={t('favorites.emptyTitle')} subtitle={t('favorites.emptySubtitle')} />
              ) : (
                <FlatList
                  data={favorites}
                  keyExtractor={keyExtractor}
                  renderItem={renderPhoto}
                  numColumns={NUM_COLUMNS}
                  contentContainerStyle={[
                    styles.listContent,
                    isSelectionMode && selectedIds.size > 0 && styles.listContentWithBar,
                  ]}
                  showsVerticalScrollIndicator={false}
                />
              )}
            </>
          )}

          {/* ── Вкладка "Альбомы" ── */}
          {activeTab === 'albums' && (
            <>
              <Pressable style={styles.newAlbumBtn} onPress={() => setShowCreateAlbum(true)}>
                <Text style={styles.newAlbumBtnText}>{t('albums.newAlbum')}</Text>
              </Pressable>
              {favoriteAlbums.length === 0 ? (
                <EmptyState title={t('albums.emptyTitle')} subtitle={t('albums.emptySubtitle')} />
              ) : (
                <FlatList
                  data={favoriteAlbums}
                  keyExtractor={keyExtractor}
                  renderItem={renderAlbum}
                  numColumns={2}
                  contentContainerStyle={styles.albumsListContent}
                  showsVerticalScrollIndicator={false}
                />
              )}
            </>
          )}
          </View>
        </SafeAreaView>

        {/* ── Нижняя панель selection mode — вне SafeAreaView ── */}
        {isSelectionMode && selectedIds.size > 0 && (
          <View style={[styles.selectionBar, { paddingBottom: insets.bottom + 80 }]}>
            <Text style={styles.selectionCount}>
              {t('albums.selectedCount', { count: selectedIds.size })}
            </Text>
            <Pressable style={styles.selectionAction} onPress={handleMoveToAlbum}>
              <Feather name="folder-plus" size={18} color={colors.accent} />
              <Text style={[styles.selectionActionText, { color: colors.accent }]}>
                {t('albums.moveToAlbum')}
              </Text>
            </Pressable>
          </View>
        )}

        {/* ── Модалка создания альбома ── */}
        {showCreateAlbum && (
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>{t('albums.createTitle')}</Text>
              <TextInput
                style={styles.modalInput}
                placeholder={t('albums.createPlaceholder')}
                placeholderTextColor={colors.textSecondary}
                value={newAlbumName}
                onChangeText={setNewAlbumName}
                autoFocus
                returnKeyType="done"
                onSubmitEditing={handleCreateAlbum}
              />
              <View style={styles.modalActions}>
                <Pressable
                  style={styles.modalCancel}
                  onPress={() => { setShowCreateAlbum(false); setNewAlbumName(''); }}
                >
                  <Text style={styles.modalCancelText}>{t('albums.deleteCancel')}</Text>
                </Pressable>
                <Pressable
                  style={[styles.modalConfirm, !newAlbumName.trim() && styles.modalConfirmDisabled]}
                  onPress={handleCreateAlbum}
                  disabled={!newAlbumName.trim()}
                >
                  <Text style={styles.modalConfirmText}>{t('albums.createConfirm')}</Text>
                </Pressable>
              </View>
            </View>
          </View>
        )}
      </View>
    </GradientBackground>
  );
}

const createStyles = (colors: ReturnType<typeof useAppTheme>) =>
  StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: 'transparent', position: 'relative' },
    container: { flex: 1, paddingHorizontal: 16, paddingTop: 2, paddingBottom: 0 },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 12,
    },
    title: {
      color: colors.textSecondary,
      fontSize: 18,
      ...typography.semibold,
    },
    selectBtn: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      backgroundColor: colors.surfaceElevated,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
    },
    selectBtnText: {
      color: colors.accent,
      fontSize: 13,
      ...typography.semibold,
    },
    // Вкладки
    tabs: {
      flexDirection: 'row',
      backgroundColor: colors.surfaceElevated,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 3,
      marginBottom: 12,
    },
    tab: {
      flex: 1,
      paddingVertical: 7,
      alignItems: 'center',
      borderRadius: 10,
    },
    tabActive: {
      backgroundColor: colors.accent,
    },
    tabText: {
      fontSize: 13,
      color: colors.textSecondary,
      ...typography.semibold,
    },
    tabTextActive: {
      color: '#fff',
    },
    // Сводка
    summaryRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      backgroundColor: colors.surfaceElevated,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 16,
      paddingVertical: 10,
      marginBottom: 12,
    },
    summaryText: {
      color: colors.textSecondary,
      fontSize: 13,
      ...typography.regular,
    },
    listContent: { paddingBottom: 120 },
    listContentWithBar: { paddingBottom: 200 },
    // Фото
    itemContainer: {
      width: ITEM_WIDTH,
      margin: ITEM_MARGIN,
      aspectRatio: 1,
      borderRadius: 8,
      overflow: 'hidden',
      backgroundColor: colors.surface,
    },
    itemSelected: {
      opacity: 0.7,
      borderWidth: 2,
      borderColor: colors.accent,
    },
    thumbnail: { width: '100%', height: '100%' },
    thumbnailFallback: { backgroundColor: colors.surface },
    videoBadge: {
      position: 'absolute',
      bottom: 6,
      left: 6,
      backgroundColor: 'rgba(0,0,0,0.55)',
      borderRadius: 10,
      padding: 3,
    },
    removeButton: {
      position: 'absolute',
      top: 4,
      right: 4,
      backgroundColor: 'rgba(0,0,0,0.55)',
      borderRadius: 10,
      padding: 3,
      zIndex: 10,
    },
    checkCircle: {
      position: 'absolute',
      top: 6,
      right: 6,
      width: 22,
      height: 22,
      borderRadius: 11,
      borderWidth: 2,
      borderColor: '#fff',
      backgroundColor: 'rgba(0,0,0,0.3)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    checkCircleSelected: {
      backgroundColor: colors.accent,
      borderColor: colors.accent,
    },
    // Альбомы
    newAlbumBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingVertical: 10,
      paddingHorizontal: 14,
      backgroundColor: colors.surfaceElevated,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: 12,
      alignSelf: 'flex-start',
    },
    newAlbumBtnText: {
      color: colors.accent,
      fontSize: 14,
      ...typography.semibold,
    },
    albumsListContent: { paddingBottom: 120 },
    albumCard: {
      flex: 1,
      margin: 6,
      maxWidth: '50%',
    },
    albumCover: {
      aspectRatio: 1,
      borderRadius: 14,
      overflow: 'hidden',
      backgroundColor: colors.surfaceElevated,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: 6,
    },
    albumCoverImage: { width: '100%', height: '100%' },
    albumCoverFallback: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.surface,
    },
    albumName: {
      color: colors.textPrimary,
      fontSize: 14,
      ...typography.semibold,
      marginBottom: 2,
    },
    albumCount: {
      color: colors.textSecondary,
      fontSize: 12,
      ...typography.regular,
    },
    // Selection bar
    selectionBar: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      zIndex: 50,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: colors.surfaceElevated,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      paddingHorizontal: 20,
      paddingVertical: 14,
      paddingBottom: 28,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: -4 },
      shadowOpacity: 0.15,
      shadowRadius: 12,
      elevation: 10,
    },
    selectionCount: {
      color: colors.textPrimary,
      fontSize: 15,
      ...typography.semibold,
    },
    selectionAction: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    selectionActionText: {
      fontSize: 15,
      ...typography.semibold,
    },
    // Модалка создания альбома
    modalOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(0,0,0,0.6)',
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 24,
      zIndex: 100,
    },
    modalCard: {
      width: '100%',
      backgroundColor: colors.isDark ? '#1C2B3A' : '#fff',
      borderRadius: 20,
      padding: 24,
      borderWidth: 1,
      borderColor: colors.border,
    },
    modalTitle: {
      color: colors.textPrimary,
      fontSize: 18,
      ...typography.bold,
      marginBottom: 16,
    },
    modalInput: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 14,
      paddingVertical: 12,
      color: colors.textPrimary,
      fontSize: 15,
      ...typography.regular,
      marginBottom: 16,
    },
    modalActions: {
      flexDirection: 'row',
      gap: 10,
    },
    modalCancel: {
      flex: 1,
      paddingVertical: 12,
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
    },
    modalCancelText: {
      color: colors.textSecondary,
      fontSize: 15,
      ...typography.semibold,
    },
    modalConfirm: {
      flex: 1,
      paddingVertical: 12,
      alignItems: 'center',
      backgroundColor: colors.accent,
      borderRadius: 12,
    },
    modalConfirmDisabled: {
      opacity: 0.4,
    },
    modalConfirmText: {
      color: '#fff',
      fontSize: 15,
      ...typography.semibold,
    },
  });
