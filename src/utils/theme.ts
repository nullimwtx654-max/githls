import {
  MD3DarkTheme,
  DefaultTheme as PaperLightTheme,
  configureFonts,
} from 'react-native-paper';

import {Theme} from './types';
import {
  type Mode,
  resolveTokens,
  resolveTypographyForLocale,
} from '../theme/tokens';
import {type AvailableLanguage} from '../locales';
import {withOpacity} from './colorUtils';

export const fontStyles = {
  regular: {fontFamily: 'Inter-Regular'},
  medium: {fontFamily: 'Inter-Medium'},
  bold: {fontFamily: 'Inter-Bold'},
  thin: {fontFamily: 'Inter-Thin'},
  light: {fontFamily: 'Inter-Light'},
  semibold: {fontFamily: 'Inter-SemiBold'},
  extraBold: {fontFamily: 'Inter-ExtraBold'},
};

const baseFontVariants = configureFonts({
  config: {...fontStyles.regular},
});

const customVariants = {
  bold: {
    ...baseFontVariants.bodyMedium,
    ...fontStyles.bold,
  },
  medium: {
    ...baseFontVariants.bodyMedium,
    ...fontStyles.medium,
  },
  thin: {
    ...baseFontVariants.bodyMedium,
    ...fontStyles.thin,
  },
  light: {
    ...baseFontVariants.bodyMedium,
    ...fontStyles.light,
  },
  semibold: {
    ...baseFontVariants.bodyMedium,
    ...fontStyles.semibold,
  },
} as const;

const configuredFonts = configureFonts({
  config: {
    ...baseFontVariants,
    ...customVariants,
    displayMedium: {
      ...baseFontVariants.displayMedium,
      ...fontStyles.bold,
    },
    titleSmall: {
      ...baseFontVariants.titleSmall,
      ...fontStyles.medium,
    },
  },
});

export interface FancyPaletteConfig {
  primary: string;
  onPrimary: string;
  primaryContainer: string;
  onPrimaryContainer: string;
  secondary: string;
  onSecondary: string;
  secondaryContainer: string;
  onSecondaryContainer: string;
  background: string;
  surface: string;
  surfaceVariant: string;
  onBackground: string;
  onSurface: string;
  onSurfaceVariant: string;
  outline: string;
  outlineVariant: string;
  border: string;
  menuBackground: string;
  authorBubbleBackground: string;
  gradientStops: [string, string, string, string];
  crossGradientStops: [string, string, string];
  gridStrokeColor: string;
}

/**
 * Resolves a cohesive Light or Dark palette and multi-stop silk gradient for the Fancy Theme.
 */
