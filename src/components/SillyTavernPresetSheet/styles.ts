import {StyleSheet} from 'react-native';
import {Theme} from '../../utils/types';
import {fontStyles} from '../../utils/theme';

export const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      paddingHorizontal: 16,
      paddingVertical: 10,
      gap: 14,
    },
    tabSection: {
      gap: 10,
    },
    tabsContainer: {
      flexDirection: 'row',
      backgroundColor: theme.dark ? '#141416' : '#F1F2F4',
      borderRadius: 10,
      padding: 3,
      marginBottom: 4,
    },
    tabButton: {
      flex: 1,
      paddingVertical: 7,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 8,
    },
    tabButtonActive: {
      backgroundColor: theme.dark ? '#27272A' : '#FFFFFF',
      shadowColor: '#000',
      shadowOffset: {width: 0, height: 1},
      shadowOpacity: theme.dark ? 0.25 : 0.08,
      shadowRadius: 2,
      elevation: 1,
    },
    tabButtonText: {
      ...fontStyles.medium,
      fontSize: 12,
      color: theme.colors.onSurfaceVariant,
    },
    tabButtonTextActive: {
      ...fontStyles.semibold,
      color: theme.colors.onSurface,
    },
    sectionTitle: {
      ...fontStyles.semibold,
      fontSize: 14,
      color: theme.colors.onSurface,
      marginTop: 4,
    },
    description: {
      ...fontStyles.regular,
      fontSize: 13,
      color: theme.colors.onSurfaceVariant,
      lineHeight: 18,
    },
    presetCard: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 12,
      borderRadius: 12,
      backgroundColor: theme.dark ? '#121214' : '#F8F9FA',
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.border,
      marginBottom: 6,
    },
    presetCardActive: {
      borderColor: theme.colors.primary,
      backgroundColor: theme.dark ? '#18181B' : '#F1F3F5',
    },
    presetTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    presetName: {
      ...fontStyles.semibold,
      fontSize: 14,
      color: theme.colors.onSurface,
    },
    activeBadge: {
      paddingHorizontal: 7,
      paddingVertical: 2,
      borderRadius: 6,
      backgroundColor: theme.colors.btnReadyBg,
    },
    activeBadgeText: {
      ...fontStyles.medium,
      fontSize: 10,
      color: theme.colors.btnReadyText,
    },
    presetDesc: {
      ...fontStyles.regular,
      fontSize: 12,
      color: theme.colors.onSurfaceVariant,
      marginTop: 3,
    },
    actionRow: {
      flexDirection: 'row',
      gap: 8,
      marginVertical: 4,
    },
    actionButton: {
      flex: 1,
    },
    promptItem: {
      padding: 12,
      borderRadius: 10,
      backgroundColor: theme.dark ? '#121214' : '#F8F9FA',
      marginBottom: 6,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.border,
    },
    promptItemHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    promptItemName: {
      ...fontStyles.semibold,
      fontSize: 13,
      color: theme.colors.onSurface,
    },
    promptItemRole: {
      ...fontStyles.medium,
      fontSize: 11,
      color: theme.colors.onSurfaceVariant,
      marginTop: 2,
    },
    promptItemContent: {
      ...fontStyles.regular,
      fontSize: 12,
      color: theme.colors.onSurfaceVariant,
      marginTop: 6,
      lineHeight: 17,
    },
    sliderRow: {
      marginBottom: 6,
    },
    footerActions: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      width: '100%',
      gap: 12,
    },
  });
