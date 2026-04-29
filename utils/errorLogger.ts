import * as FileSystem from 'expo-file-system/legacy';

const ERROR_LOG_FILE_NAME = 'swipeshot-errors.log';
const errorLogFileUri = FileSystem.documentDirectory
  ? `${FileSystem.documentDirectory}${ERROR_LOG_FILE_NAME}`
  : null;

let writeQueue: Promise<void> = Promise.resolve();

function normalizeError(error: unknown): { name: string; message: string; stack?: string } {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };
  }

  return {
    name: 'UnknownError',
    message: String(error),
  };
}

export function logAppError(
  context: string,
  error: unknown,
  metadata?: Record<string, unknown>
): Promise<void> {
  if (!errorLogFileUri) {
    return Promise.resolve();
  }

  const payload = JSON.stringify({
    timestamp: new Date().toISOString(),
    context,
    error: normalizeError(error),
    metadata: metadata ?? null,
  });

  writeQueue = writeQueue
    .catch(() => undefined)
    .then(async () => {
      let current = '';
      try {
        const info = await FileSystem.getInfoAsync(errorLogFileUri);
        if (info.exists) {
          current = await FileSystem.readAsStringAsync(errorLogFileUri);
        }
      } catch {
        current = '';
      }

      await FileSystem.writeAsStringAsync(errorLogFileUri, `${current}${payload}\n`);
    });

  return writeQueue;
}
