import { Feather } from '@expo/vector-icons';
import * as MediaLibrary from 'expo-media-library';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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
import { logAppError } from '@/utils/errorLogger';
import { calcDuplicatesSavings, DuplicateGroup, findDuplicatesAsync, ScanProgress } from '@/utils/findDuplicates';
import { formatFileSize } from '@/utils/formatFileSize';
import { TranslationKey, TranslationParams } from '@/utils/i18n';
import { getCachedOptimizedPreviewUri, resolveOptimizedPreviewUri } from '@/utils/optimizedPreview';
import { isUnsupportedMediaUri } from '@/utils/resolveMediaUri';

// Миниатюра с резолвингом ph:// URI
const DuplicateThumb = ({ item, badgeStyle, badgeText, thumbStyle, badgeTextStyle }: {
  item: MediaItem;
  badgeStyle: object;
  badgeText: string;
  thumbStyle: object;
  badgeTextStyle: object;
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
    <View style={thumbStyle}>
      {displayUri ? (
        <Image source={{ uri: displayUri }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
      ) : (
        <View style={{ width: '100%', height: '100%', backgroundColor: '#333' }} />
      )}
      <View style={badgeStyle}>
        <Text style={badgeTextStyle}>{badgeText}</Text>
      </View>
    </View>
  );
};

function getScanStageLabel(
  t: (key: TranslationKey, params?: TranslationParams) => string,
  progress: ScanProgress | null,
): string {
  if (!progress) return '';
  switch (progress.stage) {
    case 'filenames':
      return t('duplicates.scanStage1');
    case 'metadata':
      return t('duplicates.scanStage2');
    case 'filesize':
      return t('duplicates.scanStage3', {
        current: progress.current,
        total: progress.total,
      });
    default:
      return '';
  }
}

export default function DuplicatesScreen() {
  const colors = useAppTheme();
  const { t } = useI18n();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const router = useRouter();

  const months = usePhotoStore((state) => state.months);
  const [groups, setGroups] = useState<DuplicateGroup[]>([]);
  const [isScanning, setIsScanning] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [scanProgress, setScanProgress] = useState<ScanProgress | null>(null);
  const cancelledRef = useRef(false);

  // Собираем все медиафайлы из всех месяцев
  const allItems = useMemo(
    () => months.flatMap((month) => month.items),
    [months]
  );

  // Сканируем дубликаты при загрузке (3-этапный алгоритм)
  useEffect(() => {
    cancelledRef.current = false;
    setIsScanning(true);
    setScanProgress(null);

    const run = async () => {
      try {
        const found = await findDuplicatesAsync(allItems, (progress) => {
          if (!cancelledRef.current) {
            setScanProgress(progress);
          }
        });

        if (!cancelledRef.current) {
          setGroups(found);
        }
      } catch (error) {
        void logAppError('duplicates.scan', error);
      } finally {
        if (!cancelledRef.current) {
          setIsScanning(false);
        }
      }
    };

    void run();

    return () => {
      cancelledRef.current = true;
    };
  }, [allItems]);

  const savings = useMemo(() => calcDuplicatesSavings(groups), [groups]);

  // Общее количество файлов к удалению (все кроме первого в каждой группе)
  const totalToDelete = useMemo(
    () => groups.reduce((sum, g) => sum + g.items.length - 1, 0),
    [groups]
  );

  const handleDeleteAll = useCallback(() => {
    if (totalToDelete === 0) return;

    Alert.alert(
      t('duplicates.alertDeleteTitle'),
      t('duplicates.alertDeleteMessage', { count: totalToDelete }),
      [
        { text: t('duplicates.alertDeleteCancel'), style: 'cancel' },
        {
          text: t('duplicates.alertDeleteConfirm'),
          style: 'destructive',
          onPress: async () => {
            setIsDeleting(true);
            try {
              // Собираем ID всех копий (все кроме первого в каждой группе)
              const idsToDelete = groups.flatMap((g) =>
                g.items.slice(1).map((item) => item.id)
              );
              await MediaLibrary.deleteAssetsAsync(idsToDelete);
              Alert.alert(
                t('duplicates.title'),
                t('duplicates.successMessage', {
                  count: idsToDelete.length,
                  size: formatFileSize(savings),
                })
              );
              router.back();
            } catch (error) {
              void logAppError('duplicates.deleteAll', error);
            } finally {
              setIsDeleting(false);
            }
          },
        },
      ]
    );
  }, [groups, router, savings, t, totalToDelete]);

  const renderGroup = useCallback(
    ({ item: group }: { item: DuplicateGroup }) => (
      <View style={styles.groupContainer}>
        <View style={styles.groupHeader}>
          <Text style={styles.groupFilename} numberOfLines={1}>
            {group.items[0]?.filename ?? ''}
          </Text>
          <Text style={styles.groupSize}>
            {formatFileSize(group.items[0]?.fileSize ?? 0)} ×{group.items.length}
          </Text>
        </View>
        <View style={styles.groupItems}>
          {group.items.map((item, index) => (
            <DuplicateThumb
              key={item.id}
              item={item}
              thumbStyle={styles.itemWrap}
              badgeStyle={[styles.badge, index === 0 ? styles.badgeOriginal : styles.badgeCopy]}
              badgeText={index === 0 ? t('duplicates.original') : t('duplicates.copy')}
              badgeTextStyle={styles.badgeText}
            />
          ))}
        </View>
      </View>
    ),
    [styles, t]
  );

  const keyExtractor = useCallback((item: DuplicateGroup) => item.key, []);

  const progressLabel = getScanStageLabel(t, scanProgress);

  return (
    <GradientBackground>
      <SafeAreaView style={styles.safeArea}>
        {/* Шапка */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backButton} hitSlop={8}>
            <Feather name="arrow-left" size={22} color={colors.textPrimary} />
          </Pressable>
          <Text style={styles.title}>{t('duplicates.title')}</Text>
          <View style={styles.backButton} />
        </View>

        {isScanning ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={colors.accent} />
            <Text style={styles.scanningText}>{t('duplicates.scanning')}</Text>
            {progressLabel ? (
              <Text style={styles.progressText}>{progressLabel}</Text>
            ) : null}
          </View>
        ) : groups.length === 0 ? (
          <EmptyState
            title={t('duplicates.emptyTitle')}
            subtitle={t('duplicates.emptySubtitle')}
          />
        ) : (
          <>
            {/* Сводка */}
            <View style={styles.summary}>
              <Text style={styles.summaryText}>
                {t('duplicates.groupCount', { count: groups.length })}
              </Text>
              <Text style={styles.summaryText}>
                {t('duplicates.savings', { size: formatFileSize(savings) })}
              </Text>
            </View>

            <FlatList
              data={groups}
              keyExtractor={keyExtractor}
              renderItem={renderGroup}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
            />

            {/* Кнопка удалить все */}
            <View style={styles.footer}>
              <Pressable
                style={[styles.deleteButton, isDeleting && styles.deleteButtonDisabled]}
                onPress={handleDeleteAll}
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.deleteButtonText}>{t('duplicates.deleteAll')}</Text>
                )}
              </Pressable>
            </View>
          </>
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
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    backButton: {
      width: 36,
      height: 36,
      alignItems: 'center',
      justifyContent: 'center',
    },
    title: {
      color: colors.textPrimary,
      fontSize: 18,
      ...typography.semibold,
    },
    center: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 12,
    },
    scanningText: {
      color: colors.textSecondary,
      fontSize: 14,
      ...typography.regular,
    },
    progressText: {
      color: colors.textSecondary,
      fontSize: 12,
      ...typography.regular,
      opacity: 0.7,
    },
    summary: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      backgroundColor: colors.surfaceElevated,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      marginHorizontal: 16,
      marginBottom: 12,
      paddingHorizontal: 16,
      paddingVertical: 10,
    },
    summaryText: {
      color: colors.textSecondary,
      fontSize: 13,
      ...typography.regular,
    },
    listContent: {
      paddingHorizontal: 16,
      paddingBottom: 100,
    },
    groupContainer: {
      backgroundColor: colors.surfaceElevated,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: 12,
      padding: 12,
    },
    groupHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8,
    },
    groupFilename: {
      color: colors.textPrimary,
      fontSize: 12,
      ...typography.semibold,
      flex: 1,
      marginRight: 8,
    },
    groupSize: {
      color: colors.textSecondary,
      fontSize: 12,
      ...typography.regular,
    },
    groupCount: {
      color: colors.accent,
      fontSize: 12,
      ...typography.semibold,
    },
    groupItems: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 6,
    },
    itemWrap: {
      width: 90,
      height: 90,
      borderRadius: 8,
      overflow: 'hidden',
    },
    thumbnail: {
      width: '100%',
      height: '100%',
    },
    badge: {
      position: 'absolute',
      bottom: 4,
      left: 4,
      right: 4,
      borderRadius: 4,
      paddingVertical: 2,
      alignItems: 'center',
    },
    badgeOriginal: {
      backgroundColor: 'rgba(52, 199, 89, 0.85)',
    },
    badgeCopy: {
      backgroundColor: 'rgba(255, 59, 48, 0.85)',
    },
    badgeText: {
      color: '#fff',
      fontSize: 10,
      ...typography.semibold,
    },
    footer: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      padding: 16,
      paddingBottom: 32,
    },
    deleteButton: {
      backgroundColor: colors.accent,
      borderRadius: 14,
      paddingVertical: 14,
      alignItems: 'center',
    },
    deleteButtonDisabled: {
      opacity: 0.6,
    },
    deleteButtonText: {
      color: '#fff',
      fontSize: 16,
      ...typography.semibold,
    },
  });
