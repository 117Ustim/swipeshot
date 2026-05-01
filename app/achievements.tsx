import { Stack, router } from 'expo-router';
import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAppTheme } from '@/components/useAppTheme';
import { GradientBackground } from '@/components/GradientBackground';
import { typography } from '@/constants/typography';
import { useI18n } from '@/hooks/useI18n';
import { usePhotoStore } from '@/store/photoStore';
import { formatFileSize } from '@/utils/formatFileSize';
import { getXpForNextLevel, getXpForCurrentLevel } from '@/utils/levels';
import { ACHIEVEMENT_DEFINITIONS } from '@/utils/achievements';
import { AchievementId } from '@/types';

export default function AchievementsScreen() {
  const colors = useAppTheme();
  const { t } = useI18n();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const stats = usePhotoStore((state) => state.gamification.stats);
  const achievements = usePhotoStore((state) => state.gamification.achievements);

  const currentXp = stats.xp ?? 0;
  const level = stats.level ?? 1;
  const nextLevelXp = getXpForNextLevel(level);
  const prevLevelXp = getXpForCurrentLevel(level);
  
  const xpInCurrentLevel = currentXp - prevLevelXp;
  const xpNeededForLevel = nextLevelXp - prevLevelXp;
  const progressPercent = Math.min(100, Math.max(0, (xpInCurrentLevel / xpNeededForLevel) * 100));

  const totalAchievements = Object.keys(ACHIEVEMENT_DEFINITIONS).length;
  const unlockedAchievementsCount = Object.values(achievements).filter(a => a.unlockedAt).length;

  return (
    <GradientBackground>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <Text style={styles.backIcon}>←</Text>
          </Pressable>
          <Text style={styles.headerTitle}>{t('achievements.title') || 'Достижения'}</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
          {/* Profile Card */}
          <View style={styles.profileCard}>
            <View style={styles.levelHeader}>
              <View style={styles.levelBadge}>
                <Text style={styles.levelBadgeText}>{level}</Text>
              </View>
              <View style={styles.levelInfo}>
                <Text style={styles.levelTitle}>{t('achievements.level') || 'Уровень'} {level}</Text>
                <Text style={styles.xpText}>{currentXp} / {nextLevelXp} XP</Text>
              </View>
            </View>
            
            <View style={styles.progressContainer}>
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${progressPercent}%` }]} />
              </View>
            </View>

            <View style={styles.statsRow}>
              <View style={styles.statBox}>
                <Text style={styles.statValue}>{stats.totalDeleted}</Text>
                <Text style={styles.statLabel}>{t('achievements.deleted') || 'Удалено'}</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statValue}>{formatFileSize(stats.totalFreedBytes)}</Text>
                <Text style={styles.statLabel}>{t('achievements.freed') || 'Освобождено'}</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statValue}>{unlockedAchievementsCount}/{totalAchievements}</Text>
                <Text style={styles.statLabel}>{t('achievements.medals') || 'Медали'}</Text>
              </View>
            </View>
          </View>

          {/* Achievements Grid */}
          <Text style={styles.sectionTitle}>{t('achievements.collection') || 'Коллекция медалей'}</Text>
          
          <View style={styles.grid}>
            {(Object.keys(ACHIEVEMENT_DEFINITIONS) as AchievementId[]).map((id) => {
              const def = ACHIEVEMENT_DEFINITIONS[id];
              const isUnlocked = !!achievements[id]?.unlockedAt;
              
              return (
                <View key={id} style={[styles.achievementItem, !isUnlocked && styles.achievementLocked]}>
                  <View style={[styles.iconContainer, !isUnlocked && styles.iconContainerLocked]}>
                    <Text style={[styles.icon, !isUnlocked && styles.iconLocked]}>{def.icon}</Text>
                  </View>
                  <Text style={[styles.achievementTitle, !isUnlocked && styles.achievementTitleLocked]} numberOfLines={2}>
                    {t(`achievement.${id}.title` as never) || id}
                  </Text>
                </View>
              );
            })}
          </View>
        </ScrollView>
      </SafeAreaView>
    </GradientBackground>
  );
}

const createStyles = (colors: ReturnType<typeof useAppTheme>) => StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surfaceElevated,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  backIcon: {
    fontSize: 24,
    color: colors.textPrimary,
    lineHeight: 28,
  },
  headerTitle: {
    fontSize: 20,
    color: colors.textPrimary,
    ...typography.bold,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  profileCard: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: 24,
    padding: 24,
    marginBottom: 32,
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: colors.isDark ? 0.3 : 0.1,
    shadowRadius: 16,
    elevation: 5,
  },
  levelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  levelBadge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  levelBadgeText: {
    fontSize: 24,
    color: '#FFF',
    ...typography.bold,
  },
  levelInfo: {
    flex: 1,
  },
  levelTitle: {
    fontSize: 20,
    color: colors.textPrimary,
    ...typography.bold,
    marginBottom: 4,
  },
  xpText: {
    fontSize: 14,
    color: colors.textSecondary,
    ...typography.medium,
  },
  progressContainer: {
    marginBottom: 24,
  },
  progressTrack: {
    height: 12,
    backgroundColor: colors.surfaceMuted,
    borderRadius: 6,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.accent,
    borderRadius: 6,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    color: colors.textPrimary,
    ...typography.bold,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    ...typography.regular,
  },
  sectionTitle: {
    fontSize: 22,
    color: colors.textPrimary,
    ...typography.bold,
    marginBottom: 20,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    justifyContent: 'space-between',
  },
  achievementItem: {
    width: '30%',
    alignItems: 'center',
    marginBottom: 8,
  },
  achievementLocked: {
    opacity: 0.5,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.surfaceElevated,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: colors.isDark ? 0.2 : 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  iconContainerLocked: {
    backgroundColor: colors.surfaceMuted,
    shadowOpacity: 0,
    elevation: 0,
  },
  icon: {
    fontSize: 32,
  },
  iconLocked: {
    opacity: 0.3,
  },
  achievementTitle: {
    fontSize: 12,
    color: colors.textPrimary,
    ...typography.medium,
    textAlign: 'center',
  },
  achievementTitleLocked: {
    color: colors.textSecondary,
  },
});
