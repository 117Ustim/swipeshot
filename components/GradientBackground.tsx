import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, ViewStyle } from 'react-native';

import { useAppTheme } from './useAppTheme';

type GradientBackgroundProps = {
  style?: ViewStyle;
  children?: React.ReactNode;
};

export function GradientBackground({ style, children }: GradientBackgroundProps) {
  const colors = useAppTheme();

  // Для светлой темы - голубой градиент как на скрине
  // Для темной темы - темный градиент
  const gradientColors = colors.isDark
    ? colors.backgroundGradient
    : colors.backgroundGradient;

  return (
    <LinearGradient
      colors={gradientColors}
      style={[styles.gradient, style]}
      start={{ x: 0.5, y: 0 }}
      end={{ x: 0.5, y: 1 }}
    >
      {children}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
});
