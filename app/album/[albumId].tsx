import { Feather } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
    Alert,
    Dimensions,
    FlatList,
    Image,
    Pressable,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EmptyState } from '@/components/EmptyState';
import { GradientBackground } from '@/components/GradientBackground';
import { useAppTheme } from '@/components/useAppTheme';
import { typography } from '@/constants/typography';
import { useI18n } from '@/hooks/useI18n';
import { usePhotoStore } from '@/store/photoStore';
import { MediaItem } from '@/types';
import { getCachedOptimizedPreviewUri, resolveOptimizedPreviewUri } from '@/utils/optimizedPreview';
import { isUnsupportedMediaUri } from '@/utils/resolveMediaUri';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GRID_PADDING = 16;
const ITEM_MARGIN = 2;
const NUM_COLUMNS = 3;
const ITEM_WIDTH = (SCREEN_WIDTH - GRID_PADDING * 2 - ITEM_MARGIN * 2 * NUM_COLUMNS) / NUM_COLUMNS;

// Компонент одного фото в альбоме
const AlbumPhotoItem = ({
  item,
  isSelected,
  isSelectionMode,
  onPress,
  styles,
}: {
  item: MediaItem;
  isSelected: boolean;
  isSelectionMode: boolean;
  onPress: (item: MediaItem) => void;
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
      {isSelectionMode && (
        <View style={[styles.checkCircle, isSelected && styles.checkCircleSelected]}>
          {isSelected && <Feather name="check" size={12} color="#fff" />}
        </View>
      )}
    </Pressable>
  );
};

