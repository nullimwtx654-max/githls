import {StyleSheet} from 'react-native';

import {Theme} from '../../utils/types';
import {uiStore} from '../../store';

export const createStyles = (theme: Theme) => {
  const isFancy =
    uiStore.palsHubFancyTheme && uiStore.fancyThemeScope === 'everywhere';

  return StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    container: {
      padding: 16,
    },
    scrollViewContent: {
      paddingVertical: 16,
      paddingHorizontal: 16,
    },
    card: {
      marginVertical: 8,
      borderRadius: isFancy ? 16 : 12,
      backgroundColor: isFancy
        ? theme.dark
          ? 'rgba(22, 22, 30, 0.78)'
          : 'rgba(255, 255, 255, 0.84)'
        : theme.colors.surface,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.border,
    },
    settingItemContainer: {
      marginVertical: 16,
    },
    switchContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginVertical: 8,
    },
    textContainer: {
      flex: 1,
      marginRight: 16,
    },
    labelWithIconContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 4,
    },
    settingIcon: {
      marginRight: 8,
    },
    textLabel: {
      color: theme.colors.onSurface,
    },
    textDescription: {
      color: theme.colors.onSurfaceVariant,
    },
    divider: {
      marginVertical: 12,
    },
    slider: {},
    textInput: {
      marginVertical: 8,
    },
    invalidInput: {
      borderColor: theme.colors.error,
      borderWidth: 1,
    },
    errorText: {
      color: theme.colors.error,
      marginTop: 4,
    },
    menuContainer: {
      position: 'relative',
      flexShrink: 1,
      maxWidth: '55%',
    },
    menuButton: {
      minWidth: 100,
      maxWidth: '100%',
    },
    tierActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    inUseLabel: {
      color: theme.colors.primary,
    },
    fullRowControl: {
      marginTop: 8,
      alignSelf: 'flex-start',
      maxWidth: '100%',
    },
    consentContainer: {
      marginVertical: 8,
    },
    consentButton: {
      alignSelf: 'flex-end',
      marginTop: 12,
    },
    buttonContent: {
      flexDirection: 'row-reverse',
      justifyContent: 'space-between',
    },
    advancedSettingsButton: {
      marginVertical: 8,
    },
    advancedSettingsContent: {
      marginTop: 8,
    },
    advancedAccordion: {
      height: 55,
    },
    accordionTitle: {
      fontSize: 14,
      color: theme.colors.secondary,
    },
    menu: {
      minWidth: 170,
    },
    linkContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 4,
    },
    linkIcon: {
      marginLeft: 4,
    },
    segmentedButtons: {
      marginVertical: 8,
    },
  });
};
