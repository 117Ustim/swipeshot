import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Animated, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ActionButton } from '@/components/ActionButton';
import { EmptyState } from '@/components/EmptyState';
import { GradientBackground } from '@/components/GradientBackground';
import { MonthPickerSheet } from '@/components/MonthPickerSheet';
import { useAppTheme } from '@/components/useAppTheme';
import { typography } from '@/constants/typography';
import { useGallery } from '@/hooks/useGallery';
import { useI18n } from '@/hooks/useI18n';
import { usePhotoStore } from '@/store/photoStore';
import { MonthSession } from '@/types';

type YearGroup = {
  id: string;
  year: string;
  months: MonthSession[];
  totalCount: number;
};

function getYearFromMonthId(monthId: string): string {
  const [year] = monthId.split('-');
  return year || monthId;
}

function groupMonthsByYear(months: MonthSession[]): YearGroup[] {
  const grouped = new Map<string, MonthSession[]>();

  months.forEach((month) => {
    const year = getYearFromMonthId(month.id);
    const existing = grouped.get(year);

    if (existing) {
      existing.push(month);
      return;
    }

    grouped.set(year, [month]);
  });

  return Array.from(grouped.entries()).map(([year, yearMonths]) => ({
    id: year,
    year,
    months: yearMonths,
    totalCount: yearMonths.reduce((sum, month) => sum + month.totalCount, 0),
  }));
}

function buildYearSession(year: YearGroup): MonthSession {
  const items = year.months
    .flatMap((month) => month.items)
    .sort((a, b) => b.creationTime - a.creationTime);

  return {
    id: `year-${year.year}`,
    displayName: year.year,
    items,
    totalCount: items.length,
    coverPhotoUri: items[0]?.uri ?? '',
    currentIndex: 0,
  };
}

export default function MonthsScreen() {
  const colors = useAppTheme();
  const { t } = useI18n();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const router = useRouter();
  const { months, isLoading, error, refetch } = useGallery();
  const [selectedYear, setSelectedYear] = useState<YearGroup | null>(null);
  const [expandedYearId, setExpandedYearId] = useState<string | null>(null);
  const [isOpeningYearCard, setIsOpeningYearCard] = useState(false);
  const reviewMode = usePhotoStore((state) => state.reviewMode);
  const setCurrentMonth = usePhotoStore((state) => state.setCurrentMonth);
  const setActiveSession = usePhotoStore((state) => state.setActiveSession);
  const yearCardOpenAnimation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    refetch();
  }, [refetch]);

  const isPermissionDenied = useMemo(() => error?.message === 'PERMISSION_DENIED', [error]);
  const yearGroups = useMemo(() => groupMonthsByYear(months), [months]);

  const handleMonthPress = useCallback(
    (monthId: string) => {
      setSelectedYear(null);
      setExpandedYearId(null);
      yearCardOpenAnimation.setValue(0);
      setActiveSession(null);
      setCurrentMonth(monthId);
      router.push(`/swipe/${monthId}`);
    },
    [router, setActiveSession, setCurrentMonth, yearCardOpenAnimation]
  );

  const handleRetry = useCallback(async () => {
    await refetch();
  }, [refetch]);

  const handleOpenPermissions = useCallback(() => {
    router.push('/permissions');
  }, [router]);

  const runYearOpenAnimation = useCallback((year: YearGroup) => {
    if (isOpeningYearCard || selectedYear) {
      return;
    }

    setIsOpeningYearCard(true);
    setExpandedYearId(year.id);
    setSelectedYear(year); // Show sheet immediately without delay
    yearCardOpenAnimation.setValue(0);

    Animated.spring(yearCardOpenAnimation, {
      toValue: 1,
      damping: 16,
      stiffness: 190,
      mass: 0.7,
      useNativeDriver: true,
    }).start(({ finished }) => {
      setIsOpeningYearCard(false);

      if (!finished) {
        setExpandedYearId(null);
        setSelectedYear(null);
        yearCardOpenAnimation.setValue(0);
        return;
      }
    });
  }, [isOpeningYearCard, selectedYear, yearCardOpenAnimation]);

  const handleYearPress = useCallback((year: YearGroup) => {
    if (reviewMode === 'yearly') {
      const yearSession = buildYearSession(year);
      setSelectedYear(null);
      setExpandedYearId(null);
      yearCardOpenAnimation.setValue(0);
      setActiveSession(yearSession);
      setCurrentMonth(yearSession.id);
      router.push(`/swipe/${yearSession.id}`);
      return;
    }

    runYearOpenAnimation(year);
  }, [reviewMode, router, runYearOpenAnimation, setActiveSession, setCurrentMonth, yearCardOpenAnimation]);

  const handleCloseMonthPicker = useCallback(() => {
    setSelectedYear(null);
    Animated.spring(yearCardOpenAnimation, {
      toValue: 0,
      damping: 16,
      stiffness: 190,
      mass: 0.7,
      useNativeDriver: true,
    }).start(() => {
      setExpandedYearId(null);
    });
  }, [yearCardOpenAnimation]);

  const renderItem = useCallback(
    ({ item, index }: { item: YearGroup; index: number }) => {
      const stackOrder = yearGroups.length - index;
      const isExpanded = expandedYearId === item.id;
      const animatedTranslateY = isExpanded
        ? yearCardOpenAnimation.interpolate({
          inputRange: [0, 1],
          outputRange: [0, 34],
        })
        : 0;
      const animatedScale = isExpanded
        ? yearCardOpenAnimation.interpolate({
          inputRange: [0, 1],
          outputRange: [1, 1.035],
        })
        : 1;

      return (
        <Animated.View
          style={[
            styles.yearCardWrap,
            index > 0 ? styles.yearCardStacked : null,
            {
              zIndex: isExpanded ? yearGroups.length + 6 : stackOrder,
              transform: [{ translateY: animatedTranslateY }, { scale: animatedScale }],
            },
          ]}
        >
          <Pressable
            onPress={() => handleYearPress(item)}
            disabled={isOpeningYearCard}
            style={styles.yearCard}
          >
            <View style={styles.yearLeft}>
              <Text style={styles.yearTitle}>{item.year}</Text>
            </View>
            <View style={styles.yearRight}>
              <View style={styles.yearCardMeta}>
                <Text style={styles.yearSubtitle}>
                  {t('months.monthsInYear', { count: item.months.length })}
                </Text>
                <Text style={styles.yearSubtitle}>
                  {t('media.photoVideoCount', { count: item.totalCount })}
                </Text>
              </View>
              <Text style={styles.yearAction}>›</Text>
            </View>
          </Pressable>
        </Animated.View>
      );
    },
    [colors.isDark, expandedYearId, handleYearPress, isOpeningYearCard, styles, t, yearCardOpenAnimation, yearGroups.length]
  );

  const keyExtractor = useCallback((item: YearGroup) => item.id, []);

  return (
    <GradientBackground>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
          <Text style={styles.selectYearText}>{t('months.selectYear')}</Text>

          {isLoading ? (
            <View style={styles.centerBlock}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          ) : error ? (
            <View style={styles.centerBlock}>
              <Text style={styles.errorText}>{t('months.errorLoad')}</Text>
              <View style={styles.errorActions}>
                <ActionButton title={t('months.retry')} onPress={handleRetry} />
                {isPermissionDenied ? (
                  <ActionButton title={t('months.grantAccess')} onPress={handleOpenPermissions} variant="secondary" />
                ) : null}
              </View>
            </View>
          ) : months.length === 0 ? (
            <EmptyState title={t('months.emptyTitle')} subtitle={t('months.emptySubtitle')} />
          ) : (
            <FlatList
              data={yearGroups}
              keyExtractor={keyExtractor}
              renderItem={renderItem}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
            />
          )}
        </View>
        <MonthPickerSheet
          visible={reviewMode === 'monthly' && Boolean(selectedYear)}
          title={t('months.monthPickerTitle', { year: selectedYear?.year ?? '' })}
          months={selectedYear?.months ?? []}
          onSelectMonth={handleMonthPress}
          onClose={handleCloseMonthPicker}
        />
      </SafeAreaView>
    </GradientBackground>
  );
}

