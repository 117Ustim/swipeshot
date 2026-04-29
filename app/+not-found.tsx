import { Link, Stack } from 'expo-router';
import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { GradientBackground } from '@/components/GradientBackground';
import { useAppTheme } from '@/components/useAppTheme';
import { typography } from '@/constants/typography';
import { useI18n } from '@/hooks/useI18n';

export default function NotFoundScreen() {
  const colors = useAppTheme();
  const { t } = useI18n();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <>
      <Stack.Screen options={{ title: t('nav.notFound') }} />
      <GradientBackground>
        <View style={styles.container}>
          <Text style={styles.title}>{t('notFound.title')}</Text>
          <Link href="/" style={styles.link}>
            <Text style={styles.linkText}>{t('notFound.backHome')}</Text>
          </Link>
        </View>
      </GradientBackground>
    </>
  );
}

const createStyles = (colors: ReturnType<typeof useAppTheme>) =>
  StyleSheet.create({
    container: {
      flex: 1,
      alignItems: 'center',
      backgroundColor: 'transparent',
      justifyContent: 'center',
      padding: 20,
    },
    title: {
      color: colors.textPrimary,
      fontSize: 20,
      ...typography.bold,
    },
    link: {
      marginTop: 15,
      paddingVertical: 15,
    },
    linkText: {
      color: colors.accent,
      fontSize: 14,
      ...typography.medium,
    },
  });
