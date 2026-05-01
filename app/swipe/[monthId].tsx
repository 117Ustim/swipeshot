import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
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
                <ActionButton
                  title={t('swipe.actionDelete')}
                  onPress={handleSwipeLeft}
                  style={styles.actionButton}
                  compact
                  singleLine
                />
              ) : null}
              {showKeepButton ? (
                <ActionButton
                  title={t('swipe.actionKeep')}
                  onPress={handleSwipeRight}
                  variant="secondary"
                  style={styles.actionButton}
                  compact
                  singleLine
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
      gap: 12,
      justifyContent: 'center',
      marginTop: 20,
    },
    actionButton: {
      minWidth: 140,
      maxWidth: 160,
    },
    finishContainer: {
      alignItems: 'center',
      marginTop: 10,
    },
    finishButton: {
      minWidth: 180,
      opacity: 0.85,
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
  });