export const resolveFancyThemePalette = (
  mode: Mode,
  tint: string = 'monochrome',
): FancyPaletteConfig => {
  const isDark = mode === 'dark';

  switch (tint) {
    case 'frost_blue':
      return isDark
        ? {
            primary: '#7DD3FC',
            onPrimary: '#082F49',
            primaryContainer: '#0C4A6E',
            onPrimaryContainer: '#E0F2FE',
            secondary: '#38BDF8',
            onSecondary: '#082F49',
            secondaryContainer: '#1E293B',
            onSecondaryContainer: '#BAE6FD',
            background: '#070B14',
            surface: '#0D1526',
            surfaceVariant: '#162238',
            onBackground: '#F0F9FF',
            onSurface: '#E2E8F0',
            onSurfaceVariant: '#94A3B8',
            outline: 'rgba(125, 211, 252, 0.16)',
            outlineVariant: 'rgba(125, 211, 252, 0.24)',
            border: 'rgba(125, 211, 252, 0.14)',
            menuBackground: '#0F1A2E',
            authorBubbleBackground: '#132238',
            gradientStops: ['#050811', '#0B172A', '#0F2542', '#070D19'],
            crossGradientStops: [
              'rgba(56, 189, 248, 0.16)',
              'rgba(37, 99, 235, 0.06)',
              'rgba(14, 165, 233, 0.12)',
            ],
            gridStrokeColor: 'rgba(125, 211, 252, 0.07)',
          }
        : {
            primary: '#0284C7',
            onPrimary: '#FFFFFF',
            primaryContainer: '#E0F2FE',
            onPrimaryContainer: '#0C4A6E',
            secondary: '#2563EB',
            onSecondary: '#FFFFFF',
            secondaryContainer: '#DBEAFE',
            onSecondaryContainer: '#1E3A8A',
            background: '#F0F7FF',
            surface: '#F8FBFF',
            surfaceVariant: '#E0EFFE',
            onBackground: '#0C1928',
            onSurface: '#0F172A',
            onSurfaceVariant: '#475569',
            outline: 'rgba(2, 132, 199, 0.14)',
            outlineVariant: 'rgba(2, 132, 199, 0.25)',
            border: 'rgba(2, 132, 199, 0.12)',
            menuBackground: '#FFFFFF',
            authorBubbleBackground: '#E0F2FE',
            gradientStops: ['#F0F8FF', '#E0F2FE', '#DBEAFE', '#F5F9FF'],
            crossGradientStops: [
              'rgba(56, 189, 248, 0.18)',
              'rgba(255, 255, 255, 0.05)',
              'rgba(59, 130, 246, 0.14)',
            ],
            gridStrokeColor: 'rgba(2, 132, 199, 0.08)',
          };

    case 'rose_quartz':
      return isDark
        ? {
            primary: '#F472B6',
            onPrimary: '#4A044E',
            primaryContainer: '#701A75',
            onPrimaryContainer: '#FCE7F3',
            secondary: '#FB7185',
            onSecondary: '#4C0519',
            secondaryContainer: '#2D1224',
            onSecondaryContainer: '#FBCFE8',
            background: '#0E070C',
            surface: '#1A0E17',
            surfaceVariant: '#2A1625',
            onBackground: '#FDF2F8',
            onSurface: '#FCE7F3',
            onSurfaceVariant: '#D8B4C8',
            outline: 'rgba(244, 114, 182, 0.16)',
            outlineVariant: 'rgba(244, 114, 182, 0.25)',
            border: 'rgba(244, 114, 182, 0.14)',
            menuBackground: '#1F101B',
            authorBubbleBackground: '#281523',
            gradientStops: ['#0B050A', '#1B0C18', '#291224', '#10070E'],
            crossGradientStops: [
              'rgba(244, 114, 182, 0.15)',
              'rgba(192, 38, 211, 0.06)',
              'rgba(251, 113, 133, 0.12)',
            ],
            gridStrokeColor: 'rgba(244, 114, 182, 0.07)',
          }
        : {
            primary: '#DB2777',
            onPrimary: '#FFFFFF',
            primaryContainer: '#FCE7F3',
            onPrimaryContainer: '#831843',
            secondary: '#E11D48',
            onSecondary: '#FFFFFF',
            secondaryContainer: '#FFE4E6',
            onSecondaryContainer: '#881337',
            background: '#FFF5F9',
            surface: '#FFFBFD',
            surfaceVariant: '#FCE7F3',
            onBackground: '#1F0A14',
            onSurface: '#27101C',
            onSurfaceVariant: '#6B4C5B',
            outline: 'rgba(219, 39, 119, 0.14)',
            outlineVariant: 'rgba(219, 39, 119, 0.25)',
            border: 'rgba(219, 39, 119, 0.12)',
            menuBackground: '#FFFFFF',
            authorBubbleBackground: '#FCE7F3',
            gradientStops: ['#FFF7FA', '#FCE7F3', '#F5D0FE', '#FFF9FC'],
            crossGradientStops: [
              'rgba(244, 114, 182, 0.16)',
              'rgba(255, 255, 255, 0.05)',
              'rgba(251, 113, 133, 0.12)',
            ],
            gridStrokeColor: 'rgba(219, 39, 119, 0.07)',
          };

    case 'violet_silk':
      return isDark
        ? {
            primary: '#C084FC',
            onPrimary: '#2E1065',
            primaryContainer: '#4C1D95',
            onPrimaryContainer: '#F3E8FF',
            secondary: '#818CF8',
            onSecondary: '#1E1B4B',
            secondaryContainer: '#1E1B38',
            onSecondaryContainer: '#E0E7FF',
            background: '#090712',
            surface: '#120E22',
            surfaceVariant: '#1D1736',
            onBackground: '#F5F3FF',
            onSurface: '#EDE9FE',
            onSurfaceVariant: '#A79EC7',
            outline: 'rgba(192, 132, 252, 0.16)',
            outlineVariant: 'rgba(192, 132, 252, 0.25)',
            border: 'rgba(192, 132, 252, 0.14)',
            menuBackground: '#161129',
            authorBubbleBackground: '#1E1738',
            gradientStops: ['#070510', '#130D26', '#1F143D', '#0A0716'],
            crossGradientStops: [
              'rgba(168, 85, 247, 0.16)',
              'rgba(99, 102, 241, 0.07)',
              'rgba(217, 70, 239, 0.11)',
            ],
            gridStrokeColor: 'rgba(192, 132, 252, 0.07)',
          }
        : {
            primary: '#7C3AED',
            onPrimary: '#FFFFFF',
            primaryContainer: '#EDE9FE',
            onPrimaryContainer: '#4C1D95',
            secondary: '#4F46E5',
            onSecondary: '#FFFFFF',
            secondaryContainer: '#E0E7FF',
            onSecondaryContainer: '#312E81',
            background: '#F6F4FF',
            surface: '#FCFaff',
            surfaceVariant: '#EDE9FE',
            onBackground: '#170F2E',
            onSurface: '#1E1638',
            onSurfaceVariant: '#5B527A',
            outline: 'rgba(124, 58, 237, 0.14)',
            outlineVariant: 'rgba(124, 58, 237, 0.25)',
            border: 'rgba(124, 58, 237, 0.12)',
            menuBackground: '#FFFFFF',
            authorBubbleBackground: '#EDE9FE',
            gradientStops: ['#F8F6FF', '#EDE9FE', '#E0E7FF', '#FAF8FF'],
            crossGradientStops: [
              'rgba(168, 85, 247, 0.16)',
              'rgba(255, 255, 255, 0.05)',
              'rgba(99, 102, 241, 0.12)',
            ],
            gridStrokeColor: 'rgba(124, 58, 237, 0.07)',
          };

    case 'emerald_mist':
      return isDark
        ? {
            primary: '#34D399',
            onPrimary: '#064E3B',
            primaryContainer: '#065F46',
            onPrimaryContainer: '#D1FAE5',
            secondary: '#2DD4BF',
            onSecondary: '#134E4A',
            secondaryContainer: '#112A26',
            onSecondaryContainer: '#CCFBF1',
            background: '#060D0B',
            surface: '#0C1814',
            surfaceVariant: '#132821',
            onBackground: '#ECFDF5',
            onSurface: '#D1FAE5',
            onSurfaceVariant: '#86B3A3',
            outline: 'rgba(52, 211, 153, 0.16)',
            outlineVariant: 'rgba(52, 211, 153, 0.25)',
            border: 'rgba(52, 211, 153, 0.14)',
            menuBackground: '#0E1F1A',
            authorBubbleBackground: '#132A23',
            gradientStops: ['#040A08', '#0A1914', '#102920', '#060E0B'],
            crossGradientStops: [
              'rgba(52, 211, 153, 0.15)',
              'rgba(20, 184, 166, 0.06)',
              'rgba(16, 185, 129, 0.11)',
            ],
            gridStrokeColor: 'rgba(52, 211, 153, 0.07)',
          }
        : {
            primary: '#059669',
            onPrimary: '#FFFFFF',
            primaryContainer: '#D1FAE5',
            onPrimaryContainer: '#064E3B',
            secondary: '#0D9488',
            onSecondary: '#FFFFFF',
            secondaryContainer: '#CCFBF1',
            onSecondaryContainer: '#134E4A',
            background: '#F0FDF7',
            surface: '#F9FEFC',
            surfaceVariant: '#D1FAE5',
            onBackground: '#06241B',
            onSurface: '#0A2E23',
            onSurfaceVariant: '#466E60',
            outline: 'rgba(5, 150, 105, 0.14)',
            outlineVariant: 'rgba(5, 150, 105, 0.25)',
            border: 'rgba(5, 150, 105, 0.12)',
            menuBackground: '#FFFFFF',
            authorBubbleBackground: '#D1FAE5',
            gradientStops: ['#F2FDF8', '#D1FAE5', '#CCFBF1', '#F7FEFB'],
            crossGradientStops: [
              'rgba(16, 185, 129, 0.15)',
              'rgba(255, 255, 255, 0.05)',
              'rgba(20, 184, 166, 0.12)',
            ],
            gridStrokeColor: 'rgba(5, 150, 105, 0.07)',
          };

    case 'amber_gold':
      return isDark
        ? {
            primary: '#FBBF24',
            onPrimary: '#451A03',
            primaryContainer: '#78350F',
            onPrimaryContainer: '#FEF3C7',
            secondary: '#F59E0B',
            onSecondary: '#451A03',
            secondaryContainer: '#291B0E',
            onSecondaryContainer: '#FDE68A',
            background: '#0E0A06',
            surface: '#1A130B',
            surfaceVariant: '#291E12',
            onBackground: '#FFFBEB',
            onSurface: '#FEF3C7',
            onSurfaceVariant: '#C7B293',
            outline: 'rgba(251, 191, 36, 0.16)',
            outlineVariant: 'rgba(251, 191, 36, 0.25)',
            border: 'rgba(251, 191, 36, 0.14)',
            menuBackground: '#1F170D',
            authorBubbleBackground: '#291E11',
            gradientStops: ['#0A0704', '#181109', '#261A0D', '#0D0905'],
            crossGradientStops: [
              'rgba(245, 158, 11, 0.15)',
              'rgba(217, 119, 6, 0.06)',
              'rgba(251, 191, 36, 0.11)',
            ],
            gridStrokeColor: 'rgba(251, 191, 36, 0.07)',
          }
        : {
            primary: '#D97706',
            onPrimary: '#FFFFFF',
            primaryContainer: '#FEF3C7',
            onPrimaryContainer: '#78350F',
            secondary: '#B45309',
            onSecondary: '#FFFFFF',
            secondaryContainer: '#FDE68A',
            onSecondaryContainer: '#78350F',
            background: '#FFFDF5',
            surface: '#FFFEFA',
            surfaceVariant: '#FEF3C7',
            onBackground: '#261707',
            onSurface: '#2E1C09',
            onSurfaceVariant: '#6E5A44',
            outline: 'rgba(217, 119, 6, 0.14)',
            outlineVariant: 'rgba(217, 119, 6, 0.25)',
            border: 'rgba(217, 119, 6, 0.12)',
            menuBackground: '#FFFFFF',
            authorBubbleBackground: '#FEF3C7',
            gradientStops: ['#FFFDF7', '#FEF3C7', '#FDE68A', '#FFFEFA'],
            crossGradientStops: [
              'rgba(245, 158, 11, 0.15)',
              'rgba(255, 255, 255, 0.05)',
              'rgba(217, 119, 6, 0.11)',
            ],
            gridStrokeColor: 'rgba(217, 119, 6, 0.07)',
          };

    case 'obsidian':
      return isDark
        ? {
            primary: '#F4F4F5',
            onPrimary: '#09090B',
            primaryContainer: '#27272A',
            onPrimaryContainer: '#FAFAFA',
            secondary: '#A1A1AA',
            onSecondary: '#09090B',
            secondaryContainer: '#18181B',
            onSecondaryContainer: '#E4E4E7',
            background: '#050507',
            surface: '#0C0C0F',
            surfaceVariant: '#18181D',
            onBackground: '#FAFAFA',
            onSurface: '#F4F4F5',
            onSurfaceVariant: '#A1A1AA',
            outline: 'rgba(255, 255, 255, 0.12)',
            outlineVariant: 'rgba(255, 255, 255, 0.20)',
            border: 'rgba(255, 255, 255, 0.10)',
            menuBackground: '#121216',
            authorBubbleBackground: '#18181D',
            gradientStops: ['#030305', '#0A0A0E', '#121218', '#060609'],
            crossGradientStops: [
              'rgba(255, 255, 255, 0.06)',
              'rgba(161, 161, 170, 0.03)',
              'rgba(255, 255, 255, 0.05)',
            ],
            gridStrokeColor: 'rgba(255, 255, 255, 0.05)',
          }
        : {
            primary: '#18181B',
            onPrimary: '#FAFAFA',
            primaryContainer: '#E4E4E7',
            onPrimaryContainer: '#09090B',
            secondary: '#3F3F46',
            onSecondary: '#FFFFFF',
            secondaryContainer: '#F4F4F5',
            onSecondaryContainer: '#18181B',
            background: '#F4F4F6',
            surface: '#FFFFFF',
            surfaceVariant: '#E4E4E7',
            onBackground: '#09090B',
            onSurface: '#18181B',
            onSurfaceVariant: '#52525B',
            outline: 'rgba(24, 24, 27, 0.12)',
            outlineVariant: 'rgba(24, 24, 27, 0.22)',
            border: 'rgba(24, 24, 27, 0.10)',
            menuBackground: '#FFFFFF',
            authorBubbleBackground: '#E4E4E7',
            gradientStops: ['#FAFAFC', '#F4F4F6', '#E4E4E7', '#F8F8FA'],
            crossGradientStops: [
              'rgba(24, 24, 27, 0.05)',
              'rgba(255, 255, 255, 0.08)',
              'rgba(63, 63, 70, 0.05)',
            ],
            gridStrokeColor: 'rgba(24, 24, 27, 0.06)',
          };

    case 'monochrome':
    case 'pal_accent':
    default:
      return isDark
        ? {
            primary: '#E2E8F0',
            onPrimary: '#0F172A',
            primaryContainer: '#1E293B',
            onPrimaryContainer: '#F1F5F9',
            secondary: '#94A3B8',
            onSecondary: '#0F172A',
            secondaryContainer: '#1E2430',
            onSecondaryContainer: '#E2E8F0',
            background: '#080A10',
            surface: '#10131C',
            surfaceVariant: '#1A1F2E',
            onBackground: '#F8FAFC',
            onSurface: '#F1F5F9',
            onSurfaceVariant: '#94A3B8',
            outline: 'rgba(226, 232, 240, 0.14)',
            outlineVariant: 'rgba(226, 232, 240, 0.22)',
            border: 'rgba(226, 232, 240, 0.11)',
            menuBackground: '#141824',
            authorBubbleBackground: '#181D2A',
            gradientStops: ['#06080D', '#0D121C', '#141C2B', '#090C14'],
            crossGradientStops: [
              'rgba(148, 163, 184, 0.10)',
              'rgba(99, 102, 241, 0.05)',
              'rgba(56, 189, 248, 0.08)',
            ],
            gridStrokeColor: 'rgba(226, 232, 240, 0.06)',
          }
        : {
            primary: '#1E293B',
            onPrimary: '#FFFFFF',
            primaryContainer: '#E2E8F0',
            onPrimaryContainer: '#0F172A',
            secondary: '#334155',
            onSecondary: '#FFFFFF',
            secondaryContainer: '#F1F5F9',
            onSecondaryContainer: '#1E293B',
            background: '#F4F6FA',
            surface: '#FFFFFF',
            surfaceVariant: '#E2E8F0',
            onBackground: '#0F172A',
            onSurface: '#1E293B',
            onSurfaceVariant: '#475569',
            outline: 'rgba(15, 23, 42, 0.12)',
            outlineVariant: 'rgba(15, 23, 42, 0.22)',
            border: 'rgba(15, 23, 42, 0.09)',
            menuBackground: '#FFFFFF',
            authorBubbleBackground: '#E2E8F0',
            gradientStops: ['#F8FAFC', '#EEF2F7', '#E2E8F0', '#F4F6FA'],
            crossGradientStops: [
              'rgba(100, 116, 139, 0.10)',
              'rgba(255, 255, 255, 0.08)',
              'rgba(59, 130, 246, 0.07)',
            ],
            gridStrokeColor: 'rgba(15, 23, 42, 0.06)',
          };
  }
};

