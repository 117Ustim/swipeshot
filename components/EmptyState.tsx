import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useAppTheme } from '@/components/useAppTheme';
import { typography } from '@/constants/typography';

type EmptyStateProps = {
  title: string;
  subtitle?: string;
};

export const EmptyState = React.memo(function EmptyState({ title, subtitle }: EmptyStateProps) {
  const colors = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
});

const createStyles = (colors: ReturnType<typeof useAppTheme>) =>
  StyleSheet.create({
    container: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 24,
      paddingVertical: 32,
    },
    title: {
      color: colors.textPrimary,
      fontSize: 18,
      ...typography.bold,
      marginBottom: 8,
      textAlign: 'center',
    },
    subtitle: {
      color: colors.textSecondary,
      fontSize: 14,
      ...typography.regular,
      textAlign: 'center',
    },
  });
