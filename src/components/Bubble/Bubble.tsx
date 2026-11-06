import type {ReactNode} from 'react';
import React, {useContext} from 'react';
import {Animated, StyleSheet, ViewStyle} from 'react-native';
import {observer} from 'mobx-react';

import {useTheme} from '../../hooks';
import {chatSessionStore, uiStore} from '../../store';
import {parseCustomCss} from '../../utils/customCssEngine';
import {styles} from './styles';

import {UserContext} from '../../utils';
import {MessageType} from '../../utils/types';

function resolveFancyTintColors(
  isDark: boolean,
  currentUserIsAuthor: boolean,
  opacity: number,
  tint: string,
  palAccent?: string,
): {bg: string; border: string; glowColor: string} {
  const alpha = Math.max(0.1, Math.min(0.98, opacity));
  const aiAlpha = Math.max(0.1, Math.min(0.98, opacity - 0.06));

  if (tint === 'frost_blue') {
    return {
      bg: currentUserIsAuthor
        ? isDark
          ? `rgba(30, 58, 95, ${alpha})`
          : `rgba(219, 234, 254, ${alpha})`
        : isDark
        ? `rgba(15, 23, 42, ${aiAlpha})`
        : `rgba(248, 250, 252, ${aiAlpha})`,
      border: isDark ? '56, 189, 248' : '37, 99, 235',
      glowColor: '#38BDF8',
    };
  }

  if (tint === 'rose_quartz') {
    return {
      bg: currentUserIsAuthor
        ? isDark
          ? `rgba(76, 29, 59, ${alpha})`
          : `rgba(252, 231, 243, ${alpha})`
        : isDark
        ? `rgba(28, 18, 26, ${aiAlpha})`
        : `rgba(255, 250, 252, ${aiAlpha})`,
      border: isDark ? '244, 114, 182' : '219, 39, 119',
      glowColor: '#F472B6',
    };
  }

  if (tint === 'obsidian') {
    return {
      bg: currentUserIsAuthor
        ? isDark
          ? `rgba(18, 18, 22, ${alpha})`
          : `rgba(228, 228, 231, ${alpha})`
        : isDark
        ? `rgba(9, 9, 11, ${aiAlpha})`
        : `rgba(250, 250, 250, ${aiAlpha})`,
      border: isDark ? '255, 255, 255' : '0, 0, 0',
      glowColor: isDark ? '#FAFAFA' : '#18181B',
    };
  }

  if (tint === 'pal_accent' && palAccent && /^#[0-9a-fA-F]{6}$/.test(palAccent)) {
    const r = parseInt(palAccent.slice(1, 3), 16);
    const g = parseInt(palAccent.slice(3, 5), 16);
    const b = parseInt(palAccent.slice(5, 7), 16);
    return {
      bg: currentUserIsAuthor
        ? `rgba(${r}, ${g}, ${b}, ${isDark ? alpha * 0.55 : alpha * 0.35})`
        : isDark
        ? `rgba(20, 20, 24, ${aiAlpha})`
        : `rgba(255, 255, 255, ${aiAlpha})`,
      border: `${r}, ${g}, ${b}`,
      glowColor: palAccent,
    };
  }

  // Default: Monochrome Frosted Glass (crisp in both Black/Dark and White/Light modes)
  return {
    bg: currentUserIsAuthor
      ? isDark
        ? `rgba(36, 36, 40, ${alpha})`
        : `rgba(242, 243, 245, ${alpha})`
      : isDark
      ? `rgba(20, 20, 24, ${aiAlpha})`
      : `rgba(255, 255, 255, ${aiAlpha})`,
    border: isDark ? '255, 255, 255' : '0, 0, 0',
    glowColor: isDark ? '#FAFAFA' : '#09090B',
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
