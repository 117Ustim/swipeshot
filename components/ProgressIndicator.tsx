import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useAppTheme } from '@/components/useAppTheme';
import { typography } from '@/constants/typography';

type ProgressIndicatorProps = {
  current: number;
  total: number;
  compact?: boolean;
};

export const ProgressIndicator = React.memo(function ProgressIndicator({
  current,
  total,
  compact = false,
}: ProgressIndicatorProps) {
  const colors = useAppTheme();
  const styles = useMemo(() => createStyles(colors, compact), [colors, compact]);

  const safeTotal = total > 0 ? total : 1;
  const progress = Math.min(Math.max(current / safeTotal, 0), 1);

  const fillStyle = useMemo(
    () => ({
      width: `${progress * 100}%` as `${number}%`,
    }),
    [progress]
  );

  return (
    <View style={styles.container}>
      <View style={styles.bar}>
        <View style={[styles.fill, fillStyle]} />
      </View>
      <Text style={styles.label}>{current} / {total}</Text>
    </View>
  );
});

const createStyles = (
  colors: ReturnType<typeof useAppTheme>,
  compact: boolean
) =>
  StyleSheet.create({
    container: {
      gap: compact ? 2 : 6,
    },
    bar: {
      backgroundColor: colors.progressTrack,
      borderColor: colors.border,
      borderWidth: 1,
      borderRadius: 999,
      height: compact ? 4 : 6,
      overflow: 'hidden',
    },
    fill: {
      backgroundColor: colors.progressFill,
      height: '100%',
    },
    label: {
      color: colors.textSecondary,
      fontSize: compact ? 10 : 12,
      ...typography.semibold,
    },
  });
