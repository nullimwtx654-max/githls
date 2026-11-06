import {StyleSheet} from 'react-native';

import {Theme} from '../../utils/types';
import {parseCustomCss} from '../../utils/customCssEngine';

export const codeHighlighterPreOverride = {
  backgroundColor: 'transparent',
} as const;

export const createTagsStyles = (
  theme: Theme,
  options?: {
    fancyActive?: boolean;
    fancyFontSize?: number;
    fancyLineHeightMultiplier?: number;
    customCss?: string;
  },
) => {
  const baseFontSize =
    options?.fancyActive && options?.fancyFontSize
      ? options.fancyFontSize
      : 16;
  const lineHeight =
    options?.fancyActive && options?.fancyLineHeightMultiplier
      ? Math.round(baseFontSize * options.fancyLineHeightMultiplier)
      : undefined;

  const baseStyles: Record<string, any> = {
    body: {
      color: theme.colors.text,
      fontSize: baseFontSize,
      ...(lineHeight ? {lineHeight} : {}),
      fontFamily:
        '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      padding: 0,
      paddingTop: 0,
      margin: 0,
      backgroundColor: 'transparent',
    },
    p: {
      marginTop: 0,
      marginBottom: 8,
    },
    a: {
      color: theme.colors.secondary,
      textDecorationLine: 'underline' as const,
    },
    em: {
      fontStyle: 'italic' as const,
      color: options?.fancyActive
        ? theme.dark
          ? 'rgba(226, 232, 240, 0.84)'
          : 'rgba(51, 65, 85, 0.85)'
        : theme.colors.text,
    },
    i: {
      fontStyle: 'italic' as const,
      color: options?.fancyActive
        ? theme.dark
          ? 'rgba(226, 232, 240, 0.84)'
          : 'rgba(51, 65, 85, 0.85)'
        : theme.colors.text,
    },
    q: {
      color: options?.fancyActive
        ? theme.dark
          ? '#FDE68A'
          : '#0F172A'
        : theme.colors.text,
      fontWeight: options?.fancyActive ? ('500' as const) : ('400' as const),
    },
    blockquote: {
      borderLeftWidth: 3,
      borderLeftColor: theme.colors.primary,
      paddingLeft: 10,
      paddingVertical: 4,
      marginVertical: 6,
      backgroundColor: theme.dark
        ? 'rgba(255, 255, 255, 0.04)'
        : 'rgba(15, 23, 42, 0.04)',
      borderRadius: 6,
    },
    mark: {
      backgroundColor: theme.dark
        ? 'rgba(250, 204, 21, 0.25)'
        : 'rgba(250, 204, 21, 0.45)',
      color: theme.colors.text,
      paddingHorizontal: 4,
      borderRadius: 4,
    },
    kbd: {
      fontFamily: 'Courier',
      fontSize: Math.max(11, baseFontSize - 3),
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: 4,
      paddingHorizontal: 5,
      paddingVertical: 2,
    },
    hr: {
      height: 1,
      backgroundColor: theme.dark
        ? 'rgba(255, 255, 255, 0.14)'
        : 'rgba(15, 23, 42, 0.12)',
      marginVertical: 10,
    },
    code: {
      fontFamily: 'Courier',
      backgroundColor: theme.colors.surface,
      padding: 4,
      borderRadius: 4,
      color: theme.colors.onSurface,
      fontSize: Math.max(11, baseFontSize - 3),
      whiteSpace: 'pre' as const,
    },
    pre: {
      backgroundColor: theme.colors.surface,
      padding: 8,
      borderRadius: 6,
      marginVertical: 8,
      color: theme.colors.onPrimaryContainer,
      fontFamily: 'Courier',
      fontSize: Math.max(12, baseFontSize - 2),
      whiteSpace: 'pre' as const,
    },
    thinking: {
      color: theme.colors.thinkingBubbleText,
      fontSize: Math.max(12, baseFontSize - 2),
      lineHeight: 20,
      fontFamily:
        '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    },
    think: {
      color: theme.colors.thinkingBubbleText,
      fontSize: Math.max(12, baseFontSize - 2),
      lineHeight: 20,
      fontFamily:
        '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    },
    thought: {
      color: theme.colors.thinkingBubbleText,
      fontSize: Math.max(12, baseFontSize - 2),
      lineHeight: 20,
      fontFamily:
        '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    },
  };

  if (options?.customCss && options.customCss.trim()) {
    const parsed = parseCustomCss(options.customCss);
    for (const [tag, rules] of Object.entries(parsed.tagsStyles)) {
      baseStyles[tag] = {
        ...(baseStyles[tag] || {}),
        ...rules,
      };
    }
  }

  return baseStyles;
};

export const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
    },
    markdownContainer: {
      // Dynamic maxWidth will be applied via style prop
    },
    codeHighlighterText: {
      fontFamily: 'Courier',
    },
    codeHighlighterScrollContent: {
      backgroundColor: theme.colors.surface,
      padding: 8,
      borderRadius: 6,
      marginTop: 4,
    },
  });
