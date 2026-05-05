import { Ionicons } from '@expo/vector-icons';
import { useVideoPlayer, VideoView } from 'expo-video';
import React, { useEffect, useMemo, useState } from 'react';
import { Dimensions, Image, StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
    Extrapolation,
    interpolate,
    runOnJS,
    useAnimatedStyle,
    useSharedValue,
    withSpring,
    withTiming,
} from 'react-native-reanimated';

import { useAppTheme } from '@/components/useAppTheme';
import { typography } from '@/constants/typography';
import { useI18n } from '@/hooks/useI18n';
import { MediaItem } from '@/types';
import { getCachedOptimizedPreviewUri, resolveOptimizedPreviewUri } from '@/utils/optimizedPreview';
import { isUnsupportedMediaUri } from '@/utils/resolveMediaUri';

const SCREEN = Dimensions.get('window');
const SWIPE_THRESHOLD = 140;
const COMPLETE_SWIPE_X = SCREEN.width * 0.6;
const COMPLETE_SWIPE_UP = SCREEN.height * 0.33;
const FLICK_VELOCITY_X = 950;
const FLICK_VELOCITY_Y = 900;
const ROTATION_MAX = 12;
const OFFSCREEN_X = SCREEN.width * 1.2;
const OFFSCREEN_Y = SCREEN.height * 0.6;

export type SwipeCardProps = {
  item: MediaItem;
  onSwipeLeft: () => void;
  onSwipeRight: () => void;
  onSwipeUp: () => void;
};

