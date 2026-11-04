import {StyleSheet} from 'react-native';
import {fontStyles} from '../../utils/theme';

export const createStyles = (colors: {
  background: string;
  border: string;
  text: string;
  accent: string;
  isDark?: boolean;
  isFancyTheme?: boolean;
}) =>
  StyleSheet.create({
    container: {
      marginVertical: 8,
      marginHorizontal: 16,
      paddingVertical: 12,
      paddingHorizontal: 14,
      borderRadius: 14,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.isFancyTheme
        ? colors.isDark
          ? 'rgba(255, 255, 255, 0.16)'
          : 'rgba(0, 0, 0, 0.08)'
        : colors.border,
      borderLeftWidth: 2,
      borderLeftColor: colors.accent,
      backgroundColor: colors.isFancyTheme
        ? colors.isDark
          ? 'rgba(20, 20, 24, 0.72)'
          : 'rgba(255, 255, 255, 0.78)'
        : colors.background,
      flexDirection: 'column',
      gap: 8,
    },
    topRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 10,
    },
    iconWrapper: {
      marginTop: 2,
      width: 18,
      height: 18,
      alignItems: 'center',
      justifyContent: 'center',
    },
    text: {
      flex: 1,
      ...fontStyles.regular,
      fontStyle: 'italic',
      fontSize: 14,
      lineHeight: 20,
      color: colors.text,
    },
    paginationRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'flex-end',
      gap: 8,
      paddingTop: 6,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.isFancyTheme
        ? colors.isDark
          ? 'rgba(255, 255, 255, 0.12)'
          : 'rgba(0, 0, 0, 0.06)'
        : colors.border,
    },
    pageButton: {
      width: 26,
      height: 24,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 6,
      backgroundColor: colors.isDark
        ? 'rgba(255, 255, 255, 0.08)'
        : 'rgba(0, 0, 0, 0.05)',
    },
    pageButtonDisabled: {
      opacity: 0.3,
    },
    pageIndicatorText: {
      ...fontStyles.medium,
      fontSize: 11,
      color: colors.text,
      minWidth: 32,
      textAlign: 'center',
    },
  });
