import { useCallback, useMemo } from 'react';

import { usePhotoStore } from '@/store/photoStore';
import {
  formatMonthLabel as formatMonthLabelWithLanguage,
  formatMonthName as formatMonthNameWithLanguage,
  getLanguageNativeLabel,
  t as translate,
  TranslationKey,
  TranslationParams,
} from '@/utils/i18n';

export function useI18n() {
  const language = usePhotoStore((state) => state.language);

  const t = useCallback(
    (key: TranslationKey, params?: TranslationParams) => translate(language, key, params),
    [language]
  );

  const formatMonthLabel = useCallback(
    (monthId: string) => formatMonthLabelWithLanguage(monthId, language),
    [language]
  );

  const formatMonthName = useCallback(
    (monthId: string) => formatMonthNameWithLanguage(monthId, language),
    [language]
  );

  const getLanguageLabel = useCallback(
    (code: typeof language) => getLanguageNativeLabel(code),
    []
  );

  return useMemo(
    () => ({
      language,
      t,
      formatMonthLabel,
      formatMonthName,
      getLanguageLabel,
    }),
    [formatMonthLabel, formatMonthName, getLanguageLabel, language, t]
  );
}
