import { Feather } from '@expo/vector-icons';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, Image, Pressable, StyleSheet, Text, View, Modal, Dimensions, Platform } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withSpring, 
  withTiming,
  runOnJS
} from 'react-native-reanimated';

import { EmptyState } from '@/components/EmptyState';
import { GradientBackground } from '@/components/GradientBackground';
import { useAppTheme } from '@/components/useAppTheme';
import { typography } from '@/constants/typography';
import { useFileSizeLoader } from '@/hooks/useFileSizeLoader';
import { useI18n } from '@/hooks/useI18n';
import { usePhotoStore } from '@/store/photoStore';
import { MediaItem } from '@/types';
import { formatFileSize } from '@/utils/formatFileSize';
import { getCachedOptimizedPreviewUri, resolveOptimizedPreviewUri } from '@/utils/optimizedPreview';
import { isUnsupportedMediaUri } from '@/utils/resolveMediaUri';
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const GRID_PADDING = 16;
const ITEM_MARGIN = 2;
const NUM_COLUMNS = 3;
const ITEM_WIDTH = (SCREEN_WIDTH - GRID_PADDING * 2 - ITEM_MARGIN * 2 * NUM_COLUMNS) / NUM_COLUMNS;

// Отдельный компонент для одного фото с резолвингом URI
const FavoriteItem = ({ item, onRemove, onPress, styles }: {
  item: MediaItem;
  onRemove: (item: MediaItem) => void;
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
      if (isMounted) {
        setDisplayUri(isUnsupportedMediaUri(uri) ? null : uri);
      }
    });
    return () => { isMounted = false; };
  }, [item.id, item.uri]);

  return (
    <Pressable style={styles.itemContainer} onPress={() => onPress(item)}>
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
      <Pressable style={styles.removeButton} onPress={() => onRemove(item)} hitSlop={8}>
        <Feather name="x" size={14} color="#fff" />
      </Pressable>
    </Pressable>
  );
};

export default function FavoritesScreen() {
  const colors = useAppTheme();
  const { t } = useI18n();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const insets = useSafeAreaInsets();

  const favorites = usePhotoStore((state) => state.favorites);
  const removeFromFavorites = usePhotoStore((state) => state.removeFromFavorites);
  const [selectedItem, setSelectedItem] = useState<MediaItem | null>(null);

  // Загружаем размеры файлов по требованию
  useFileSizeLoader(favorites);

  // Общий размер избранных файлов
  const totalSize = useMemo(
    () => favorites.reduce((sum, item) => sum + (item.fileSize ?? 0), 0),
    [favorites]
  );

  const handleRemove = useCallback(
    (item: MediaItem) => {
      removeFromFavorites(item.id);
    },
    [removeFromFavorites]
  );

  const handlePress = useCallback((item: MediaItem) => {
    setSelectedItem(item);
  }, []);

  const renderItem = useCallback(
    ({ item }: { item: MediaItem }) => (
      <FavoriteItem item={item} onRemove={handleRemove} onPress={handlePress} styles={styles} />
    ),
    [handleRemove, handlePress, styles]
  );

  const keyExtractor = useCallback((item: MediaItem) => item.id, []);

  return (
    <GradientBackground>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
          <Text style={styles.title}>{t('favorites.title')}</Text>

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
            <EmptyState
              title={t('favorites.emptyTitle')}
              subtitle={t('favorites.emptySubtitle')}
            />
          ) : (
            <FlatList
              data={favorites}
              keyExtractor={keyExtractor}
              renderItem={renderItem}
              numColumns={NUM_COLUMNS}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
            />
          )}

          <Modal
            visible={!!selectedItem}
            transparent={true}
            animationType="fade"
            onRequestClose={() => setSelectedItem(null)}
          >
            <GestureHandlerRootView style={{ flex: 1 }}>
              <View style={styles.modalOverlay}>
                <View style={[styles.modalContent, { paddingTop: insets.top }]}>
                  <View style={styles.modalHeader}>
                  <Pressable style={styles.closeButton} onPress={() => setSelectedItem(null)}>
                    <Feather name="x" size={28} color="#fff" />
                  </Pressable>
                </View>
                
                <View style={styles.modalImageContainer}>
                  {selectedItem && (
                    <FullResolutionImage item={selectedItem} styles={styles} />
                  )}
                </View>

                <View style={[styles.modalFooter, { paddingBottom: Math.max(insets.bottom, 20) }]}>
                  <Text style={styles.modalFilename} numberOfLines={1}>
                    {selectedItem?.filename}
                  </Text>
                  <Text style={styles.modalMeta}>
                    {selectedItem ? formatFileSize(selectedItem.fileSize) : ''}
                  </Text>
                </View>
              </View>
            </View>
            </GestureHandlerRootView>
          </Modal>
        </View>
      </SafeAreaView>
    </GradientBackground>
  );
}

