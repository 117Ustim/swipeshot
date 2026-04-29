import 'react-native-gesture-handler';
import 'react-native-reanimated';

import { DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { typography } from '@/constants/typography';
import { useI18n } from '@/hooks/useI18n';

export {
    ErrorBoundary
} from 'expo-router';

export const unstable_settings = {
  initialRouteName: '(tabs)',
};

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return <RootLayoutNav />;
}

function RootLayoutNav() {
  const { t } = useI18n();

  return (
    <GestureHandlerRootView style={styles.root}>
      <ThemeProvider value={DefaultTheme}>
        <Stack
          screenOptions={{
            headerTitleStyle: {
              fontFamily: typography.semibold.fontFamily,
            },
          }}
        >
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="permissions" options={{ title: t('nav.stack.permissions') }} />
          <Stack.Screen
            name="swipe/[monthId]"
            options={{
              headerShown: false,
            }}
          />
          <Stack.Screen name="confirmation/[monthId]" options={{ headerShown: false }} />
        </Stack>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
