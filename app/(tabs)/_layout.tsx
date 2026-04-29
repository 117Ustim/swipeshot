import { Feather } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { Tabs } from 'expo-router';
import { useMemo } from 'react';
import { Platform, StyleSheet } from 'react-native';

import { useAppTheme } from '@/components/useAppTheme';
import { typography } from '@/constants/typography';
import { useI18n } from '@/hooks/useI18n';

export default function TabLayout() {
  const colors = useAppTheme();
  const { t } = useI18n();

  const screenOptions = useMemo(
    () => ({
      headerShown: false,
      headerShadowVisible: false,
      headerStyle: {
        backgroundColor: colors.background,
        shadowColor: 'transparent',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0,
        shadowRadius: 0,
        elevation: 0,
      },
      headerTintColor: colors.textPrimary,
      headerTitleStyle: {
        color: colors.textPrimary,
        ...typography.semibold,
      },
      tabBarHideOnKeyboard: true,
      tabBarStyle: {
        position: 'absolute' as const,
        left: 20,
        right: 20,
        bottom: Platform.OS === 'ios' ? 28 : 20,
        height: 64,
        backgroundColor: 'transparent',
        borderTopWidth: 0,
        borderColor: colors.isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 40, 100, 0.18)',
        borderWidth: 1.5,
        borderRadius: 32,
        paddingHorizontal: 12,
        paddingTop: Platform.OS === 'ios' ? 8 : 0,
        paddingBottom: Platform.OS === 'ios' ? 8 : 0,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: colors.isDark ? 0.35 : 0.25,
        shadowRadius: 18,
        elevation: 12,
        overflow: 'hidden' as const,
      },
      tabBarBackground: () => (
        <BlurView
          intensity={Platform.OS === 'ios' ? 45 : 90}
          tint={colors.isDark ? 'dark' : 'light'}
          style={[
            StyleSheet.absoluteFill,
            {
              // Оптимальный баланс: чуть светлее и прозрачнее
              backgroundColor: colors.isDark ? 'rgba(15, 55, 87, 0.4)' : 'rgba(215, 230, 245, 0.82)',
            }
          ]}
        />
      ),
      tabBarItemStyle: {
        borderRadius: 20,
        marginHorizontal: 4,
      },
      tabBarActiveBackgroundColor: 'transparent',
      tabBarActiveTintColor: colors.accent,
      tabBarInactiveTintColor: colors.textSecondary,
      tabBarLabelStyle: {
        fontSize: 12,
        marginTop: 2,
        ...typography.semibold,
      },
    }),
    [colors]
  );

  return (
    <Tabs screenOptions={screenOptions}>
      <Tabs.Screen
        name="index"
        options={{
          title: t('nav.tab.months'),
          tabBarIcon: ({ color }) => (
            <Feather name="calendar" size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: t('nav.tab.settings'),
          tabBarIcon: ({ color }) => (
            <Feather name="settings" size={24} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