const FullResolutionImage = ({ item, styles }: { item: MediaItem; styles: any }) => {
  const [uri, setUri] = useState<string | null>(null);
  
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);

  useEffect(() => {
    let isMounted = true;
    resolveOptimizedPreviewUri(item, 'card').then(resolvedUri => {
      if (isMounted) setUri(resolvedUri);
    });
    // Reset zoom when item changes
    scale.value = 1;
    savedScale.value = 1;
    translateX.value = 0;
    translateY.value = 0;
    savedTranslateX.value = 0;
    savedTranslateY.value = 0;
    
    return () => { isMounted = false; };
  }, [item]);

  const pinchGesture = Gesture.Pinch()
    .onUpdate((event) => {
      scale.value = savedScale.value * event.scale;
    })
    .onEnd(() => {
      if (scale.value < 1) {
        scale.value = withSpring(1);
        savedScale.value = 1;
        translateX.value = withSpring(0);
        translateY.value = withSpring(0);
        savedTranslateX.value = 0;
        savedTranslateY.value = 0;
      } else {
        savedScale.value = scale.value;
      }
    });

  const panGesture = Gesture.Pan()
    .onUpdate((event) => {
      if (scale.value > 1) {
        translateX.value = savedTranslateX.value + event.translationX;
        translateY.value = savedTranslateY.value + event.translationY;
      }
    })
    .onEnd(() => {
      if (scale.value > 1) {
        savedTranslateX.value = translateX.value;
        savedTranslateY.value = translateY.value;
      } else {
        translateX.value = withSpring(0);
        translateY.value = withSpring(0);
        savedTranslateX.value = 0;
        savedTranslateY.value = 0;
      }
    });

  const doubleTapGesture = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd(() => {
      scale.value = withSpring(1);
      savedScale.value = 1;
      translateX.value = withSpring(0);
      translateY.value = withSpring(0);
      savedTranslateX.value = 0;
      savedTranslateY.value = 0;
    });

  const composedGesture = Gesture.Simultaneous(
    pinchGesture, 
    Gesture.Race(panGesture, doubleTapGesture)
  );

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  if (!uri) return null;

  return (
    <GestureDetector gesture={composedGesture}>
      <Animated.Image 
        source={{ uri }} 
        style={[styles.fullImage, animatedStyle]} 
        resizeMode="contain" 
      />
    </GestureDetector>
  );
};

const createStyles = (colors: ReturnType<typeof useAppTheme>) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: 'transparent',
    },
    container: {
      flex: 1,
      backgroundColor: 'transparent',
      paddingHorizontal: 16,
      paddingTop: 2,
    },
    title: {
      color: colors.textSecondary,
      fontSize: 18,
      ...typography.semibold,
      textAlign: 'center',
      marginBottom: 10,
    },
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
    listContent: {
      paddingBottom: 100,
    },
    itemContainer: {
      width: ITEM_WIDTH,
      margin: ITEM_MARGIN,
      aspectRatio: 1,
      borderRadius: 8,
      overflow: 'hidden',
      backgroundColor: colors.surface,
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
    removeButton: {
      position: 'absolute',
      top: 4,
      right: 4,
      backgroundColor: 'rgba(0,0,0,0.55)',
      borderRadius: 10,
      padding: 3,
      zIndex: 10,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.95)',
    },
    modalContent: {
      flex: 1,
    },
    modalHeader: {
      height: 70,
      flexDirection: 'row',
      justifyContent: 'flex-end',
      alignItems: 'center',
      paddingHorizontal: 20,
      zIndex: 100,
    },
    closeButton: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: 'rgba(255, 255, 255, 0.1)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    modalImageContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    fullImage: {
      width: '100%',
      height: '100%',
    },
    modalFooter: {
      padding: 24,
      alignItems: 'center',
    },
    modalFilename: {
      color: '#fff',
      fontSize: 16,
      ...typography.semibold,
      marginBottom: 4,
    },
    modalMeta: {
      color: 'rgba(255, 255, 255, 0.6)',
      fontSize: 14,
      ...typography.regular,
    },
  });
