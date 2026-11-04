import {StyleSheet} from 'react-native';

import {Theme} from '../../utils/types';

export const createStyles = (theme: Theme) =>
  StyleSheet.create({
    sidebarContainer: {
      flex: 1,
      backgroundColor: theme.colors.surface,
    },
    divider: {
      marginHorizontal: 16,
      backgroundColor: theme.colors.onSurfaceVariant,
      height: StyleSheet.hairlineWidth,
      opacity: 0.15,
    },
    contentWrapper: {
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
    },
    sessionDrawerItem: {
      height: 40,
    },
    menuDrawerItem: {
      height: 44,
    },
    versionText: {
      color: theme.colors.onSurfaceVariant,
      opacity: 0.7,
      fontSize: 12,
      fontWeight: '500',
    },
    drawerSection: {
      marginTop: 10,
    },
    dateLabel: {
      paddingLeft: 16,
      paddingVertical: 8,
    },
    scrollViewContent: {
      flexGrow: 1,
      paddingBottom: 12,
    },
    mainContent: {
      flex: 1,
    },
    menu: {
      width: 170,
    },
    sessionItem: {
      position: 'relative',
    },
    sessionTouchable: {
      flex: 1,
    },
    // Selection mode styles
    selectionModeHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.colors.outline,
      backgroundColor: theme.colors.surface,
    },
    selectedCountText: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.onSurface,
      flex: 1,
      textAlign: 'center',
    },
    sessionItemContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      position: 'relative',
    },
    sessionCheckbox: {
      marginLeft: 8,
      marginRight: 4,
    },
    menuDivider: {
      marginVertical: 4,
    },
    // Header action buttons (export, delete icons)
    headerActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 16,
    },
    headerActionButton: {
      padding: 4,
    },
    headerActionButtonDisabled: {
      opacity: 0.4,
    },
    // Select all row
    selectAllRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 12,
      paddingHorizontal: 16,
      backgroundColor: theme.colors.surface,
    },
    selectAllCheckbox: {
      marginRight: 12,
    },
    selectAllText: {
      fontSize: 16,
      color: theme.colors.onSurface,
    },
    selectAllDivider: {
      backgroundColor: theme.colors.outline,
      opacity: 0.3,
    },

    // Pill shaped bottom import/export button
    pillFooterWrapper: {
      paddingHorizontal: 16,
      paddingTop: 8,
      paddingBottom: 8,
      backgroundColor: theme.colors.surface,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.dark
        ? 'rgba(255, 255, 255, 0.08)'
        : 'rgba(0, 0, 0, 0.06)',
    },
    pillContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      borderRadius: 21,
      backgroundColor: theme.dark ? '#1A1A1E' : '#F2F3F5',
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.dark
        ? 'rgba(255, 255, 255, 0.12)'
        : 'rgba(0, 0, 0, 0.08)',
      overflow: 'hidden',
      height: 40,
    },
    pillHalfButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100%',
      gap: 6,
    },
    pillDivider: {
      width: StyleSheet.hairlineWidth,
      height: 20,
      backgroundColor: theme.dark
        ? 'rgba(255, 255, 255, 0.14)'
        : 'rgba(0, 0, 0, 0.12)',
    },
    pillButtonText: {
      fontFamily: 'Inter-Medium',
      fontSize: 13,
      lineHeight: 18,
      fontWeight: '500',
      color: theme.colors.onSurface,
    },

    // Chat mode segment (Normal vs PalsHub)
    chatModeSegmentContainer: {
      flexDirection: 'row',
      marginHorizontal: 16,
      marginTop: 10,
      marginBottom: 4,
      backgroundColor: theme.dark ? '#18181B' : '#EFEFF1',
      borderRadius: 10,
      padding: 3,
    },
    chatModeSegmentTab: {
      flex: 1,
      paddingVertical: 6,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 8,
    },
    chatModeSegmentTabActive: {
      backgroundColor: theme.dark ? '#2A2A2E' : '#FFFFFF',
    },
    chatModeSegmentText: {
      fontFamily: 'Inter-Medium',
      fontSize: 12,
      lineHeight: 16,
      fontWeight: '500',
      color: theme.colors.onSurfaceVariant,
    },
    chatModeSegmentTextActive: {
      fontFamily: 'Inter-SemiBold',
      fontWeight: '600',
      color: theme.colors.onSurface,
    },
  });
