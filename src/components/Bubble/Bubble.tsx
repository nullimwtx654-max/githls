import type {ReactNode} from 'react';
import React, {useContext} from 'react';
import {Animated, ViewStyle} from 'react-native';
import {observer} from 'mobx-react';

import {useTheme} from '../../hooks';
import {chatSessionStore, uiStore} from '../../store';
import {parseCustomCss} from '../../utils/customCssEngine';
import {styles} from './styles';

import {UserContext} from '../../utils';
import {MessageType} from '../../utils/types';

export function resolveFancyTintColors(
  isDark: boolean,
  currentUserIsAuthor: boolean,
  opacity: number,
  tint: string,
  palAccent?: string,
): {bg: string; border: string; glowColor: string} {
  const alpha = Math.max(0.1, Math.min(0.98, opacity));
  const aiAlpha = Math.max(0.1, Math.min(0.98, opacity - 0.05));

  switch (tint) {
    case 'frost_blue':
      return {
        bg: currentUserIsAuthor
          ? isDark
            ? `rgba(14, 74, 126, ${alpha})`
            : `rgba(219, 234, 254, ${alpha})`
          : isDark
          ? `rgba(11, 22, 40, ${aiAlpha})`
          : `rgba(248, 251, 255, ${aiAlpha})`,
        border: isDark ? '125, 211, 252' : '2, 132, 199',
        glowColor: '#38BDF8',
      };

    case 'rose_quartz':
      return {
        bg: currentUserIsAuthor
          ? isDark
            ? `rgba(112, 26, 87, ${alpha})`
            : `rgba(252, 231, 243, ${alpha})`
          : isDark
          ? `rgba(28, 12, 24, ${aiAlpha})`
          : `rgba(255, 250, 253, ${aiAlpha})`,
        border: isDark ? '244, 114, 182' : '219, 39, 119',
        glowColor: '#F472B6',
      };

    case 'violet_silk':
      return {
        bg: currentUserIsAuthor
          ? isDark
            ? `rgba(76, 29, 149, ${alpha})`
            : `rgba(237, 233, 254, ${alpha})`
          : isDark
          ? `rgba(19, 13, 38, ${aiAlpha})`
          : `rgba(251, 249, 255, ${aiAlpha})`,
        border: isDark ? '192, 132, 252' : '124, 58, 237',
        glowColor: '#A855F7',
      };

    case 'emerald_mist':
      return {
        bg: currentUserIsAuthor
          ? isDark
            ? `rgba(6, 95, 70, ${alpha})`
            : `rgba(209, 250, 229, ${alpha})`
          : isDark
          ? `rgba(10, 25, 20, ${aiAlpha})`
          : `rgba(247, 254, 250, ${aiAlpha})`,
        border: isDark ? '52, 211, 153' : '5, 150, 105',
        glowColor: '#10B981',
      };

    case 'amber_gold':
      return {
        bg: currentUserIsAuthor
          ? isDark
            ? `rgba(120, 53, 15, ${alpha})`
            : `rgba(254, 243, 199, ${alpha})`
          : isDark
          ? `rgba(26, 18, 10, ${aiAlpha})`
          : `rgba(255, 253, 246, ${aiAlpha})`,
        border: isDark ? '251, 191, 36' : '217, 119, 6',
        glowColor: '#F59E0B',
      };

    case 'obsidian':
      return {
        bg: currentUserIsAuthor
          ? isDark
            ? `rgba(32, 32, 38, ${alpha})`
            : `rgba(228, 228, 231, ${alpha})`
          : isDark
          ? `rgba(12, 12, 16, ${aiAlpha})`
          : `rgba(255, 255, 255, ${aiAlpha})`,
        border: isDark ? '255, 255, 255' : '24, 24, 27',
        glowColor: isDark ? '#FAFAFA' : '#18181B',
      };

    case 'pal_accent':
      if (palAccent && /^#[0-9a-fA-F]{6}$/.test(palAccent)) {
        const r = parseInt(palAccent.slice(1, 3), 16);
        const g = parseInt(palAccent.slice(3, 5), 16);
        const b = parseInt(palAccent.slice(5, 7), 16);
        return {
          bg: currentUserIsAuthor
            ? `rgba(${r}, ${g}, ${b}, ${isDark ? alpha * 0.6 : alpha * 0.35})`
            : isDark
            ? `rgba(18, 20, 28, ${aiAlpha})`
            : `rgba(255, 255, 255, ${aiAlpha})`,
          border: `${r}, ${g}, ${b}`,
          glowColor: palAccent,
        };
      }
      break;
  }

  // Default: Monochrome Frosted Glass (crisp in both Black/Dark and White/Light modes)
  return {
    bg: currentUserIsAuthor
      ? isDark
        ? `rgba(38, 43, 58, ${alpha})`
        : `rgba(226, 232, 240, ${alpha})`
      : isDark
      ? `rgba(16, 19, 28, ${aiAlpha})`
      : `rgba(255, 255, 255, ${aiAlpha})`,
    border: isDark ? '226, 232, 240' : '15, 23, 42',
    glowColor: isDark ? '#E2E8F0' : '#0F172A',
  };
}

