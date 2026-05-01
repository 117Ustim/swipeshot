import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';

import { useAppTheme } from '@/components/useAppTheme';
import { typography } from '@/constants/typography';
import { useI18n } from '@/hooks/useI18n';
import { AchievementId } from '@/types';

interface AchievementToastProps {
  achievementId: AchievementId | null;
  onHide: () => void;
}

export function AchievementToast({ achievementId, onHide }: AchievementToastProps) {
  const colors = useAppTheme();
  const { t } = useI18n();
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-20)).current;

  useEffect(() => {
    if (!achievementId) return;

    // Сбрасываем позицию
    opacity.setValue(0);
    translateY.setValue(-20);

    // Появляемся
    Animated.parallel([
      Animated.spring(opacity, { toValue: 1, useNativeDriver: true, damping: 15 }),
      Animated.spring(translateY, { toValue: 0, useNativeDriver: true, damping: 15 }),
    ]).start();

    // Через 2.5 сек исчезаем
    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(opacity, { toValue: 0, duration: 300, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: -20, duration: 300, useNativeDriver: true }),
      ]).start(() => onHide());
    }, 2500);

    return () => clearTimeout(timer);
  }, [achievementId]);

  if (!achievementId) return null;

  const icon = t(`achievement.${achievementId}.icon` as never) || '🏆';
  const title = t(`achievement.${achievementId}.title` as never) || achievementId;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          backgroundColor: colors.isDark ? 'rgba(30, 60, 90, 0.95)' : 'rgba(255,255,255,0.95)',
          borderColor: colors.accent,
          opacity,
          transform: [{ translateY }],
        },
      ]}
      pointerEvents="none"
    >
      <Text style={styles.icon}>{icon}</Text>
      <View style={styles.textWrap}>
        <Text style={[styles.label, { color: colors.textSecondary }]}>
          {t('achievement.unlocked')}
        </Text>
        <Text style={[styles.title, { color: colors.textPrimary }]}>{title}</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 60,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1.5,
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 999,
  },
  icon: {
    fontSize: 24,
  },
  textWrap: {
    gap: 1,
  },
  label: {
    fontSize: 11,
    ...typography.regular,
  },
  title: {
    fontSize: 14,
    ...typography.semibold,
  },
});
