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
      lineHeight: 19,
    },
    providerSelectorRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginVertical: 2,
    },
    providerChip: {
      paddingHorizontal: 12,
      paddingVertical: 7,
      borderRadius: 10,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.border,
      backgroundColor: theme.dark ? '#141416' : '#F2F3F5',
    },
    providerChipActive: {
      backgroundColor: theme.colors.primary,
      borderColor: theme.colors.primary,
    },
    providerChipText: {
      ...fontStyles.medium,
      fontSize: 13,
      color: theme.colors.onSurfaceVariant,
    },
    providerChipTextActive: {
      ...fontStyles.semibold,
      color: theme.colors.onPrimary,
    },
    inputSection: {
      gap: 12,
    },
    label: {
      ...fontStyles.semibold,
      fontSize: 13,
      color: theme.colors.onSurface,
    },
    modelSelectContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 6,
      marginTop: 2,
    },
    modelChip: {
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 8,
      backgroundColor: theme.dark ? '#141416' : '#F2F3F5',
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.border,
    },
    modelChipActive: {
      backgroundColor: theme.dark ? '#27272A' : '#E4E4E7',
      borderColor: theme.colors.primary,
    },
    modelChipText: {
      ...fontStyles.regular,
      fontSize: 12,
      color: theme.colors.onSurfaceVariant,
    },
    modelChipTextActive: {
      ...fontStyles.semibold,
      color: theme.colors.onSurface,
    },
    buttonsContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      width: '100%',
      gap: 12,
    },
    rightButtons: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginLeft: 'auto',
    },
    saveButton: {
      minWidth: 120,
    },
    clearButton: {
      minWidth: 80,
    },
    errorSnackbar: {
      backgroundColor: theme.colors.errorContainer,
    },
    statusBadge: {
      alignSelf: 'flex-start',
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 8,
      ...fontStyles.medium,
      fontSize: 11,
      overflow: 'hidden',
    },
    statusConfigured: {
      backgroundColor: theme.colors.btnReadyBg,
      color: theme.colors.btnReadyText,
    },
    statusNotConfigured: {
      backgroundColor: theme.dark ? '#1F1F23' : '#F1F2F4',
      color: theme.colors.onSurfaceVariant,
    },
  });