const createStyles = (colors: ReturnType<typeof useAppTheme>) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: 'transparent', // Прозрачный чтобы видеть градиент
    },
    container: {
      flex: 1,
      backgroundColor: 'transparent', // Прозрачный чтобы видеть градиент
      paddingHorizontal: 20,
      paddingTop: 2,
    },
    selectYearText: {
      color: colors.textSecondary,
      fontSize: 18,
      ...typography.semibold,
      textAlign: 'center',
      marginBottom: 10,
    },
    listContent: {
      paddingBottom: 36,
      paddingTop: 2,
    },
    yearCardWrap: {
      position: 'relative',
      paddingHorizontal: 6,
      paddingBottom: 12,
    },
    yearCard: {
      alignItems: 'center',
      backgroundColor: colors.surfaceElevated,
      borderColor: colors.border,
      borderRadius: 16,
      borderWidth: 1,
      flexDirection: 'row',
      minHeight: 84,
      width: '100%',
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderBottomColor: '#7EA4C2',
      borderBottomWidth: 1.5,
      shadowColor: colors.shadowColor,
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: colors.isDark ? 0.3 : 0.22,
      shadowRadius: 10,
      elevation: colors.isDark ? 7 : 5,
    },
    yearCardStacked: {
      marginTop: -30,
    },
    yearCardMeta: {
      flex: 1,
      gap: 2,
    },
    yearLeft: {
      alignItems: 'flex-start',
      justifyContent: 'flex-end',
      minWidth: 96,
      paddingRight: 12,
    },
    yearRight: {
      alignItems: 'center',
      borderLeftColor: colors.border,
      borderLeftWidth: 1,
      flex: 1,
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingLeft: 12,
    },
    yearTitle: {
      color: colors.isDark ? 'rgba(255, 255, 255, 0.75)' : 'rgba(26, 59, 93, 0.6)',
      fontSize: 26,
      lineHeight: 30,
      ...typography.bold,
      textShadowColor: colors.isDark ? 'rgba(120, 186, 255, 0.35)' : 'rgba(58, 134, 255, 0.25)',
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 4,
    },
    yearSubtitle: {
      color: colors.textSecondary,
      fontSize: 12,
      ...typography.regular,
    },
    yearAction: {
      color: colors.textSecondary,
      fontSize: 20,
      ...typography.bold,
      marginLeft: 10,
    },
    centerBlock: {
      flex: 1,
      alignItems: 'center',
      backgroundColor: colors.surfaceElevated,
      borderColor: colors.border,
      borderRadius: 16,
      borderWidth: 1,
      justifyContent: 'center',
      marginBottom: 16,
      paddingHorizontal: 14,
      paddingBottom: 24,
      shadowColor: colors.shadowColor,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: colors.isDark ? 0.35 : 0.1,
      shadowRadius: 12,
      elevation: colors.isDark ? 5 : 3,
    },
    errorText: {
      color: colors.textPrimary,
      fontSize: 16,
      ...typography.semibold,
      marginBottom: 16,
      textAlign: 'center',
    },
    errorActions: {
      width: '100%',
      gap: 12,
    },
  });
