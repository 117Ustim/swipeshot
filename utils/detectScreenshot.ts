import { MediaItem } from '@/types';

const SCREENSHOT_PATTERNS = [
  /screenshot/i,
  /screen_shot/i,
  /снимок экрана/i,
  /скриншот/i,
];

const COMMON_SCREENSHOT_RESOLUTIONS = new Set<string>([
  '750x1334',
  '828x1792',
  '1080x1920',
  '1080x2160',
  '1080x2340',
  '1080x2400',
  '1080x2460',
  '1080x2520',
  '1080x2640',
  '1125x2436',
  '1170x2532',
  '1179x2556',
  '1242x2688',
  '1284x2778',
  '1290x2796',
  '1440x2560',
  '1440x2960',
  '1440x3040',
  '1440x3120',
]);

function normalizeResolution(width: number, height: number): string | null {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    return null;
  }

  const roundedWidth = Math.round(width);
  const roundedHeight = Math.round(height);
  const shortSide = Math.min(roundedWidth, roundedHeight);
  const longSide = Math.max(roundedWidth, roundedHeight);

  return `${shortSide}x${longSide}`;
}

export function isScreenshot(item: MediaItem): boolean {
  if (item.mediaType !== 'photo') {
    return false;
  }

  const matchesFilename = SCREENSHOT_PATTERNS.some((pattern) => pattern.test(item.filename));
  const matchesPath = item.uri.toLowerCase().includes('screenshots');
  const normalizedResolution = normalizeResolution(item.width, item.height);
  const matchesDimensions = normalizedResolution
    ? COMMON_SCREENSHOT_RESOLUTIONS.has(normalizedResolution)
    : false;

  return matchesFilename || matchesPath || matchesDimensions;
}
