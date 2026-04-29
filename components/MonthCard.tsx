import React, { useMemo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { useAppTheme } from '@/components/useAppTheme';
import { typography } from '@/constants/typography';
import { useI18n } from '@/hooks/useI18n';
import { MonthSession } from '@/types';

type MonthCardProps = {
  month: MonthSession;
  onPress: (monthId: string) => void;
};

export const MonthCard = React.memo(function MonthCard({ month, onPress }: MonthCardProps) {
  const colors = useAppTheme();
  const { t, formatMonthLabel } = useI18n();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const handlePress = React.useCallback(() => {
    onPress(month.id);
  }, [month.id, onPress]);

  return (
    <TouchableOpacity activeOpacity={0.8} onPress={handlePress} style={styles.card}>
      <View style={styles.content}>
        <Text style={styles.title}>{formatMonthLabel(month.id)}</Text>
        <Text style={styles.subtitle}>{t('media.photoVideoCount', { count: month.totalCount })}</Text>
      </View>
    </TouchableOpacity>
  );
});

const createStyles = (colors: ReturnType<typeof useAppTheme>) =>
  StyleSheet.create({
    card: {
      backgroundColor: colors.surfaceElevated,
      borderColor: colors.border,
      borderRadius: 16,
      borderWidth: 1,
      marginBottom: 12,
      paddingHorizontal: 16,
      paddingVertical: 14,
      shadowColor: colors.shadowColor,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: colors.isDark ? 0.38 : 0.1,
      shadowRadius: 14,
      elevation: colors.isDark ? 6 : 3,
    },
    content: {
      gap: 4,
    },
    title: {
      color: colors.textPrimary,
      fontSize: 16,
      ...typography.bold,
    },
    subtitle: {
      color: colors.textSecondary,
      fontSize: 13,
      ...typography.regular,
    },
  });
