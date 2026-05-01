import { useCallback } from 'react';

import { usePhotoStore } from '@/store/photoStore';

export function useGallery() {
  const months = usePhotoStore((state) => state.months);
  const isLoading = usePhotoStore((state) => state.isLoadingGallery);
  const error = usePhotoStore((state) => state.galleryError);
  const loadGallery = usePhotoStore((state) => state.loadGallery);

  const refetch = useCallback(async (forceRefresh?: boolean) => {
    await loadGallery(forceRefresh);
  }, [loadGallery]);

  return {
    months,
    isLoading,
    error,
    refetch,
  };
}
