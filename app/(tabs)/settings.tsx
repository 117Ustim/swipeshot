import Constants from 'expo-constants';
import { useCallback, useMemo } from 'react';
import { Alert, Linking, Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GradientBackground } from '@/components/GradientBackground';
import { useAppTheme } from '@/components/useAppTheme';
import { PRIVACY_POLICY_URL } from '@/constants/privacy';
import { typography } from '@/constants/typography';
import { useI18n } from '@/hooks/useI18n';
import { usePermissions } from '@/hooks/usePermissions';
import { usePhotoStore } from '@/store/photoStore';
import { AppTheme, LanguageCode, ReviewMode } from '@/types';
import { logAppError } from '@/utils/errorLogger';

function getAppVersionLabel(): string {
  const appVersion = Constants.expoConfig?.version;
  const runtimeVersion = Constants.expoConfig?.runtimeVersion;

  if (appVersion && runtimeVersion) {
    return `${appVersion} (${String(runtimeVersion)})`;
  }

  return appVersion ?? 'dev';
}

const LANGUAGE_OPTIONS: LanguageCode[] = ['uk', 'ru', 'en', 'de', 'fr'];
const REVIEW_MODE_OPTIONS: ReviewMode[] = ['monthly', 'yearly'];
const THEME_OPTIONS: AppTheme[] = ['light', 'dark', 'system'];

