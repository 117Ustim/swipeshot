import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, Image, ListRenderItem, Pressable, StyleSheet, Text, View } from 'react-native';

import { useAppTheme } from '@/components/useAppTheme';
import { typography } from '@/constants/typography';
import { useI18n } from '@/hooks/useI18n';
import { MediaItem } from '@/types';
import { formatFileSize } from '@/utils/formatFileSize';
import { getCachedOptimizedPreviewUri, resolveOptimizedPreviewUri } from '@/utils/optimizedPreview';
import { isUnsupportedMediaUri } from '@/utils/resolveMediaUri';

export type ConfirmationListProps = {
  items: MediaItem[];
  onRemoveItem?: (item: MediaItem) => void; // Новый проп для удаления элемента
};

const ConfirmationRow = React.memo(function ConfirmationRow({
  item,
  styles,
  onRemove,
}: {
  item: MediaItem;
  styles: ReturnType<typeof createStyles>;
  onRemove?: (item: MediaItem) => void;
}) {
  const { t } = useI18n();
  const [displayUri, setDisplayUri] = useState<string | null>(() => {
    const cached = getCachedOptimizedPreviewUri(item, 'list');
    return isUnsupportedMediaUri(cached) ? null : cached;
  });

  useEffect(() => {
    let isMounted = true;
    const cached = getCachedOptimizedPreviewUri(item, 'list');
    setDisplayUri(isUnsupportedMediaUri(cached) ? null : cached);

    void resolveOptimizedPreviewUri(item, 'list').then((uri) => {
      if (isMounted) {
        setDisplayUri(isUnsupportedMediaUri(uri) ? null : uri);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [item.id, item.uri, item.width, item.height, item.mediaType]);

  const handlePress = useCallback(() => {
    onRemove?.(item);
  }, [item, onRemove]);

  return (
    <Pressable onPress={handlePress} style={styles.row}>
      {displayUri ? (
        <Image source={{ uri: displayUri }} style={styles.thumbnail} />
      ) : (
        <View style={[styles.thumbnail, styles.thumbnailFallback]} />
      )}
      <View style={styles.meta}>
        <Text style={styles.filename} numberOfLines={1}>{item.filename || t('media.unnamed')}</Text>
        <Text style={styles.size}>{formatFileSize(item.fileSize)}</Text>
      </View>
      {onRemove ? (
        <Text style={styles.removeIcon}>✕</Text>
      ) : null}
    </Pressable>
  );
}, (prevProps, nextProps) => {
  // Возвращаем true (НЕ перерисовывать), только если ВСЕ одинаково
  // Возвращаем false (перерисовать), если что-то изменилось
  return prevProps.item.id === nextProps.item.id && 
         prevProps.item.fileSize === nextProps.item.fileSize &&
         prevProps.onRemove === nextProps.onRemove;
});

export const ConfirmationList = React.memo(function ConfirmationList({ items, onRemoveItem }: ConfirmationListProps) {
  const colors = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const renderItem = useCallback<ListRenderItem<MediaItem>>(
    ({ item }) => <ConfirmationRow item={item} styles={styles} onRemove={onRemoveItem} />,
    [styles, onRemoveItem]
  );

  const keyExtractor = useCallback((item: MediaItem) => item.id, []);

  return (
    <FlatList
      data={items}
      keyExtractor={keyExtractor}
      renderItem={renderItem}
      showsVerticalScrollIndicator={false}
    />
  );
});

const createStyles = (colors: ReturnType<typeof useAppTheme>) =>
  StyleSheet.create({
    row: {
      alignItems: 'center',
      backgroundColor: colors.surfaceElevated,
      borderColor: colors.border,
      borderRadius: 14,
      borderWidth: 1,
      flexDirection: 'row',
      gap: 12,
      marginBottom: 10,
      paddingHorizontal: 10,
      paddingVertical: 10,
      shadowColor: colors.shadowColor,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: colors.isDark ? 0.35 : 0.08,
      shadowRadius: 10,
      elevation: colors.isDark ? 6 : 2,
    },
    thumbnail: {
      borderRadius: 12,
      height: 56,
      width: 56,
    },
    thumbnailFallback: {
      backgroundColor: colors.surfaceMuted,
    },
    meta: {
      flex: 1,
    },
    filename: {
      color: colors.textPrimary,
      fontSize: 14,
      ...typography.semibold,
      marginBottom: 4,
    },
    size: {
      color: colors.textSecondary,
      fontSize: 12,
      ...typography.regular,
    },
    removeIcon: {
      color: colors.textSecondary,
      fontSize: 20,
      ...typography.bold,
      paddingHorizontal: 8,
    },
  });