/**
 * Pure shape primitive (border, background, scale animation). Chrome —
 * timing, copy, and any other turn-level slots — is owned by
 * `AssistantTurnFooter` rendered adjacent to the Bubble by `Message`.
 * Supports full Fancy Theme customization and Custom CSS overrides.
 */
export const Bubble = observer(
  ({
    child,
    message,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    nextMessageInGroup,
    scale = new Animated.Value(1),
  }: {
    child: ReactNode;
    message: MessageType.Any;
    nextMessageInGroup: boolean;
    scale?: Animated.Value;
  }) => {
    const theme = useTheme();
    const user = useContext(UserContext);
    const currentUserIsAuthor = user?.id === message.author.id;
    const hasActivePal = Boolean(
      chatSessionStore.activePalId || chatSessionStore.isGroupChat,
    );
    const isFancy = uiStore.isFancyActive(hasActivePal);

    const {contentContainer} = styles({
      currentUserIsAuthor,
      message,
      roundBorder: true,
      theme,
    });

    let fancyStyle: ViewStyle | null = null;
    if (isFancy) {
      const msgOpacity = uiStore.palsHubFancyMsgBgOpacity ?? 0.74;
      const borderOpacity = uiStore.palsHubFancyBorderOpacity ?? 0.16;
      const radius = uiStore.palsHubFancyBubbleRadius ?? 18;
      const padH = uiStore.palsHubFancyBubblePadding ?? 14;
      const glow = uiStore.palsHubFancyGlowIntensity ?? 0.15;
      const activePal = chatSessionStore.activePal;
      const palColor = activePal?.color?.[0];

      const {bg, border, glowColor} = resolveFancyTintColors(
        theme.dark,
        currentUserIsAuthor,
        msgOpacity,
        uiStore.palsHubFancyAccentTint || 'monochrome',
        palColor,
      );

      fancyStyle = {
        backgroundColor: bg,
        borderColor: `rgba(${border}, ${borderOpacity})`,
        borderWidth: borderOpacity > 0.01 ? 1 : 0,
        borderRadius: radius,
        ...(currentUserIsAuthor
          ? {borderBottomRightRadius: Math.max(4, Math.round(radius * 0.28))}
          : {
              borderBottomLeftRadius: Math.max(4, Math.round(radius * 0.28)),
              paddingHorizontal: padH,
              paddingVertical: 6,
            }),
        ...(glow > 0.02
          ? {
              shadowColor: glowColor,
              shadowOffset: {width: 0, height: 3},
              shadowOpacity: glow * (theme.dark ? 0.55 : 0.25),
              shadowRadius: Math.round(4 + glow * 10),
              elevation: Math.round(glow * 4),
            }
          : {}),
      };
    }

    let customCssStyle: ViewStyle | null = null;
    if (uiStore.customCssEnabled && uiStore.customCss.trim()) {
      const parsed = parseCustomCss(uiStore.customCss);
      const roleBubble = currentUserIsAuthor
        ? parsed.userBubble
        : parsed.aiBubble;
      if (
        Object.keys(parsed.bubbleCommon).length > 0 ||
        Object.keys(roleBubble).length > 0
      ) {
        customCssStyle = {
          ...parsed.bubbleCommon,
          ...roleBubble,
          ...(!currentUserIsAuthor &&
          (parsed.bubbleCommon.borderWidth ||
            roleBubble.borderWidth ||
            parsed.bubbleCommon.backgroundColor ||
            roleBubble.backgroundColor)
            ? {paddingHorizontal: 14, paddingVertical: 6}
            : {}),
        };
      }
    }

    return (
      <Animated.View
        testID={currentUserIsAuthor ? 'user-message' : 'ai-message'}
        style={[
          contentContainer,
          fancyStyle,
          customCssStyle,
          {transform: [{scale}]},
        ]}>
        {child}
      </Animated.View>
    );
  },
);
