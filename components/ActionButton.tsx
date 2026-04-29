import React, { useMemo } from 'react';
import { StyleSheet, Text, TouchableOpacity, ViewStyle } from 'react-native';

import { useAppTheme } from '@/components/useAppTheme';
import { typography } from '@/constants/typography';

type ActionButtonProps = {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary';
  style?: ViewStyle;
  compact?: boolean;
  singleLine?: boolean;
};

export const ActionButton = React.memo(function ActionButton({
  title,
  onPress,
  variant = 'primary',
  style,
  compact = false,
  singleLine = false,
}: ActionButtonProps) {
  const colors = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const buttonStyle = [
    styles.base,
    compact ? styles.baseCompact : null,
    variant === 'primary' ? styles.primary : styles.secondary,
    style,
  ];
  const textStyle = [
    variant === 'primary' ? styles.primaryText : styles.secondaryText,
    compact ? styles.compactText : null,
  ];

  return (
    <TouchableOpacity activeOpacity={0.8} onPress={onPress} style={buttonStyle}>
      <Text
        style={textStyle}
        numberOfLines={singleLine ? 1 : undefined}
        adjustsFontSizeToFit={singleLine}
        minimumFontScale={0.86}
      >
        {title}
      </Text>
    </TouchableOpacity>
  );
});

const createStyles = (colors: ReturnType<typeof useAppTheme>) =>
  StyleSheet.create({
    base: {
      alignItems: 'center',
      borderRadius: 12,
      justifyContent: 'center',
      paddingHorizontal: 16,
      paddingVertical: 12,
      shadowColor: colors.shadowColor,
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: colors.isDark ? 0.34 : 0.12,
      shadowRadius: 10,
      elevation: colors.isDark ? 6 : 3,
    },
    baseCompact: {
      minHeight: 56,
      paddingHorizontal: 10,
      paddingVertical: 8,
    },
    primary: {
      backgroundColor: colors.primary,
    },
    secondary: {
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderWidth: 1,
    },
    primaryText: {
      color: colors.textOnPrimary,
      fontSize: 16,
      ...typography.semibold,
    },
    secondaryText: {
      color: colors.textPrimary,
      fontSize: 16,
      ...typography.semibold,
    },
    compactText: {
      fontSize: 14,
      ...typography.semibold,
    },
  });