function formatDuration(seconds?: number) {
  if (!seconds) return 'Видео';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

export const SwipeCard = React.memo(function SwipeCard({
  item,
  onSwipeLeft,
  onSwipeRight,
  onSwipeUp,
}: SwipeCardProps) {
  const colors = useAppTheme();
  const { t } = useI18n();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [displayUri, setDisplayUri] = useState<string | null>(() => {
    if (item.mediaType === 'video') return null;
    const cached = getCachedOptimizedPreviewUri(item, 'card');
    return isUnsupportedMediaUri(cached) ? null : cached;
  });
  const [imageLoadError, setImageLoadError] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  
  const videoSource = item.mediaType === 'video' ? item.uri : null;
  const player = useVideoPlayer(videoSource, (player) => {
    player.loop = true;
    player.muted = false;
  });

  useEffect(() => {
    if (!player) return;
    if (isPlaying) {
      player.play();
    } else {
      player.pause();
    }
  }, [isPlaying, player]);
  
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const rotation = useSharedValue(0);
  const cardScale = useSharedValue(1);
  const opacity = useSharedValue(1);
  const isAnimating = useSharedValue(false);

  useEffect(() => {
    translateX.value = 0;
    translateY.value = 0;
    rotation.value = 0;
    cardScale.value = 0.965;
    opacity.value = 0;
    opacity.value = withTiming(1, { duration: 220 });
    cardScale.value = withTiming(1, { duration: 240 });
    isAnimating.value = false;
    setImageLoadError(false);
    setIsPlaying(false);
  }, [cardScale, isAnimating, item.id, opacity, rotation, translateX, translateY]);

  useEffect(() => {
    let isMounted = true;
    
    if (item.mediaType === 'video') {
      setDisplayUri(null);
      setImageLoadError(false);
      return;
    }
    
    const cached = getCachedOptimizedPreviewUri(item, 'card');
    setDisplayUri(isUnsupportedMediaUri(cached) ? null : cached);
    setImageLoadError(false);

    void resolveOptimizedPreviewUri(item, 'card').then((uri) => {
      if (isMounted) {
        setDisplayUri(isUnsupportedMediaUri(uri) ? null : uri);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [item.id, item.uri, item.width, item.height, item.mediaType]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { rotateZ: `${rotation.value}deg` },
      { scale: cardScale.value },
    ],
  }));

  const leftIndicatorStyle = useAnimatedStyle(() => {
    const indicatorOpacity = interpolate(
      translateX.value,
      [-SWIPE_THRESHOLD, -40, 0],
      [1, 0.45, 0],
      Extrapolation.CLAMP
    );
    const scale = interpolate(
      translateX.value,
      [-SWIPE_THRESHOLD, 0],
      [1, 0.9],
      Extrapolation.CLAMP
    );

    return {
      opacity: indicatorOpacity,
      transform: [{ scale }],
    };
  });

  const rightIndicatorStyle = useAnimatedStyle(() => {
    const indicatorOpacity = interpolate(
      translateX.value,
      [0, 40, SWIPE_THRESHOLD],
      [0, 0.45, 1],
      Extrapolation.CLAMP
    );
    const scale = interpolate(
      translateX.value,
      [0, SWIPE_THRESHOLD],
      [0.9, 1],
      Extrapolation.CLAMP
    );

    return {
      opacity: indicatorOpacity,
      transform: [{ scale }],
    };
  });

  const upIndicatorStyle = useAnimatedStyle(() => {
    const indicatorOpacity = interpolate(
      translateY.value,
      [-SWIPE_THRESHOLD, -40, 0],
      [1, 0.45, 0],
      Extrapolation.CLAMP
    );
    const scale = interpolate(
      translateY.value,
      [-SWIPE_THRESHOLD, 0],
      [1, 0.9],
      Extrapolation.CLAMP
    );

    return {
      opacity: indicatorOpacity,
      transform: [{ scale }],
    };
  });

  const resetPosition = () => {
    'worklet';
    translateX.value = withSpring(0);
    translateY.value = withSpring(0);
    rotation.value = withSpring(0);
    cardScale.value = withSpring(1);
  };

  const completeSwipe = (direction: 'left' | 'right') => {
    if (direction === 'left') {
      onSwipeLeft();
    } else {
      onSwipeRight();
    }
  };

  const completeSwipeUp = () => {
    onSwipeUp();
  };

  const animateOut = (direction: 'left' | 'right') => {
    'worklet';
    const targetX = direction === 'left' ? -OFFSCREEN_X : OFFSCREEN_X;
    const targetY = 0;
    const targetRotation = direction === 'left' ? -ROTATION_MAX : ROTATION_MAX;

    translateX.value = withTiming(targetX, { duration: 220 });
    translateY.value = withTiming(targetY, { duration: 220 });
    rotation.value = withTiming(targetRotation, { duration: 220 });
    cardScale.value = withTiming(0.94, { duration: 200 });
    opacity.value = withTiming(0, { duration: 210 }, () => {
      runOnJS(completeSwipe)(direction);
      translateX.value = 0;
      translateY.value = 0;
      rotation.value = 0;
      cardScale.value = 1;
      opacity.value = 0;
      isAnimating.value = false;
    });
  };

  const animateOutUp = () => {
    'worklet';
    translateX.value = withTiming(0, { duration: 220 });
    translateY.value = withTiming(-OFFSCREEN_Y, { duration: 220 });
    rotation.value = withTiming(0, { duration: 220 });
    cardScale.value = withTiming(0.94, { duration: 200 });
    opacity.value = withTiming(0, { duration: 210 }, () => {
      runOnJS(completeSwipeUp)();
      translateX.value = 0;
      translateY.value = 0;
      rotation.value = 0;
      cardScale.value = 1;
      opacity.value = 0;
      isAnimating.value = false;
    });
  };

  const panGesture = Gesture.Pan()
    .activeOffsetX([-10, 10])
    .activeOffsetY([-10, 10])
    .onUpdate((event) => {
      if (isAnimating.value) {
        return;
      }

      translateX.value = event.translationX;
      translateY.value = event.translationY;
      rotation.value = (event.translationX / SCREEN.width) * ROTATION_MAX;
    })
    .onEnd((event) => {
      if (isAnimating.value) {
        return;
      }

      const movedRightEnough = translateX.value > COMPLETE_SWIPE_X;
      const movedLeftEnough = translateX.value < -COMPLETE_SWIPE_X;
      const movedUpEnough = translateY.value < -COMPLETE_SWIPE_UP;

      const isFastRightFlick = event.velocityX > FLICK_VELOCITY_X;
      const isFastLeftFlick = event.velocityX < -FLICK_VELOCITY_X;
      const isFastUpFlick = event.velocityY < -FLICK_VELOCITY_Y;

      const horizontalDominates = Math.abs(translateX.value) > Math.abs(translateY.value) * 1.4;
      const verticalDominates = Math.abs(translateY.value) > Math.abs(translateX.value) * 1.4;

      const isSwipeRight = horizontalDominates && (movedRightEnough || isFastRightFlick);
      const isSwipeLeft = horizontalDominates && (movedLeftEnough || isFastLeftFlick);
      const isSwipeUp = verticalDominates && (movedUpEnough || isFastUpFlick);

      if (isSwipeUp) {
        isAnimating.value = true;
        animateOutUp();
        return;
      }

      if (isSwipeLeft || isSwipeRight) {
        isAnimating.value = true;
        const direction = isSwipeLeft ? 'left' : 'right';
        animateOut(direction);
        return;
      }

      resetPosition();
    });

  const handleTap = () => {
    setIsPlaying((prev) => !prev);
  };

  const tapGesture = Gesture.Tap().onEnd(() => {
    if (item.mediaType === 'video') {
      runOnJS(handleTap)();
    }
  });

  const gesture = Gesture.Simultaneous(panGesture, tapGesture);

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View style={[styles.card, animatedStyle]}>
        <View style={styles.preview}>
          {item.mediaType === 'video' ? (
            <VideoView 
              player={player} 
              style={styles.image} 
              contentFit="cover"
              nativeControls={false}
            />
          ) : displayUri && !imageLoadError ? (
            <Image 
              source={{ uri: displayUri }} 
              style={styles.image}
              onError={() => {
                setImageLoadError(true);
              }}
            />
          ) : (
            <View style={styles.imageFallback}>
              <Text style={styles.imageFallbackText}>
                {imageLoadError ? t('media.loadError') : t('media.previewUnavailable')}
              </Text>
              <Text style={[styles.imageFallbackText, styles.imageFallbackSubtext]}>
                {item.filename}
              </Text>
            </View>
          )}
          {/* Динамические индикаторы при свайпе */}
          <View pointerEvents="none" style={styles.indicators}>
            <Animated.View style={[styles.indicatorChip, styles.indicatorDelete, leftIndicatorStyle]}>
              <Text style={styles.indicatorText}>{t('media.delete')}</Text>
            </Animated.View>
            <Animated.View style={[styles.indicatorChip, styles.indicatorKeep, rightIndicatorStyle]}>
              <Text style={styles.indicatorText}>{t('media.keep')}</Text>
            </Animated.View>
            <Animated.View style={[styles.indicatorChip, styles.indicatorFavorite, upIndicatorStyle]}>
              <Text style={styles.indicatorText}>{t('media.favorite')}</Text>
            </Animated.View>
          </View>
          {item.mediaType === 'video' ? (
            <>
              {!isPlaying && (
                <View style={styles.playButtonOverlay} pointerEvents="none">
                  <Ionicons name="play" size={48} color="rgba(255, 255, 255, 0.9)" />
                </View>
              )}
              <View style={styles.videoBadge} pointerEvents="none">
                <Ionicons name="videocam" size={16} color="#FFFFFF" />
                <Text style={styles.videoBadgeText}>
                  {formatDuration(item.duration)}
                </Text>
              </View>
            </>
          ) : null}
        </View>
      </Animated.View>
    </GestureDetector>
  );
});

const createStyles = (colors: ReturnType<typeof useAppTheme>) =>
  StyleSheet.create({
    card: {
      flex: 1,
      backgroundColor: colors.swipeCard,
      borderColor: colors.strokeStrong,
      borderRadius: 20,
      borderWidth: 1,
      overflow: 'hidden',
      shadowColor: colors.shadowColor,
      shadowOffset: { width: 0, height: 14 },
      shadowOpacity: colors.isDark ? 0.46 : 0.18,
      shadowRadius: 20,
      elevation: colors.isDark ? 10 : 6,
    },
    preview: {
      flex: 1,
      backgroundColor: colors.swipePreview,
    },
    indicators: {
      ...StyleSheet.absoluteFillObject,
    },
    indicatorChip: {
      borderRadius: 999,
      borderWidth: 1,
      paddingHorizontal: 12,
      paddingVertical: 6,
      position: 'absolute',
    },
    indicatorDelete: {
      backgroundColor: 'rgba(239, 68, 68, 0.2)',
      borderColor: '#EF4444',
      right: 16,
      top: 16,
    },
    indicatorKeep: {
      backgroundColor: 'rgba(34, 197, 94, 0.2)',
      borderColor: '#22C55E',
      left: 16,
      top: 16,
    },
    indicatorFavorite: {
      alignSelf: 'center',
      backgroundColor: 'rgba(251, 191, 36, 0.2)',
      borderColor: '#F59E0B',
      top: 16,
    },
    indicatorText: {
      color: colors.swipeText,
      fontSize: 12,
      ...typography.bold,
      textTransform: 'uppercase',
    },
    image: {
      height: '100%',
      width: '100%',
    },
    imageFallback: {
      alignItems: 'center',
      backgroundColor: colors.swipeFallback,
      height: '100%',
      justifyContent: 'center',
      width: '100%',
      padding: 20,
    },
    imageFallbackText: {
      color: colors.swipeFallbackText,
      fontSize: 13,
      ...typography.semibold,
      textAlign: 'center',
    },
    imageFallbackSubtext: {
      fontSize: 11,
      marginTop: 8,
      opacity: 0.7,
    },
    videoBadge: {
      position: 'absolute',
      bottom: 16,
      left: 16,
      backgroundColor: 'rgba(0, 0, 0, 0.65)',
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 14,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      borderWidth: 1,
      borderColor: 'rgba(255, 255, 255, 0.2)',
    },
    videoBadgeText: {
      color: '#FFFFFF',
      fontSize: 13,
      ...typography.bold,
    },
    playButtonOverlay: {
      ...StyleSheet.absoluteFillObject,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(0, 0, 0, 0.2)',
    },
  });
