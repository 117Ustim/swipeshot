import { MediaItem } from '@/types';
import { LARGE_VIDEO_THRESHOLD_BYTES } from '@/utils/constants';

export function isLargeVideo(item: MediaItem): boolean {
  return item.mediaType === 'video' && item.fileSize > LARGE_VIDEO_THRESHOLD_BYTES;
}
