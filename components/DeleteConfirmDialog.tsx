import React, { useMemo } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { ActionButton } from '@/components/ActionButton';
import { useAppTheme } from '@/components/useAppTheme';
import { typography } from '@/constants/typography';
import { useI18n } from '@/hooks/useI18n';

export type DeleteConfirmDialogProps = {
  visible: boolean;
  count: number;
  onConfirm: () => void;
  onCancel: () => void;
};

export const DeleteConfirmDialog = React.memo(function DeleteConfirmDialog({
  visible,
  count,
  onConfirm,
  onCancel,
}: DeleteConfirmDialogProps) {
  const colors = useAppTheme();
  const { t } = useI18n();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <Pressable style={styles.overlay} onPress={onCancel}>
        <Pressable style={styles.dialog} onPress={(e) => e.stopPropagation()}>
          <Text style={styles.title}>
            {t('deleteDialog.title', { count })}
          </Text>
          <Text style={styles.message}>
            {t('deleteDialog.message')}
          </Text>
          <Text style={styles.info}>
            {t('deleteDialog.info')}
          </Text>

          <View style={styles.actions}>
            <ActionButton
              title={t('deleteDialog.cancel')}
              onPress={onCancel}
              variant="secondary"
              style={styles.button}
            />
            <ActionButton
              title={t('deleteDialog.confirm')}
              onPress={onConfirm}
              style={styles.button}
            />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
});

const createStyles = (colors: ReturnType<typeof useAppTheme>) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.6)',
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 20,
    },
    dialog: {
      backgroundColor: colors.surfaceElevated,
      borderRadius: 20,
      padding: 24,
      width: '100%',
      maxWidth: 400,
      shadowColor: colors.shadowColor,
      shadowOffset: { width: 0, height: 12 },
      shadowOpacity: colors.isDark ? 0.5 : 0.2,
      shadowRadius: 24,
      elevation: 10,
    },
    title: {
      color: colors.textPrimary,
      fontSize: 20,
      ...typography.bold,
      marginBottom: 12,
      textAlign: 'center',
    },
    message: {
      color: colors.textPrimary,
      fontSize: 15,
      ...typography.regular,
      marginBottom: 16,
      textAlign: 'center',
      lineHeight: 22,
    },
    info: {
      color: colors.textSecondary,
      fontSize: 13,
      ...typography.regular,
      marginBottom: 24,
      textAlign: 'center',
      lineHeight: 18,
    },
    actions: {
      flexDirection: 'row',
      gap: 12,
    },
    button: {
      flex: 1,
    },
  });