export default function SettingsScreen() {
  const colors = useAppTheme();
  const { t, getLanguageLabel } = useI18n();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { openSettings } = usePermissions();
  const language = usePhotoStore((state) => state.language);
  const reviewMode = usePhotoStore((state) => state.reviewMode);
  const theme = usePhotoStore((state) => state.theme);
  const showSwipeButtons = usePhotoStore((state) => state.showSwipeButtons);
  const setLanguage = usePhotoStore((state) => state.setLanguage);
  const setReviewMode = usePhotoStore((state) => state.setReviewMode);
  const setTheme = usePhotoStore((state) => state.setTheme);
  const setShowSwipeButtons = usePhotoStore((state) => state.setShowSwipeButtons);

  const appVersion = useMemo(() => getAppVersionLabel(), []);

  const handleOpenPrivacy = useCallback(async () => {
    if (!PRIVACY_POLICY_URL) {
      Alert.alert(t('settings.alertPrivacyTitle'), t('settings.alertPrivacyMissing'));
      return;
    }

    try {
      await Linking.openURL(PRIVACY_POLICY_URL);
    } catch (error) {
      void logAppError('settings.handleOpenPrivacy', error, { url: PRIVACY_POLICY_URL });
      Alert.alert(t('settings.alertPrivacyTitle'), t('settings.alertPrivacyOpenFailed'));
    }
  }, [t]);

  const handleOpenAppSettings = useCallback(async () => {
    try {
      await openSettings();
    } catch (error) {
      void logAppError('settings.handleOpenAppSettings', error);
      Alert.alert(t('settings.alertSettingsUnavailableTitle'), t('settings.alertSettingsUnavailableMessage'));
    }
  }, [openSettings, t]);

  const handleSelectLanguage = useCallback((code: LanguageCode) => {
    setLanguage(code);
  }, [setLanguage]);

  const handleOpenLanguagePicker = useCallback(() => {
    Alert.alert(
      t('settings.languagePickerTitle'),
      undefined,
      [
        ...LANGUAGE_OPTIONS.map((option) => ({
          text: `${option === language ? '✓ ' : ''}${getLanguageLabel(option)}`,
          onPress: () => handleSelectLanguage(option),
        })),
        { text: t('common.cancel'), style: 'cancel' as const },
      ]
    );
  }, [getLanguageLabel, handleSelectLanguage, language, t]);

  const getReviewModeLabel = useCallback((mode: ReviewMode) => {
    if (mode === 'yearly') {
      return t('settings.reviewModeYearly');
    }
    return t('settings.reviewModeMonthly');
  }, [t]);

  const getReviewModeHint = useCallback((mode: ReviewMode) => {
    if (mode === 'yearly') {
      return t('settings.reviewModeYearlyHint');
    }
    return t('settings.reviewModeMonthlyHint');
  }, [t]);

  const getThemeLabel = useCallback((tTheme: AppTheme) => {
    switch (tTheme) {
      case 'light': return t('settings.themeLight');
      case 'dark': return t('settings.themeDark');
      case 'system': return t('settings.themeSystem');
    }
  }, [t]);

  const handleSelectReviewMode = useCallback((mode: ReviewMode) => {
    setReviewMode(mode);
  }, [setReviewMode]);

  const handleSelectTheme = useCallback((tTheme: AppTheme) => {
    setTheme(tTheme);
  }, [setTheme]);

  const handleOpenReviewModePicker = useCallback(() => {
    Alert.alert(
      t('settings.reviewModePickerTitle'),
      undefined,
      [
        ...REVIEW_MODE_OPTIONS.map((option) => ({
          text: `${option === reviewMode ? '✓ ' : ''}${getReviewModeLabel(option)} — ${getReviewModeHint(option)}`,
          onPress: () => handleSelectReviewMode(option),
        })),
        { text: t('common.cancel'), style: 'cancel' as const },
      ]
    );
  }, [getReviewModeHint, getReviewModeLabel, handleSelectReviewMode, reviewMode, t]);

  const handleOpenThemePicker = useCallback(() => {
    Alert.alert(
      t('settings.themePickerTitle'),
      undefined,
      [
        ...THEME_OPTIONS.map((option) => ({
          text: `${option === theme ? '✓ ' : ''}${getThemeLabel(option)}`,
          onPress: () => handleSelectTheme(option),
        })),
        { text: t('common.cancel'), style: 'cancel' as const },
      ]
    );
  }, [getThemeLabel, handleSelectTheme, theme, t]);


  return (
    <GradientBackground>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
        <Text style={styles.title}>{t('settings.title')}</Text>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>{t('settings.privacyTitle')}</Text>
          <View style={styles.privacyList}>
            <Pressable onPress={handleOpenPrivacy} style={styles.privacyItem}>
              <Text style={styles.privacyItemLabel}>{t('settings.privacyPolicy')}</Text>
              <Text style={styles.privacyItemAction}>›</Text>
            </Pressable>
            <Pressable onPress={handleOpenAppSettings} style={[styles.privacyItem, styles.privacyItemLast]}>
              <Text style={styles.privacyItemLabel}>{t('settings.appSettings')}</Text>
              <Text style={styles.privacyItemAction}>›</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>{t('settings.languageTitle')}</Text>
          <Pressable onPress={handleOpenLanguagePicker} style={styles.languagePicker}>
            <Text style={styles.languageValue}>{getLanguageLabel(language)}</Text>
            <Text style={styles.languageAction}>{t('settings.chooseLanguage')}</Text>
          </Pressable>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>{t('settings.reviewModeTitle')}</Text>
          <Text style={styles.sectionSubtitle}>{t('settings.reviewModeSubtitle')}</Text>
          <Pressable onPress={handleOpenReviewModePicker} style={styles.languagePicker}>
            <Text style={styles.languageValue}>{getReviewModeLabel(reviewMode)}</Text>
            <Text style={styles.languageAction}>{t('settings.chooseReviewMode')}</Text>
          </Pressable>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>{t('settings.themeTitle')}</Text>
          <Pressable onPress={handleOpenThemePicker} style={styles.languagePicker}>
            <Text style={styles.languageValue}>{getThemeLabel(theme)}</Text>
            <Text style={styles.languageAction}>{t('settings.chooseTheme')}</Text>
          </Pressable>
        </View>

        <View style={styles.cardCompact}>
          <View style={styles.cardCompactInner}>
            <View style={styles.cardCompactText}>
              <Text style={styles.sectionTitle}>{t('settings.swipeButtonsTitle')}</Text>
              <Text style={styles.sectionSubtitle}>{t('settings.swipeButtonsSubtitle')}</Text>
            </View>
            <View style={styles.switchWrapper}>
              <Switch
                value={showSwipeButtons}
                onValueChange={(value) => setShowSwipeButtons(value)}
                thumbColor={colors.surfaceElevated}
                trackColor={{ false: colors.surfaceMuted, true: colors.accent }}
                ios_backgroundColor={colors.surfaceMuted}
              />
            </View>
          </View>
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.infoLabel}>{t('settings.versionLabel')}</Text>
          <Text style={styles.infoValue}>{appVersion}</Text>
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
      paddingHorizontal: 20,
      paddingTop: 12,
      gap: 16,
    },
    title: {
      color: colors.textPrimary,
      fontSize: 22,
      ...typography.bold,
    },
    card: {
      backgroundColor: colors.surfaceElevated,
      borderColor: colors.border,
      borderRadius: 16,
      borderWidth: 1,
      gap: 10,
      padding: 14,
      shadowColor: colors.shadowColor,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: colors.isDark ? 0.28 : 0.08,
      shadowRadius: 10,
      elevation: colors.isDark ? 4 : 2,
    },
    sectionTitle: {
      color: colors.textPrimary,
      fontSize: 16,
      ...typography.bold,
    },
    sectionSubtitle: {
      color: colors.textSecondary,
      fontSize: 12,
      ...typography.regular,
      marginTop: -4,
    },
    switchRow: {
      alignItems: 'center',
      flexDirection: 'row',
      justifyContent: 'flex-end',
    },
    cardCompact: {
      backgroundColor: colors.surfaceElevated,
      borderColor: colors.border,
      borderRadius: 16,
      borderWidth: 1,
      paddingHorizontal: 14,
      paddingVertical: 10,
      shadowColor: colors.shadowColor,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: colors.isDark ? 0.28 : 0.08,
      shadowRadius: 10,
      elevation: colors.isDark ? 4 : 2,
    },
    cardCompactInner: {
      alignItems: 'center',
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: 12,
    },
    cardCompactText: {
      flex: 1,
      gap: 2,
    },
    switchWrapper: {},
    privacyList: {
      borderColor: colors.border,
      borderRadius: 12,
      borderWidth: 1,
      overflow: 'hidden',
    },
    privacyItem: {
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderBottomColor: colors.border,
      borderBottomWidth: 1,
      flexDirection: 'row',
      justifyContent: 'space-between',
      minHeight: 38,
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    privacyItemLabel: {
      color: colors.textPrimary,
      fontSize: 14,
      ...typography.semibold,
    },
    privacyItemAction: {
      color: colors.textSecondary,
      fontSize: 17,
      ...typography.bold,
    },
    privacyItemLast: {
      borderBottomWidth: 0,
    },
    toggleRow: {
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderBottomColor: colors.border,
      borderBottomWidth: 1,
      flexDirection: 'row',
      justifyContent: 'space-between',
      minHeight: 42,
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    toggleRowLast: {
      borderBottomWidth: 0,
    },
    toggleLabel: {
      color: colors.textPrimary,
      fontSize: 14,
      ...typography.semibold,
    },
    languagePicker: {
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderRadius: 12,
      borderWidth: 1,
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    languageValue: {
      color: colors.textPrimary,
      fontSize: 14,
      ...typography.bold,
    },
    languageAction: {
      color: colors.accent,
      fontSize: 12,
      ...typography.semibold,
    },
    infoCard: {
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderRadius: 14,
      borderWidth: 1,
      paddingHorizontal: 14,
      paddingVertical: 12,
    },
    infoLabel: {
      color: colors.textSecondary,
      fontSize: 12,
      ...typography.regular,
      marginBottom: 2,
    },
    infoValue: {
      color: colors.textPrimary,
      fontSize: 14,
      ...typography.semibold,
    },
  });
