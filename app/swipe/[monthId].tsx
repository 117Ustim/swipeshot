import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ActionButton } from '@/components/ActionButton';
import { EmptyState } from '@/components/EmptyState';
import { GradientBackground } from '@/components/GradientBackground';
import { ProgressIndicator } from '@/components/ProgressIndicator';
import { SwipeCard } from '@/components/SwipeCard';
import { useAppTheme } from '@/components/useAppTheme';
import { typography } from '@/constants/typography';
import { useI18n } from '@/hooks/useI18n';
import { usePhotoStore } from '@/store/photoStore';
import { MediaItem } from '@/types';
import { formatFileSize } from '@/utils/formatFileSize';
import { isLargeVideo } from '@/utils/isLargeVideo';
import { pruneOptimizedPreviewCache, resolveOptimizedPreviewUri } from '@/utils/optimizedPreview';
import { isUnsupportedMediaUri, pruneResolvedMediaUriCache } from '@/utils/resolveMediaUri';

type SwipeQueueEntry = {
  item: MediaItem;
  sourceIndex: number;
};

// Кнопка-подсказка со стрелкой, иконкой и лейблом
type SwipeActionButtonProps = {
  emoji: string;
  label: string;
  arrow: string;
  color: string;
  onPress: () => void;
  style?: object;
};

function SwipeActionButton({ emoji, label, arrow, color, onPress, style }: SwipeActionButtonProps) {
  const colors = useAppTheme();
  return (
    <TouchableOpacity
      activeOpacity={0.75}
      onPress={onPress}
      style={[{
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.surfaceElevated,
        borderRadius: 12,
        borderWidth: 1.5,
        borderColor: color + '55',
        paddingVertical: 6,
        paddingHorizontal: 6,
        gap: 4,
        shadowColor: color,
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.15,
        shadowRadius: 6,
        elevation: 2,
      }, style]}
    >
      <Text style={{ fontSize: 14 }}>{emoji}</Text>
      <Text style={{ color, fontSize: 12, fontFamily: typography.semibold.fontFamily }}>{label}</Text>
      <Text style={{ color: color + 'AA', fontSize: 12, fontFamily: typography.bold.fontFamily }}>{arrow}</Text>
    </TouchableOpacity>
  );
}