export default function AlbumScreen() {
  const colors = useAppTheme();
  const { t } = useI18n();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const router = useRouter();

  const { albumId } = useLocalSearchParams<{ albumId?: string }>();

  const favoriteAlbums = usePhotoStore((state) => state.favoriteAlbums);
  const getAlbumPhotos = usePhotoStore((state) => state.getAlbumPhotos);
  const renameFavoriteAlbum = usePhotoStore((state) => state.renameFavoriteAlbum);
  const deleteFavoriteAlbum = usePhotoStore((state) => state.deleteFavoriteAlbum);
  const removePhotosFromAlbum = usePhotoStore((state) => state.removePhotosFromAlbum);

  const album = useMemo(
    () => favoriteAlbums.find((a) => a.id === albumId) ?? null,
    [favoriteAlbums, albumId]
  );

  const photos = useMemo(
    () => (albumId ? getAlbumPhotos(albumId) : []),
    [albumId, getAlbumPhotos, favoriteAlbums]
  );

  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const toggleSelection = useCallback((item: MediaItem) => {
    if (!isSelectionMode) return;
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(item.id)) {
        next.delete(item.id);
      } else {
        next.add(item.id);
      }
      return next;
    });
  }, [isSelectionMode]);

  const handlePhotoPress = useCallback((item: MediaItem) => {
    if (isSelectionMode) {
      toggleSelection(item);
    }
  }, [isSelectionMode, toggleSelection]);

  const enterSelectionMode = useCallback(() => {
    setIsSelectionMode(true);
    setSelectedIds(new Set());
  }, []);

  const exitSelectionMode = useCallback(() => {
    setIsSelectionMode(false);
    setSelectedIds(new Set());
  }, []);

  const handleRemoveSelected = useCallback(() => {
    if (selectedIds.size === 0) return;
    Alert.alert(
      t('albums.removeFromAlbum'),
      t('albums.deleteMessage'),
      [
        { text: t('albums.deleteCancel'), style: 'cancel' },
        {
          text: t('albums.deleteConfirm'),
          style: 'destructive',
          onPress: () => {
            removePhotosFromAlbum(Array.from(selectedIds));
            exitSelectionMode();
          },
        },
      ]
    );
  }, [selectedIds, removePhotosFromAlbum, exitSelectionMode, t]);

  const handleRename = useCallback(() => {
    if (!album) return;
    Alert.prompt(
      t('albums.renameTitle'),
      undefined,
      [
        { text: t('albums.deleteCancel'), style: 'cancel' },
        {
          text: t('albums.renameConfirm'),
          onPress: (name) => {
            if (name?.trim()) renameFavoriteAlbum(album.id, name.trim());
          },
        },
      ],
      'plain-text',
      album.name
    );
  }, [album, renameFavoriteAlbum, t]);

  const handleDeleteAlbum = useCallback(() => {
    if (!album) return;
    Alert.alert(
      t('albums.deleteTitle'),
      t('albums.deleteMessage'),
      [
        { text: t('albums.deleteCancel'), style: 'cancel' },
        {
          text: t('albums.deleteConfirm'),
          style: 'destructive',
          onPress: () => {
            deleteFavoriteAlbum(album.id);
            router.back();
          },
        },
      ]
    );
  }, [album, deleteFavoriteAlbum, router, t]);

  const handleMenu = useCallback(() => {
    Alert.alert(
      album?.name ?? '',
      undefined,
      [
        { text: t('albums.menuRename'), onPress: handleRename },
        { text: t('albums.menuDelete'), style: 'destructive', onPress: handleDeleteAlbum },
        { text: t('albums.deleteCancel'), style: 'cancel' },
      ]
    );
  }, [album, handleRename, handleDeleteAlbum, t]);

  const renderItem = useCallback(
    ({ item }: { item: MediaItem }) => (
      <AlbumPhotoItem
        item={item}
        isSelected={selectedIds.has(item.id)}
        isSelectionMode={isSelectionMode}
        onPress={handlePhotoPress}
        styles={styles}
      />
    ),
    [selectedIds, isSelectionMode, handlePhotoPress, styles]
  );

  const keyExtractor = useCallback((item: MediaItem) => item.id, []);

  if (!album) {
    return (
      <GradientBackground>
        <SafeAreaView style={styles.safeArea}>
          <EmptyState title="Album not found" subtitle="" />
        </SafeAreaView>
      </GradientBackground>
    );
  }

  return (
    <GradientBackground>
      <SafeAreaView style={styles.safeArea}>
        {/* Шапка */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.headerBtn} hitSlop={8}>
            <Feather name="arrow-left" size={22} color={colors.textPrimary} />
          </Pressable>

          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle} numberOfLines={1}>{album.name}</Text>
            <Text style={styles.headerSubtitle}>
              {t('albums.photoCount', { count: photos.length })}
            </Text>
          </View>

          <View style={styles.headerRight}>
            {isSelectionMode ? (
              <Pressable onPress={exitSelectionMode} style={styles.headerBtnWide} hitSlop={8}>
                <Text style={styles.headerBtnText} numberOfLines={1}>{t('albums.selectDone')}</Text>
              </Pressable>
            ) : (
              <>
                <Pressable onPress={enterSelectionMode} style={styles.headerBtn} hitSlop={8}>
                  <Feather name="check-square" size={20} color={colors.textPrimary} />
                </Pressable>
                <Pressable onPress={handleMenu} style={styles.headerBtn} hitSlop={8}>
                  <Feather name="more-horizontal" size={22} color={colors.textPrimary} />
                </Pressable>
              </>
            )}
          </View>
        </View>

        {/* Сетка фото */}
        {photos.length === 0 ? (
          <EmptyState
            title={t('albums.emptyAlbumTitle')}
            subtitle={t('albums.emptyAlbumSubtitle')}
          />
        ) : (
          <FlatList
            data={photos}
            keyExtractor={keyExtractor}
            renderItem={renderItem}
            numColumns={NUM_COLUMNS}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />
        )}

        {/* Нижняя панель в режиме выделения */}
        {isSelectionMode && selectedIds.size > 0 && (
          <View style={styles.selectionBar}>
            <Text style={styles.selectionCount}>
              {t('albums.selectedCount', { count: selectedIds.size })}
            </Text>
            <Pressable style={styles.selectionAction} onPress={handleRemoveSelected}>
              <Feather name="trash-2" size={18} color="#EF4444" />
              <Text style={styles.selectionActionText}>{t('albums.removeFromAlbum')}</Text>
            </Pressable>
          </View>
        )}
      </SafeAreaView>
    </GradientBackground>
  );
}

const createStyles = (colors: ReturnType<typeof useAppTheme>) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: 'transparent',
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 12,
      gap: 8,
    },
    headerBtn: {
      width: 36,
      height: 36,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerBtnWide: {
      height: 36,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 4,
    },
    headerBtnText: {
      color: colors.accent,
      fontSize: 15,
      ...typography.semibold,
    },
    headerCenter: {
      flex: 1,
      alignItems: 'center',
    },
    headerTitle: {
      color: colors.textPrimary,
      fontSize: 17,
      ...typography.bold,
    },
    headerSubtitle: {
      color: colors.textSecondary,
      fontSize: 12,
      ...typography.regular,
    },
    headerRight: {
      flexDirection: 'row',
      gap: 4,
    },
    listContent: {
      paddingHorizontal: GRID_PADDING,
      paddingBottom: 120,
    },
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
    thumbnail: {
      width: '100%',
      height: '100%',
    },
    thumbnailFallback: {
      backgroundColor: colors.surface,
    },
    videoBadge: {
      position: 'absolute',
      bottom: 6,
      left: 6,
      backgroundColor: 'rgba(0,0,0,0.55)',
      borderRadius: 10,
      padding: 3,
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
    selectionBar: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: colors.surfaceElevated,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      paddingHorizontal: 20,
      paddingVertical: 14,
      paddingBottom: 28,
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
      color: '#EF4444',
      fontSize: 15,
      ...typography.semibold,
    },
  });
