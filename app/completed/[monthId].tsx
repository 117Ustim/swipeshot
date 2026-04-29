import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ActionButton } from '@/components/ActionButton';
import { GradientBackground } from '@/components/GradientBackground';
import { useAppTheme } from '@/components/useAppTheme';
import { typography } from '@/constants/typography';
import { useI18n } from '@/hooks/useI18n';
import { usePhotoStore } from '@/store/photoStore';

export default function CompletedScreen() {
  const colors = useAppTheme();
  const { t } = useI18n();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const { monthId } = useLocalSearchParams<{ monthId?: string }>();
  const router = useRouter();

  const handleBack = () => {
    // Navigate back to the home/months screen
    router.replace('/(tabs)');
  };

  const handleReview = () => {
    // Reset progress in the store for this month
    if (monthId) {
      usePhotoStore.getState().setCurrentIndex(0);
      router.replace(`/swipe/${monthId}`);
    }
  };

  return (
    <GradientBackground>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
          <View style={styles.content}>
            <View style={styles.iconContainer}>
              <Text style={styles.icon}>🎉</Text>
            </View>
            <Text style={styles.title}>{t('completed.title')}</Text>
            <Text style={styles.subtitle}>{t('completed.subtitle')}</Text>
          </View>
          
          <View style={styles.footer}>
            <ActionButton 
              title={t('completed.actionBack')} 
              onPress={handleBack} 
            />
            <ActionButton 
              title={t('completed.actionReview')} 
              onPress={handleReview} 
              variant="secondary" 
              style={{ marginTop: 12 }}
            />
          </View>
        </View>
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
    container: {
      flex: 1,
      paddingHorizontal: 20,
      paddingBottom: 24,
    },
    content: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    iconContainer: {
      width: 100,
      height: 100,
      borderRadius: 50,
      backgroundColor: colors.surfaceElevated,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 24,
      shadowColor: colors.shadowColor,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: colors.isDark ? 0.3 : 0.15,
      shadowRadius: 12,
      elevation: 5,
      borderWidth: 1,
      borderColor: colors.border,
    },
    icon: {
      fontSize: 48,
    },
    title: {
      fontSize: 24,
      ...typography.bold,
      color: colors.textPrimary,
      marginBottom: 12,
      textAlign: 'center',
    },
    subtitle: {
      fontSize: 16,
      ...typography.regular,
      color: colors.textSecondary,
      textAlign: 'center',
      lineHeight: 24,
      paddingHorizontal: 20,
    },
    footer: {
      width: '100%',
    },
  });
