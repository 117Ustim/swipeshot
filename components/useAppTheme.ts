import { useMemo } from 'react';
import { useColorScheme } from 'react-native';

import { usePhotoStore } from '@/store/photoStore';
import { AppTheme } from '@/types';

export type AppThemeColors = {
  isDark: boolean;
  background: string;
  backgroundSoft: string;
  backgroundGradient: [string, string, ...string[]]; // Массив цветов для градиента
  surface: string;
  surfaceElevated: string;
  surfaceMuted: string;
  surfaceStrong: string;
  textPrimary: string;
  textSecondary: string;
  textOnPrimary: string;
  primary: string;
  secondary: string;
  border: string;
  accent: string;
  progressTrack: string;
  progressFill: string;
  swipeCard: string;
  swipePreview: string;
  swipeBadge: string;
  swipeBadgeText: string;
  swipeText: string;
  swipeFallback: string;
  swipeFallbackText: string;
  strokeStrong: string;
  shadowColor: string;
};

const darkColors: AppThemeColors = {
  isDark: true,
  background: '#0F3757',
  backgroundSoft: '#154564',
  backgroundGradient: ['#0D2F4E', '#154766', '#1B5978'],
  surface: '#294766',
  surfaceElevated: '#2E4E6F',
  surfaceMuted: '#375A7B',
  surfaceStrong: '#F2F7FF',
  textPrimary: '#F2F7FF',
  textSecondary: '#B7C8DA',
  textOnPrimary: '#F7FBFF',
  primary: '#58A5FF',
  secondary: '#2A4A68',
  border: '#4D6E90',
  accent: '#67B0FF',
  progressTrack: '#3C5F80',
  progressFill: '#78BAFF',
  swipeCard: '#1E3A56',
  swipePreview: '#17324C',
  swipeBadge: '#2D5276',
  swipeBadgeText: '#EAF2FF',
  swipeText: '#F4F8FF',
  swipeFallback: '#1A334C',
  swipeFallbackText: '#AFC3D8',
  strokeStrong: '#5A7FA3',
  shadowColor: '#0B2237',
};

const lightColors: AppThemeColors = {
  isDark: false,
  background: '#E1F0FF',
  backgroundSoft: '#F0F7FF',
  backgroundGradient: ['#E3F2FF', '#F0F8FF', '#FFFFFF'],
  surface: '#FFFFFF',
  surfaceElevated: '#F8FBFF',
  surfaceMuted: '#EBF4FF',
  surfaceStrong: '#1A3B5D',
  textPrimary: '#1A3B5D',
  textSecondary: '#5C7DA0',
  textOnPrimary: '#FFFFFF',
  primary: '#3A86FF',
  secondary: '#E1E9F5',
  border: '#D1E3F8',
  accent: '#4895EF',
  progressTrack: '#D1E3F8',
  progressFill: '#3A86FF',
  swipeCard: '#FFFFFF',
  swipePreview: '#F2F8FF',
  swipeBadge: '#E1F0FF',
  swipeBadgeText: '#2A5A8D',
  swipeText: '#1A3B5D',
  swipeFallback: '#F0F7FF',
  swipeFallbackText: '#7A96B4',
  strokeStrong: '#BDD7F5',
  shadowColor: 'rgba(0, 60, 120, 0.1)',
};

function resolveTheme(theme: AppTheme, systemColorScheme: 'light' | 'dark'): AppThemeColors {
  const isDark = theme === 'dark' || (theme === 'system' && systemColorScheme === 'dark');
  
  return isDark ? darkColors : lightColors;
}

export function useAppTheme(): AppThemeColors {
  const theme = usePhotoStore((state) => state.theme);
  const systemColorScheme = useColorScheme() ?? 'light';

  return useMemo(() => resolveTheme(theme, systemColorScheme), [theme, systemColorScheme]);
}
