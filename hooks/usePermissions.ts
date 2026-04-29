import { useCallback, useEffect, useState } from 'react';
import * as ExpoLinking from 'expo-linking';
import * as MediaLibrary from 'expo-media-library';

export function usePermissions() {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);

  useEffect(() => {
    let isMounted = true;

    const checkPermission = async () => {
      const permission = await MediaLibrary.getPermissionsAsync();
      if (isMounted) {
        setHasPermission(permission.status === 'granted');
      }
    };

    checkPermission();

    return () => {
      isMounted = false;
    };
  }, []);

  const requestPermission = useCallback(async () => {
    const permission = await MediaLibrary.requestPermissionsAsync();
    const granted = permission.status === 'granted';
    setHasPermission(granted);
    return granted;
  }, []);

  const openSettings = useCallback(async () => {
    await ExpoLinking.openSettings();
  }, []);

  return {
    hasPermission,
    requestPermission,
    openSettings,
  };
}