export default function SwipeScreen() {
  const colors = useAppTheme();
  const { t } = useI18n();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const { monthId } = useLocalSearchParams<{ monthId?: string }>();
  const router = useRouter();

  const currentMonthId = usePhotoStore((state) => state.currentMonthId);
  const currentIndex = usePhotoStore((state) => state.currentIndex);
  const setCurrentMonth = usePhotoStore((state) => state.setCurrentMonth);
  const setCurrentIndex = usePhotoStore((state) => state.setCurrentIndex);
  const month = usePhotoStore((state) => (monthId ? state.getSessionById(monthId) : null));
  const swipeActionVisibility = usePhotoStore((state) => state.swipeActionVisibility);

  const addToDeletionQueue = usePhotoStore((state) => state.addToDeletionQueue);
  const addToSafe = usePhotoStore((state) => state.addToSafe);
  const addToFavorites = usePhotoStore((state) => state.addToFavorites);

  // Геймификация
  const gamificationEnabled = usePhotoStore((state) => state.gamification.enabled);
  const recordSwipeAction = usePhotoStore((state) => state.recordSwipeAction);
  const startGamificationSession = usePhotoStore((state) => state.startGamificationSession);
  const endGamificationSession = usePhotoStore((state) => state.endGamificationSession);

  useEffect(() => {
    if (monthId && currentMonthId !== monthId) {
      setCurrentMonth(monthId);
    }
  }, [currentMonthId, monthId, setCurrentMonth]);

  // Стартуем сессию геймификации при входе на экран
  useEffect(() => {
    if (gamificationEnabled) {
      startGamificationSession();
    }
  }, []);

  const items = useMemo(() => month?.items ?? [], [month]);
  const total = items.length;
  const normalizedIndex = useMemo(
    () => Math.max(0, Math.min(currentIndex, total)),
    [currentIndex, total]
  );

  const totalLargeVideosSize = useMemo(
    () => items.filter((item) => isLargeVideo(item)).reduce((sum, item) => sum + item.fileSize, 0),
    [items]
  );

  const swipeQueue = useMemo(() => {
    const queue: SwipeQueueEntry[] = [];

    for (let index = normalizedIndex; index < items.length; index += 1) {
      const item = items[index];
      queue.push({ item, sourceIndex: index });
    }

    return queue;
  }, [items, normalizedIndex]);

  const currentEntry = swipeQueue[0] ?? null;
  const currentItem = currentEntry?.item ?? null;
  const progressCurrent = useMemo(() => {
    if (total === 0) {
      return 0;
    }

    const activeIndex = currentEntry?.sourceIndex ?? normalizedIndex;
    return Math.min(activeIndex + 1, total);
  }, [currentEntry?.sourceIndex, normalizedIndex, total]);

  useEffect(() => {
    const keepAssetIds = swipeQueue.slice(0, 8).map((entry) => entry.item.id);
    const targets = swipeQueue.slice(1, 4).map((entry) => entry.item);

    pruneResolvedMediaUriCache(keepAssetIds);
    pruneOptimizedPreviewCache(keepAssetIds);

    targets.forEach((item) => {
      void resolveOptimizedPreviewUri(item, 'prefetch')
        .then((uri) => {
          if (!isUnsupportedMediaUri(uri)) {
            return Image.prefetch(uri);
          }
          return false;
        })
        .catch(() => undefined);
    });
  }, [swipeQueue]);

  const moveToNext = useCallback(
    (fromIndex: number) => {
      const nextIndex = fromIndex + 1;
      setCurrentIndex(nextIndex);

      if (nextIndex >= items.length) {
        const hasDeletions = usePhotoStore.getState().deletionQueue.length > 0;
        if (hasDeletions) {
          router.replace(`/confirmation/${monthId ?? ''}`);
        } else {
          router.replace(`/completed/${monthId ?? ''}`);
        }
      }
    },
    [items.length, monthId, router, setCurrentIndex]
  );

  const handleSwipe = useCallback(
    (direction: 'left' | 'right' | 'up') => {
      if (!currentEntry) {
        return;
      }

      const targetItem = currentEntry.item;

      if (direction === 'left') {
        addToDeletionQueue(targetItem);
        if (gamificationEnabled) {
          recordSwipeAction('delete', targetItem.fileSize ?? 0);
        }
      } else if (direction === 'right') {
        addToSafe(targetItem);
        if (gamificationEnabled) {
          recordSwipeAction('keep', 0);
        }
      } else {
        addToFavorites(targetItem);
        if (gamificationEnabled) {
          recordSwipeAction('favorite', 0);
        }
      }

      moveToNext(currentEntry.sourceIndex);
    },
    [addToDeletionQueue, addToFavorites, addToSafe, currentEntry, gamificationEnabled, moveToNext, recordSwipeAction]
  );

  const handleSkip = useCallback(() => {
    if (!currentEntry) {
      return;
    }

    moveToNext(currentEntry.sourceIndex);
  }, [currentEntry, moveToNext]);

  const handleSwipeLeft = useCallback(() => handleSwipe('left'), [handleSwipe]);
  const handleSwipeRight = useCallback(() => handleSwipe('right'), [handleSwipe]);
  const handleSwipeUp = useCallback(() => handleSwipe('up'), [handleSwipe]);
  const showSwipeButtons = usePhotoStore((state) => state.showSwipeButtons);

  // --- Hint-оверлей при первом запуске ---
  const [showHint, setShowHint] = useState(false);
  const hintOpacity = useSharedValue(0);
  const hintShown = useRef(false);

  useEffect(() => {
    // Показываем hint только один раз — проверяем через store
    const alreadyShown = usePhotoStore.getState().swipeHintShown ?? false;
    if (!alreadyShown && !hintShown.current) {
      hintShown.current = true;
      setShowHint(true);
      hintOpacity.value = withDelay(400, withTiming(1, { duration: 350 }));
    }
  }, []);

  const dismissHint = useCallback(() => {
    hintOpacity.value = withTiming(0, { duration: 250 }, () => {
      runOnJS(setShowHint)(false);
    });
    usePhotoStore.getState().setSwipeHintShown(true);
  }, [hintOpacity]);

  const hintAnimatedStyle = useAnimatedStyle(() => ({
    opacity: hintOpacity.value,
  }));

  const handleEmptyAction = useCallback(() => {
    const hasDeletions = usePhotoStore.getState().deletionQueue.length > 0;
    if (hasDeletions) {
      router.replace(`/confirmation/${monthId ?? ''}`);
    } else {
      router.replace(`/completed/${monthId ?? ''}`);
    }
  }, [monthId, router]);

  const showDeleteButton = showSwipeButtons;
  const showKeepButton = showSwipeButtons;
  const hasActionButtons = showSwipeButtons;

  if (!month) {
    return (
      <GradientBackground>
        <SafeAreaView style={styles.safeArea}>
          <EmptyState title={t('swipe.monthNotFoundTitle')} subtitle={t('swipe.monthNotFoundSubtitle')} />
        </SafeAreaView>
      </GradientBackground>
    );
  }

  return (
    <GradientBackground>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <Text style={styles.backIcon}>←</Text>
          </Pressable>

          <ProgressIndicator current={progressCurrent} total={total} compact />

          {totalLargeVideosSize > 0 ? (
            <Text style={styles.metricsText}>
              {t('swipe.metricsLargeVideos', { size: formatFileSize(totalLargeVideosSize) })}
            </Text>
          ) : null}

          <View style={styles.cardArea}>
            {items.length === 0 ? (
              <EmptyState title={t('swipe.emptyFilterTitle')} subtitle={t('swipe.emptyFilterSubtitle')} />
            ) : currentItem ? (
              <SwipeCard
                item={currentItem}
                onSwipeLeft={handleSwipeLeft}
                onSwipeRight={handleSwipeRight}
                onSwipeUp={handleSwipeUp}
              />
            ) : (
              <EmptyState title={t('swipe.filterDoneTitle')} subtitle={t('swipe.filterDoneSubtitle')} />
            )}
          </View>

          {currentEntry ? (
            <View style={styles.finishContainer}>
              <ActionButton
                title={t('swipe.actionFinish')}
                onPress={handleEmptyAction}
                variant="secondary"
                style={styles.finishButton}
                compact
              />
            </View>
          ) : null}

          {hasActionButtons ? (
            <View style={styles.actionsRow}>
              {showDeleteButton ? (
                <SwipeActionButton
                  emoji="🗑"
                  label={t('swipe.actionDelete')}
                  arrow="←"
                  onPress={handleSwipeLeft}
                  color="#EF4444"
                  style={styles.actionButton}
                />
              ) : null}
              <SwipeActionButton
                emoji="⭐"
                label="Favorite"
                arrow="↑"
                onPress={handleSwipeUp}
                color="#F59E0B"
                style={styles.actionButton}
              />
              {showKeepButton ? (
                <SwipeActionButton
                  emoji="✓"
                  label={t('swipe.actionKeep')}
                  arrow="→"
                  onPress={handleSwipeRight}
                  color="#22C55E"
                  style={styles.actionButton}
                />
              ) : null}
            </View>
          ) : null}

          {!currentEntry && items.length > 0 ? (
            <View style={styles.footer}>
              <ActionButton title={t('swipe.actionConfirm')} onPress={handleEmptyAction} variant="secondary" />
            </View>
          ) : null}
        </View>

        {/* Hint-оверлей при первом запуске */}
        {showHint ? (
          <Animated.View style={[styles.hintOverlay, hintAnimatedStyle]}>
            {/* Карточка-подсказка */}
            <View style={styles.hintCard}>
              {/* Заголовок */}
              <Text style={styles.hintTitle}>How to swipe</Text>
              <Text style={styles.hintSubtitle}>Sort your photos with simple gestures</Text>

              {/* Три направления */}
              <View style={styles.hintDirections}>
                <View style={styles.hintRow}>
                  <View style={[styles.hintIconBox, styles.hintIconBoxDelete]}>
                    <Text style={styles.hintIconEmoji}>🗑</Text>
                  </View>
                  <View style={styles.hintRowText}>
                    <Text style={styles.hintRowTitle}>Swipe Left</Text>
                    <Text style={styles.hintRowDesc}>Delete photo</Text>
                  </View>
                  <Text style={[styles.hintArrowBig, { color: '#EF4444' }]}>←</Text>
                </View>

                <View style={styles.hintSep} />

                <View style={styles.hintRow}>
                  <View style={[styles.hintIconBox, styles.hintIconBoxFav]}>
                    <Text style={styles.hintIconEmoji}>⭐</Text>
                  </View>
                  <View style={styles.hintRowText}>
                    <Text style={styles.hintRowTitle}>Swipe Up</Text>
                    <Text style={styles.hintRowDesc}>Add to Favorites</Text>
                  </View>
                  <Text style={[styles.hintArrowBig, { color: '#F59E0B' }]}>↑</Text>
                </View>

                <View style={styles.hintSep} />

                <View style={styles.hintRow}>
                  <View style={[styles.hintIconBox, styles.hintIconBoxKeep]}>
                    <Text style={styles.hintIconEmoji}>✓</Text>
                  </View>
                  <View style={styles.hintRowText}>
                    <Text style={styles.hintRowTitle}>Swipe Right</Text>
                    <Text style={styles.hintRowDesc}>Keep photo</Text>
                  </View>
                  <Text style={[styles.hintArrowBig, { color: '#22C55E' }]}>→</Text>
                </View>
              </View>

              {/* Кнопка */}
              <Pressable style={styles.hintDismiss} onPress={dismissHint}>
                <Text style={styles.hintDismissText}>Got it!</Text>
              </Pressable>
            </View>
          </Animated.View>
        ) : null}
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
    container: {
      flex: 1,
      backgroundColor: 'transparent',
      paddingHorizontal: 20,
      paddingTop: 12,
      gap: 12,
    },
    backButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.surfaceElevated,
      borderColor: colors.border,
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: colors.shadowColor,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: colors.isDark ? 0.3 : 0.1,
      shadowRadius: 8,
      elevation: colors.isDark ? 3 : 2,
      alignSelf: 'flex-start',
    },
    backIcon: {
      color: colors.textPrimary,
      fontSize: 24,
      ...typography.bold,
    },
    cardArea: {
      flex: 1,
      justifyContent: 'center',
      marginTop: 8,
    },
    metricsText: {
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderRadius: 10,
      borderWidth: 1,
      color: colors.textSecondary,
      fontSize: 13,
      ...typography.semibold,
      paddingHorizontal: 10,
      paddingVertical: 8,
    },
    actionsRow: {
      flexDirection: 'row',
      gap: 10,
      justifyContent: 'center',
      marginTop: 8,
    },
    actionButton: {
      minWidth: 0,
      maxWidth: 999,
    },
    finishContainer: {
      alignItems: 'center',
      marginTop: 6,
    },
    finishButton: {
      minWidth: 180,
      opacity: 0.85,
      minHeight: 36,
      paddingVertical: 6,
    },
    footer: {
      backgroundColor: colors.surfaceElevated,
      borderColor: colors.border,
      borderRadius: 14,
      borderWidth: 1,
      marginBottom: 8,
      paddingHorizontal: 10,
      paddingTop: 10,
      paddingBottom: 12,
      shadowColor: colors.shadowColor,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: colors.isDark ? 0.28 : 0.08,
      shadowRadius: 10,
      elevation: colors.isDark ? 4 : 2,
    },
    // Hint-оверлей
    hintOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(0, 0, 0, 0.75)',
      zIndex: 100,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 24,
    },
    hintCard: {
      width: '100%',
      backgroundColor: colors.isDark ? '#1C2B3A' : '#FFFFFF',
      borderRadius: 28,
      padding: 28,
      alignItems: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 20 },
      shadowOpacity: 0.4,
      shadowRadius: 40,
      elevation: 20,
      borderWidth: 1,
      borderColor: colors.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
    },
    hintTitle: {
      fontSize: 24,
      color: colors.textPrimary,
      ...typography.bold,
      marginBottom: 6,
    },
    hintSubtitle: {
      fontSize: 14,
      color: colors.textSecondary,
      ...typography.regular,
      marginBottom: 28,
      textAlign: 'center',
    },
    hintDirections: {
      width: '100%',
      backgroundColor: colors.isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
      borderRadius: 18,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: 'hidden',
      marginBottom: 24,
    },
    hintRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 14,
      gap: 14,
    },
    hintSep: {
      height: 1,
      backgroundColor: colors.border,
      marginHorizontal: 16,
      opacity: 0.5,
    },
    hintIconBox: {
      width: 44,
      height: 44,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
    },
    hintIconBoxDelete: {
      backgroundColor: 'rgba(239, 68, 68, 0.15)',
    },
    hintIconBoxFav: {
      backgroundColor: 'rgba(245, 158, 11, 0.15)',
    },
    hintIconBoxKeep: {
      backgroundColor: 'rgba(34, 197, 94, 0.15)',
    },
    hintIconEmoji: {
      fontSize: 22,
    },
    hintRowText: {
      flex: 1,
      gap: 2,
    },
    hintRowTitle: {
      fontSize: 15,
      color: colors.textPrimary,
      ...typography.semibold,
    },
    hintRowDesc: {
      fontSize: 12,
      color: colors.textSecondary,
      ...typography.regular,
    },
    hintArrowBig: {
      fontSize: 22,
      ...typography.bold,
    },
    hintDismiss: {
      width: '100%',
      backgroundColor: colors.accent,
      borderRadius: 16,
      paddingVertical: 16,
      alignItems: 'center',
    },
    hintDismissText: {
      color: '#FFFFFF',
      fontSize: 16,
      ...typography.bold,
    },
  });
