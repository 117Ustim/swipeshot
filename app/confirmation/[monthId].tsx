import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ActionButton } from '@/components/ActionButton';
import { ConfirmationList } from '@/components/ConfirmationList';
import { DeleteConfirmDialog } from '@/components/DeleteConfirmDialog';
import { EmptyState } from '@/components/EmptyState';
import { GradientBackground } from '@/components/GradientBackground';
import { useAppTheme } from '@/components/useAppTheme';
import { typography } from '@/constants/typography';
import { useFileSizeLoader } from '@/hooks/useFileSizeLoader';
import { useI18n } from '@/hooks/useI18n';
import { usePhotoStore } from '@/store/photoStore';
import { MediaItem } from '@/types';
import { logAppError } from '@/utils/errorLogger';
import { formatFileSize } from '@/utils/formatFileSize';

export default function ConfirmationScreen() {
  const colors = useAppTheme();
  const { t, formatMonthLabel } = useI18n();
  const styles = useMemo(() => createStyles(colors), [colors]);

  useFileSizeLoader();

  const { monthId } = useLocalSearchParams<{ monthId?: string }>();
  const router = useRouter();

  const deletionQueue = usePhotoStore((state) => state.deletionQueue);
  const confirmDeletion = usePhotoStore((state) => state.confirmDeletion);
  const removeFromDeletionQueue = usePhotoStore((state) => state.removeFromDeletionQueue);
  const session = usePhotoStore((state) => (monthId ? state.getSessionById(monthId) : null));

  const [showDialog, setShowDialog] = useState(false);

  const totalSize = useMemo(
    () => deletionQueue.reduce((sum, item) => sum + item.fileSize, 0),
    [deletionQueue]
  );

  const sessionLabel = useMemo(() => {
    if (!monthId) {
      return '-';
    }

    const isMonthKey = /^\d{4}-\d{2}$/.test(monthId);
    if (isMonthKey) {
      return formatMonthLabel(monthId);
    }

    return session?.displayName ?? monthId;
  }, [formatMonthLabel, monthId, session?.displayName]);

  const handleConfirm = useCallback(async () => {
    setShowDialog(false);
    
    try {
      const result = await confirmDeletion();

      if (result.failedCount > 0) {
        Alert.alert(
          t('confirmation.alertPartialTitle'),
          t('confirmation.alertPartialMessage', {
            deletedCount: result.deletedCount,
            failedCount: result.failedCount,
          })
        );
      }

      router.replace('/(tabs)');
    } catch (error) {
      void logAppError('confirmation.handleConfirm', error, { monthId: monthId ?? null });
      Alert.alert(t('confirmation.alertErrorTitle'), t('confirmation.alertErrorMessage'));
    }
  }, [confirmDeletion, monthId, router, t]);

  const handleDeletePress = useCallback(() => {
    setShowDialog(true);
  }, []);

  const handleDialogCancel = useCallback(() => {
    setShowDialog(false);
  }, []);

  const handleCancel = useCallback(() => {
    router.replace('/(tabs)');
  }, [router]);

  const handleRemoveItem = useCallback((item: MediaItem) => {
    removeFromDeletionQueue(item.id);
  }, [removeFromDeletionQueue]);

  return (
    <GradientBackground>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
          <Text style={styles.title}>{t('confirmation.title')}</Text>
          <Text style={styles.subtitle}>{sessionLabel}</Text>

          {deletionQueue.length === 0 ? (
            <EmptyState title={t('confirmation.emptyTitle')} subtitle={t('confirmation.emptySubtitle')} />
          ) : (
            <View style={styles.listBlock}>
              <ConfirmationList items={deletionQueue} onRemoveItem={handleRemoveItem} />
            </View>
          )}

          <View style={styles.summary}>
            <Text style={styles.summaryLabel}>{t('confirmation.summaryDelete', { count: deletionQueue.length })}</Text>
            <Text style={styles.summaryLabel}>{t('confirmation.summarySize', { size: formatFileSize(totalSize) })}</Text>
          </View>

          <View style={styles.actions}>
            <ActionButton title={t('confirmation.actionDelete')} onPress={handleDeletePress} />
            <ActionButton title={t('confirmation.actionCancel')} onPress={handleCancel} variant="secondary" />
          </View>
        </View>
      </SafeAreaView>

      <DeleteConfirmDialog
        visible={showDialog}
        count={deletionQueue.length}
        onConfirm={handleConfirm}
        onCancel={handleDialogCancel}
      />
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
    },
    title: {
      color: colors.textSecondary,
      fontSize: 16,
      ...typography.regular,
      textAlign: 'center',
      marginBottom: 2,
    },
    subtitle: {
      color: colors.textPrimary,
      fontSize: 24,
      ...typography.bold,
      textAlign: 'center',
      marginBottom: 20,
    },
    listBlock: {
      flex: 1,
    },
    summary: {
      backgroundColor: colors.surfaceElevated,
      borderColor: colors.border,
      borderRadius: 14,
      borderWidth: 1,
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginVertical: 12,
      paddingHorizontal: 12,
      paddingVertical: 10,
      shadowColor: colors.shadowColor,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: colors.isDark ? 0.28 : 0.08,
      shadowRadius: 10,
      elevation: colors.isDark ? 4 : 2,
    },
    summaryLabel: {
      color: colors.textPrimary,
      fontSize: 14,
      ...typography.semibold,
    },
    actions: {
      backgroundColor: colors.surfaceElevated,
      borderColor: colors.border,
      borderRadius: 14,
      borderWidth: 1,
      gap: 12,
      marginBottom: 12,
      padding: 12,
      shadowColor: colors.shadowColor,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: colors.isDark ? 0.28 : 0.08,
      shadowRadius: 10,
      elevation: colors.isDark ? 4 : 2,
    },
  });