export const buildTheme = ({
  mode,
  language,
  fancyActive = false,
  fancyTint = 'monochrome',
  fancyBubbleRadius = 18,
}: {
  mode: Mode;
  language: AvailableLanguage;
  fancyActive?: boolean;
  fancyTint?: string;
  fancyBubbleRadius?: number;
}): Theme => {
  const baseTheme = mode === 'dark' ? MD3DarkTheme : PaperLightTheme;
  const tokens = resolveTokens(mode);
  const localeTypography = resolveTypographyForLocale(language);

  const fancyPalette = fancyActive
    ? resolveFancyThemePalette(mode, fancyTint)
    : null;

  const resolvedColors = fancyPalette
    ? {
        ...baseTheme.colors,
        ...tokens.colors,
        primary: fancyPalette.primary,
        onPrimary: fancyPalette.onPrimary,
        primaryContainer: fancyPalette.primaryContainer,
        onPrimaryContainer: fancyPalette.onPrimaryContainer,
        secondary: fancyPalette.secondary,
        onSecondary: fancyPalette.onSecondary,
        secondaryContainer: fancyPalette.secondaryContainer,
        onSecondaryContainer: fancyPalette.onSecondaryContainer,
        background: fancyPalette.background,
        onBackground: fancyPalette.onBackground,
        surface: fancyPalette.surface,
        onSurface: fancyPalette.onSurface,
        surfaceVariant: fancyPalette.surfaceVariant,
        onSurfaceVariant: fancyPalette.onSurfaceVariant,
        outline: fancyPalette.outline,
        outlineVariant: fancyPalette.outlineVariant,
        border: fancyPalette.border,
        text: fancyPalette.onBackground,
        textSecondary: withOpacity(fancyPalette.onSurface, 0.65),
        menuBackground: fancyPalette.menuBackground,
        authorBubbleBackground: fancyPalette.authorBubbleBackground,
        surfaceContainerHighest: withOpacity(fancyPalette.primary, 0.12),
        surfaceContainerHigh: withOpacity(fancyPalette.primary, 0.09),
        surfaceContainer: withOpacity(fancyPalette.primary, 0.06),
        surfaceContainerLow: withOpacity(fancyPalette.primary, 0.04),
        surfaceContainerLowest: fancyPalette.surface,
      }
    : {
        ...baseTheme.colors,
        ...tokens.colors,
      };

  return {
    ...baseTheme,
    colors: resolvedColors,
    borders: {
      inputBorderRadius: fancyActive
        ? Math.max(14, Math.min(26, fancyBubbleRadius))
        : 16,
      messageBorderRadius: fancyActive ? fancyBubbleRadius : 15,
      default: fancyActive
        ? Math.max(10, Math.min(22, Math.round(fancyBubbleRadius * 0.78)))
        : 12,
    },
    fonts: {
      ...baseTheme.fonts,
      ...configuredFonts,
      titleMediumLight: {
        ...fontStyles.regular,
        fontSize: 16,
        lineHeight: 22,
      },
      dateDividerTextStyle: {
        ...fontStyles.extraBold,
        color: resolvedColors.onSurface,
        fontSize: 12,
        lineHeight: 16,
        opacity: 0.4,
      },
      emptyChatPlaceholderTextStyle: {
        color: resolvedColors.onSurface,
        fontSize: 16,
        lineHeight: 24,
        ...fontStyles.medium,
      },
      inputTextStyle: {
        fontSize: 16,
        lineHeight: 24,
        ...fontStyles.medium,
      },
      receivedMessageBodyTextStyle: {
        color: resolvedColors.onPrimary,
        fontSize: 16,
        lineHeight: 24,
        ...fontStyles.medium,
      },
      receivedMessageCaptionTextStyle: {
        color: resolvedColors.onSurfaceVariant,
        fontSize: 12,
        lineHeight: 16,
        ...fontStyles.medium,
      },
      receivedMessageLinkDescriptionTextStyle: {
        color: resolvedColors.onPrimary,
        fontSize: 14,
        lineHeight: 20,
        ...fontStyles.regular,
      },
      receivedMessageLinkTitleTextStyle: {
        color: resolvedColors.onPrimary,
        fontSize: 16,
        lineHeight: 22,
        ...fontStyles.extraBold,
      },
      sentMessageBodyTextStyle: {
        color: resolvedColors.onSurface,
        fontSize: 16,
        lineHeight: 24,
        ...fontStyles.medium,
      },
      sentMessageCaptionTextStyle: {
        color: resolvedColors.onSurfaceVariant,
        fontSize: 12,
        lineHeight: 16,
        ...fontStyles.medium,
      },
      sentMessageLinkDescriptionTextStyle: {
        color: resolvedColors.onSurface,
        fontSize: 14,
        lineHeight: 20,
        ...fontStyles.regular,
      },
      sentMessageLinkTitleTextStyle: {
        color: resolvedColors.onSurface,
        fontSize: 16,
        lineHeight: 22,
        ...fontStyles.extraBold,
      },
      userAvatarTextStyle: {
        color: resolvedColors.onSurface,
        fontSize: 12,
        lineHeight: 16,
        ...fontStyles.extraBold,
      },
      userNameTextStyle: {
        fontSize: 12,
        lineHeight: 16,
        ...fontStyles.extraBold,
      },
    },
    insets: {
      messageInsetsHorizontal: 20,
      messageInsetsVertical: 10,
    },
    spacing: {
      ...tokens.spacing,
      default: 16,
    },
    radius: tokens.radius,
    stroke: tokens.stroke,
    typography: localeTypography,
    icons: {},
  };
};

export const lightTheme = buildTheme({mode: 'light', language: 'en'});
export const darkTheme = buildTheme({mode: 'dark', language: 'en'});
