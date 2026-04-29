import { useRouter } from 'expo-router';
import { useCallback, useMemo } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ActionButton } from '@/components/ActionButton';
import { GradientBackground } from '@/components/GradientBackground';
import { useAppTheme } from '@/components/useAppTheme';
import { typography } from '@/constants/typography';
import { useI18n } from '@/hooks/useI18n';
import { usePermissions } from '@/hooks/usePermissions';
import { logAppError } from '@/utils/errorLogger';

export default function PermissionsScreen() {
  const colors = useAppTheme();
  const { t } = useI18n();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const router = useRouter();
  const { requestPermission, openSettings } = usePermissions();

  const handleRequest = useCallback(async () => {
    const granted = await requestPermission();

    if (granted) {
      router.replace('/(tabs)');
      return;
    }

    Alert.alert(t('permissions.alertNeedAccessTitle'), t('permissions.alertNeedAccessMessage'));
  }, [requestPermission, router, t]);

  const handleOpenSettings = useCallback(async () => {
    try {
      await openSettings();
    } catch (error) {
      void logAppError('permissions.handleOpenSettings', error);
      Alert.alert(t('permissions.alertSettingsUnavailableTitle'), t('permissions.alertSettingsUnavailableMessage'));
    }
  }, [openSettings, t]);

  return (
    <GradientBackground>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
          <View style={styles.card}>
            <Text style={styles.title}>{t('permissions.title')}</Text>
            <Text style={styles.subtitle}>
              {t('permissions.subtitle')}
            </Text>
            <View style={styles.actions}>
              <ActionButton title={t('permissions.allow')} onPress={handleRequest} />
              <ActionButton title={t('permissions.openSettings')} onPress={handleOpenSettings} variant="secondary" />
            </View>
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
      backgroundColor: 'transparent',
      justifyContent: 'center',
      paddingHorizontal: 24,
    },
    card: {
      backgroundColor: colors.surfaceElevated,
      borderColor: colors.border,
      borderRadius: 18,
      borderWidth: 1,
      paddingHorizontal: 18,
      paddingVertical: 22,
      shadowColor: colors.shadowColor,
      shadowOffset: { width: 0, height: 12 },
      shadowOpacity: colors.isDark ? 0.36 : 0.1,
      shadowRadius: 14,
      elevation: colors.isDark ? 7 : 3,
    },
    title: {
      color: colors.textPrimary,
      fontSize: 22,
      ...typography.bold,
      marginBottom: 12,
      textAlign: 'center',
    },
    subtitle: {
      color: colors.textSecondary,
      fontSize: 15,
      ...typography.regular,
      lineHeight: 22,
      marginBottom: 24,
      textAlign: 'center',
    },
    actions: {
      gap: 12,
    },
  });
