import * as FileSystem from 'expo-file-system/legacy';

import { PersistedState } from '@/types';

const PERSISTENCE_FILE_NAME = 'swipeshot-state-v1.json';
const persistenceFileUri = FileSystem.documentDirectory
  ? `${FileSystem.documentDirectory}${PERSISTENCE_FILE_NAME}`
  : null;

let writeQueue: Promise<void> = Promise.resolve();

export async function readPersistedStateFromDisk(): Promise<PersistedState | null> {
  if (!persistenceFileUri) {
    return null;
  }

  try {
    const info = await FileSystem.getInfoAsync(persistenceFileUri);
    if (!info.exists) {
      return null;
    }

    const raw = await FileSystem.readAsStringAsync(persistenceFileUri);
    const parsed = JSON.parse(raw) as PersistedState;

    return parsed;
  } catch {
    return null;
  }
}

export function writePersistedStateToDisk(state: PersistedState): Promise<void> {
  if (!persistenceFileUri) {
    return Promise.resolve();
  }

  writeQueue = writeQueue
    .catch(() => undefined)
    .then(async () => {
      await FileSystem.writeAsStringAsync(persistenceFileUri, JSON.stringify(state));
    });

  return writeQueue;
}
