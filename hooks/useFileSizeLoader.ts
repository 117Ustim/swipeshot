import { useEffect, useRef } from 'react';

import { usePhotoStore } from '@/store/photoStore';
import { MediaItem } from '@/types';
import { getMediaItemFileSize } from '@/utils/mediaLibrary';

const BATCH_SIZE = 3; // Загружаем по 3 файла одновременно
const BATCH_DELAY = 100; // Задержка между батчами (мс)

export function useFileSizeLoader() {
  const deletionQueue = usePhotoStore((state) => state.deletionQueue);
  const updateItemFileSize = usePhotoStore((state) => state.updateItemFileSize);
  const isLoadingRef = useRef(false);

  useEffect(() => {
    if (isLoadingRef.current) {
      return;
    }

    const itemsToLoad = deletionQueue.filter((item) => item.fileSize === 0);
    if (itemsToLoad.length === 0) {
      return;
    }

    isLoadingRef.current = true;

    const loadSizes = async () => {
      for (let i = 0; i < itemsToLoad.length; i += BATCH_SIZE) {
        const batch = itemsToLoad.slice(i, i + BATCH_SIZE);

        await Promise.all(
          batch.map(async (item: MediaItem) => {
            try {
              const size = await getMediaItemFileSize(item.id);
              if (size > 0) {
                updateItemFileSize(item.id, size);
              }
            } catch (error) {
              // Игнорируем ошибки, оставляем fileSize = 0
            }
          })
        );

        if (i + BATCH_SIZE < itemsToLoad.length) {
          await new Promise((resolve) => setTimeout(resolve, BATCH_DELAY));
        }
      }

      isLoadingRef.current = false;
    };

    void loadSizes();
  }, [deletionQueue, updateItemFileSize]);
}
