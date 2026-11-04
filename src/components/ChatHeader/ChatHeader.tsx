import React from 'react';
import {Platform, View} from 'react-native';
import {observer} from 'mobx-react';

import {createStyles} from './styles';
import {HeaderRight} from '../HeaderRight';
import {ChatHeaderTitle} from '../ChatHeaderTitle';
import {
  useSafeAreaFrame,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import {getDefaultHeaderHeight} from '@react-navigation/elements';
import {useTheme} from '../../hooks';
import {chatSessionStore, uiStore} from '../../store';
import {parseCustomCss} from '../../utils/customCssEngine';
import {HeaderLeft} from '../HeaderLeft';

export const ChatHeader: React.FC = observer(() => {
  const theme = useTheme();

  const insets = useSafeAreaInsets();
  const layout = useSafeAreaFrame();

  const hasDynamicIsland = Platform.OS === 'ios' && insets.top > 50;
  const statusBarHeight = hasDynamicIsland ? insets.top - 5 : insets.top;

  const headerHeight = getDefaultHeaderHeight(layout, false, statusBarHeight);

  const styles = createStyles({theme, insets, headerHeight});

  const headerStyle = chatSessionStore?.shouldShowHeaderDivider
    ? styles.headerWithDivider
    : styles.headerWithoutDivider;

  const hasActivePal = Boolean(
    chatSessionStore?.activePalId || chatSessionStore?.isGroupChat,
  );
  const isFancyThemeActive =
    uiStore.isFancyActive(hasActivePal) && uiStore.palsHubFancyHeaderTranslucent;

  const glassAlpha = uiStore.palsHubFancyGlassOpacity ?? 0.72;
  const fancyHeaderStyle = isFancyThemeActive
    ? {
        backgroundColor: theme.dark
          ? `rgba(14, 14, 16, ${glassAlpha})`
          : `rgba(249, 250, 251, ${Math.min(0.95, glassAlpha + 0.06)})`,
      }
    : null;

  const customHeaderStyle =
    uiStore.customCssEnabled && uiStore.customCss.trim()
      ? parseCustomCss(uiStore.customCss).chatHeader
      : null;

  return (
    <View
      testID="header-view"
      style={[
        styles.container,
        headerStyle,
        fancyHeaderStyle,
        customHeaderStyle,
      ]}>
      <View style={styles.leftSection}>
        <HeaderLeft />
        <ChatHeaderTitle />
      </View>
      <HeaderRight />
    </View>
  );
});
