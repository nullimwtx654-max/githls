import {useTheme as usePaperTheme, MD3Theme} from 'react-native-paper';

import {uiStore} from '../store';

import {Theme} from '../utils/types';
import {buildTheme} from '../utils/theme';

const themeCache = new WeakMap<MD3Theme, Map<string, Theme>>();

export const useTheme = (): Theme => {
  const paperTheme = usePaperTheme<MD3Theme>();
  const mode = uiStore.colorScheme;
  const language = uiStore.language;
  const fancyActive =
    uiStore.palsHubFancyTheme && uiStore.fancyThemeScope === 'everywhere';
  const fancyTint = uiStore.palsHubFancyAccentTint || 'monochrome';
  const fancyBubbleRadius = uiStore.palsHubFancyBubbleRadius ?? 18;
  const key = `${mode}:${language}:${fancyActive ? 'fancy' : 'std'}:${fancyTint}:${fancyBubbleRadius}`;

  let byKey = themeCache.get(paperTheme);
  if (byKey === undefined) {
    byKey = new Map();
    themeCache.set(paperTheme, byKey);
  }

  let cached = byKey.get(key);
  if (cached === undefined) {
    cached = {
      ...paperTheme,
      ...buildTheme({
        mode,
        language,
        fancyActive,
        fancyTint,
        fancyBubbleRadius,
      }),
    } as Theme;
    byKey.set(key, cached);
  }
  return cached;
};
