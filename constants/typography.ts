import { Platform, TextStyle } from 'react-native';

type FontRole = 'regular' | 'medium' | 'semibold' | 'bold';

const WEB_FONT_STACK = 'system-ui, -apple-system, "Segoe UI", Roboto, "Noto Sans", Helvetica, Arial, sans-serif';
const SYSTEM_FONT_FAMILY = Platform.select({
  ios: 'System',
  android: 'sans-serif',
  default: WEB_FONT_STACK,
});

const FONT_WEIGHTS: Record<FontRole, TextStyle['fontWeight']> = {
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
};

function resolveFontFamily(role: FontRole): string {
  if (Platform.OS === 'android') {
    if (role === 'regular') return 'sans-serif';
    if (role === 'medium') return 'sans-serif-medium';
    if (role === 'semibold') return 'sans-serif-medium';
    return 'sans-serif-bold';
  }

  return SYSTEM_FONT_FAMILY ?? WEB_FONT_STACK;
}

function createFontStyle(role: FontRole): TextStyle {
  return {
    fontFamily: resolveFontFamily(role),
    fontWeight: FONT_WEIGHTS[role],
    letterSpacing: role === 'regular' ? 0 : 0.1,
  };
}

export const typography = {
  regular: createFontStyle('regular'),
  medium: createFontStyle('medium'),
  semibold: createFontStyle('semibold'),
  bold: createFontStyle('bold'),
} as const;
