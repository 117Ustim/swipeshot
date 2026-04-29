import * as MediaLibrary from 'expo-media-library';

export const FAVORITES_ALBUM_NAME = 'SwipeShot Favorites';

let cachedFavoritesAlbum: MediaLibrary.Album | null = null;

async function getFavoritesAlbum(): Promise<MediaLibrary.Album | null> {
  if (cachedFavoritesAlbum) {
    return cachedFavoritesAlbum;
  }

  const album = await MediaLibrary.getAlbumAsync(FAVORITES_ALBUM_NAME);
  cachedFavoritesAlbum = album ?? null;
  return cachedFavoritesAlbum;
}

export async function addAssetToFavoritesAlbum(assetId: string): Promise<boolean> {
  try {
    const existingAlbum = await getFavoritesAlbum();
    if (existingAlbum) {
      return await MediaLibrary.addAssetsToAlbumAsync([assetId], existingAlbum, true);
    }

    const createdAlbum = await MediaLibrary.createAlbumAsync(FAVORITES_ALBUM_NAME, assetId, true);
    cachedFavoritesAlbum = createdAlbum;
    return true;
  } catch {
    return false;
  }
}
