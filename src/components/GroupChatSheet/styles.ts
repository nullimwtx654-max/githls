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
    description: {
      ...fontStyles.regular,
      fontSize: 13,
      color: theme.colors.onSurfaceVariant,
      lineHeight: 18,
    },
    sectionTitle: {
      ...fontStyles.semibold,
      fontSize: 14,
      color: theme.colors.onSurface,
      marginTop: 4,
    },
    strategyGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    strategyChip: {
      paddingHorizontal: 12,
      paddingVertical: 7,
      borderRadius: 10,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.border,
      backgroundColor: theme.dark ? '#141416' : '#F2F3F5',
    },
    strategyChipActive: {
      backgroundColor: theme.colors.primary,
      borderColor: theme.colors.primary,
    },
    strategyChipText: {
      ...fontStyles.medium,
      fontSize: 12,
      color: theme.colors.onSurfaceVariant,
    },
    strategyChipTextActive: {
      ...fontStyles.semibold,
      color: theme.colors.onPrimary,
    },
    palItem: {
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
    palItemSelected: {
      borderColor: theme.colors.primary,
      backgroundColor: theme.dark ? '#18181B' : '#F1F3F5',
    },
    palInfo: {
      flex: 1,
      paddingRight: 10,
    },
    palNameRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    palName: {
      ...fontStyles.semibold,
      fontSize: 14,
      color: theme.colors.onSurface,
    },
    palDesc: {
      ...fontStyles.regular,
      fontSize: 12,
      color: theme.colors.onSurfaceVariant,
      marginTop: 2,
    },
    badge: {
      paddingHorizontal: 7,
      paddingVertical: 2,
      borderRadius: 6,
      backgroundColor: theme.colors.btnReadyBg,
    },
    badgeText: {
      ...fontStyles.medium,
      fontSize: 10,
      color: theme.colors.btnReadyText,
    },
    mutedBadge: {
      paddingHorizontal: 7,
      paddingVertical: 2,
      borderRadius: 6,
      backgroundColor: theme.dark ? '#27272A' : '#E4E4E7',
    },
    mutedBadgeText: {
      ...fontStyles.medium,
      fontSize: 10,
      color: theme.colors.onSurfaceVariant,
    },
    palActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    muteBtn: {
      paddingHorizontal: 8,
      paddingVertical: 5,
      borderRadius: 8,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.border,
      backgroundColor: theme.dark ? '#1C1C1F' : '#FFFFFF',
    },
    muteBtnText: {
      ...fontStyles.medium,
      fontSize: 11,
      color: theme.colors.onSurface,
    },
    switchRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 8,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.colors.border,
    },
    switchLabel: {
      ...fontStyles.semibold,
      fontSize: 13,
      color: theme.colors.onSurface,
    },
    switchDesc: {
      ...fontStyles.regular,
      fontSize: 11,
      color: theme.colors.onSurfaceVariant,
      marginTop: 2,
    },
    footerActions: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      width: '100%',
      gap: 12,
    },
  });
