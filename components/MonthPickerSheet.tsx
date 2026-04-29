import React, { useEffect, useMemo, useState } from 'react';
import {
    FlatList,
    Pressable,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withSpring,
    withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAppTheme } from '@/components/useAppTheme';
import { typography } from '@/constants/typography';
import { useI18n } from '@/hooks/useI18n';
import { MonthSession } from '@/types';

type MonthPickerSheetProps = {
  visible: boolean;
  title: string;
  months: MonthSession[];
  onSelectMonth: (monthId: string) => void;
  onClose: () => void;
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export const MonthPickerSheet = React.memo(function MonthPickerSheet({
  visible,
  title,
  months,
  onSelectMonth,
  onClose,
}: MonthPickerSheetProps) {
  const colors = useAppTheme();
  const { t, formatMonthName } = useI18n();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(colors, insets.bottom), [colors, insets.bottom]);

  const [cachedTitle, setCachedTitle] = useState(title);
  const [cachedMonths, setCachedMonths] = useState(months);

  useEffect(() => {
    if (visible) {
      setCachedTitle(title);
      setCachedMonths(months);
    }
  }, [visible, title, months]);

  const translateY = useSharedValue(1000);
  const backdropOpacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      backdropOpacity.value = withTiming(1, { duration: 200 });
      translateY.value = withSpring(0, {
        damping: 20,
        stiffness: 300,
      });
    } else {
      backdropOpacity.value = withTiming(0, { duration: 200 });
      translateY.value = withTiming(1000, { duration: 200 });
    }
  }, [visible, backdropOpacity, translateY]);

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const renderItem = React.useCallback(
    ({ item }: { item: MonthSession }) => (
      <Pressable
        style={styles.monthRow}
        onPress={() => onSelectMonth(item.id)}
      >
        <View style={styles.monthMeta}>
          <Text style={styles.monthLabel}>{formatMonthName(item.id)}</Text>
          <Text style={styles.monthCount}>
            {t('media.photoVideoCount', { count: item.totalCount })}
          </Text>
        </View>
        <Text style={styles.rowAction}>›</Text>
      </Pressable>
    ),
    [formatMonthName, onSelectMonth, styles, t]
  );

  const keyExtractor = React.useCallback((item: MonthSession) => item.id, []);

  return (
    <View style={styles.overlayRoot} pointerEvents={visible ? "box-none" : "none"}>
      <AnimatedPressable
        onPress={onClose}
        style={[styles.backdrop, backdropStyle]}
      />
      <Animated.View style={[styles.sheet, sheetStyle]}>
        <View style={styles.handle} />
        <Text style={styles.title}>{cachedTitle}</Text>

        <FlatList
          data={cachedMonths}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          initialNumToRender={8}
          maxToRenderPerBatch={8}
          windowSize={5}
          removeClippedSubviews
        />

        <Pressable style={styles.cancelButton} onPress={onClose}>
          <Text style={styles.cancelText}>{t('common.cancel')}</Text>
        </Pressable>
      </Animated.View>
    </View>
  );
});

const createStyles = (
  colors: ReturnType<typeof useAppTheme>,
  bottomInset: number
) =>
  StyleSheet.create({
    overlayRoot: {
      ...StyleSheet.absoluteFillObject,
      justifyContent: 'flex-end',
    },
    backdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: colors.isDark ? 'rgba(0, 0, 0, 0.58)' : 'rgba(15, 23, 42, 0.26)',
    },
    sheet: {
      backgroundColor: colors.surfaceElevated,
      borderTopColor: colors.border,
      borderTopLeftRadius: 22,
      borderTopRightRadius: 22,
      borderTopWidth: 1,
      maxHeight: '72%',
      paddingHorizontal: 16,
      paddingTop: 10,
      paddingBottom: Math.max(12, bottomInset),
      shadowColor: colors.shadowColor,
      shadowOffset: { width: 0, height: -8 },
      shadowOpacity: colors.isDark ? 0.5 : 0.18,
      shadowRadius: 14,
      elevation: 18,
    },
    handle: {
      alignSelf: 'center',
      backgroundColor: colors.surfaceMuted,
      borderRadius: 999,
      height: 4,
      marginBottom: 10,
      width: 48,
    },
    title: {
      color: colors.textPrimary,
      fontSize: 18,
      ...typography.bold,
      marginBottom: 10,
    },
    listContent: {
      gap: 8,
      paddingBottom: 10,
    },
    monthRow: {
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderRadius: 12,
      borderWidth: 1,
      flexDirection: 'row',
      justifyContent: 'space-between',
      minHeight: 56,
      paddingHorizontal: 12,
      paddingVertical: 10,
    },
    monthMeta: {
      flex: 1,
      gap: 2,
    },
    monthLabel: {
      color: colors.textPrimary,
      fontSize: 15,
      ...typography.semibold,
    },
    monthCount: {
      color: colors.textSecondary,
      fontSize: 12,
      ...typography.regular,
    },
    rowAction: {
      color: colors.textSecondary,
      fontSize: 18,
      ...typography.bold,
      marginLeft: 10,
    },
    cancelButton: {
      alignItems: 'center',
      backgroundColor: colors.secondary,
      borderColor: colors.border,
      borderRadius: 12,
      borderWidth: 1,
      justifyContent: 'center',
      minHeight: 44,
      marginTop: 6,
    },
    cancelText: {
      color: colors.textPrimary,
      fontSize: 15,
      ...typography.semibold,
    },
  });
