import React, {useMemo} from 'react';
import {Text, View, TouchableOpacity, Image} from 'react-native';
import {observer} from 'mobx-react';

import {useTheme} from '../../hooks';
import {chatSessionStore, sillyTavernPresetStore, uiStore} from '../../store';
import {parseCustomCss} from '../../utils/customCssEngine';
import {getFullThumbnailUri} from '../../utils/imageUtils';
import {applySillyTavernRegexScripts} from '../../utils/sillyTavernPresetEngine';
import {
  ChevronLeftSmIcon,
  ChevronRightSmIcon,
  SparkleIcon,
} from '../../assets/icons';
import {createStyles} from './styles';

interface GreetingBubbleProps {
  text: string;
  allGreetings?: string[];
  currentIndex?: number;
  onSelectIndex?: (index: number) => void;
}

/**
 * Non-persistent greeting rendered as a chat header for empty sessions.
 * Displays the Character's circular PFP avatar and name badge in Fancy Theme / Roleplay mode,
 * supports cycling through alternate_greetings, and runs display Regex scripts.
 */
export const GreetingBubble: React.FC<GreetingBubbleProps> = observer(
  ({text, allGreetings = [], currentIndex = 0, onSelectIndex}) => {
    const theme = useTheme();
    const activePal = chatSessionStore.activePal;
    const hasActivePal = Boolean(
      activePal || chatSessionStore.activePalId || chatSessionStore.isGroupChat,
    );
    const isFancy = uiStore.isFancyActive(hasActivePal);
    const msgOpacity = uiStore.palsHubFancyMsgBgOpacity ?? 0.74;
    const msgSize = isFancy ? uiStore.palsHubFancyMsgSize ?? 16.5 : 14;
    const bubbleRadius = isFancy ? uiStore.palsHubFancyBubbleRadius ?? 18 : 14;
    const bubblePadding = isFancy
      ? uiStore.palsHubFancyBubblePadding ?? 15
      : 14;

    const styles = useMemo(
      () =>
        createStyles({
          background: theme.colors.surface,
          border: theme.colors.border,
          text: theme.colors.onSurfaceVariant,
          accent: theme.colors.primary,
          isDark: theme.dark,
          isFancyTheme: isFancy,
        }),
      [theme, isFancy],
    );

    const parsedCss = useMemo(() => {
      if (!uiStore.customCssEnabled || !uiStore.customCss.trim()) {
        return null;
      }
      return parseCustomCss(uiStore.customCss);
    }, [uiStore.customCssEnabled, uiStore.customCss]);

    const avatarUri = useMemo(() => {
      if (!activePal?.thumbnail_url) {
        return undefined;
      }
      return getFullThumbnailUri(activePal.thumbnail_url);
    }, [activePal?.thumbnail_url]);

    const fancyOverride = isFancy
      ? {
          backgroundColor: theme.dark
            ? `rgba(20, 20, 24, ${msgOpacity})`
            : `rgba(255, 255, 255, ${msgOpacity})`,
          borderRadius: bubbleRadius,
          paddingHorizontal: bubblePadding,
          paddingVertical: Math.max(10, Math.round(bubblePadding * 0.85)),
        }
      : null;

    const totalGreetings = Math.max(allGreetings.length, 1);
    const rawDisplayText =
      allGreetings.length > 0 && allGreetings[currentIndex]
        ? allGreetings[currentIndex]
        : text;

    const displayText = useMemo(() => {
      const scripts = sillyTavernPresetStore.activePreset?.regex_scripts;
      if (!scripts || scripts.length === 0) {
        return rawDisplayText;
      }
      return applySillyTavernRegexScripts(rawDisplayText, scripts, {
        placement: 2,
        depth: 0,
        isMarkdownRender: true,
      });
    }, [rawDisplayText, sillyTavernPresetStore.activePreset?.regex_scripts]);

    const handlePrev = () => {
      if (!onSelectIndex || currentIndex <= 0) {
        return;
      }
      onSelectIndex(currentIndex - 1);
    };

    const handleNext = () => {
      if (!onSelectIndex || currentIndex >= totalGreetings - 1) {
        return;
      }
      onSelectIndex(currentIndex + 1);
    };

    const showCharacterHeader = Boolean(
      activePal && (!isFancy || uiStore.palsHubFancyShowAvatars),
    );

    return (
      <View
        style={[
          styles.container,
          fancyOverride,
          parsedCss?.greetingBubble,
          parsedCss?.aiBubble,
        ]}
        testID="greeting-bubble">
        {showCharacterHeader && (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              marginBottom: 8,
            }}>
            {avatarUri ? (
              <Image
                source={{uri: avatarUri}}
                resizeMode="cover"
                style={[
                  {
                    width: 34,
                    height: 34,
                    borderRadius: 17,
                    marginRight: 9,
                    borderWidth: 1.5,
                    borderColor: theme.dark
                      ? 'rgba(255,255,255,0.28)'
                      : 'rgba(15,23,42,0.16)',
                  },
                  parsedCss?.avatar,
                ]}
              />
            ) : (
              <View
                style={[
                  {
                    width: 34,
                    height: 34,
                    borderRadius: 17,
                    marginRight: 9,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: theme.colors.primary,
                  },
                  parsedCss?.avatar,
                ]}>
                <Text style={{color: '#FFF', fontSize: 13, fontWeight: '700'}}>
                  {(activePal?.name || 'AI').slice(0, 2).toUpperCase()}
                </Text>
              </View>
            )}
            <View style={{flex: 1}}>
              <Text
                style={{
                  fontSize: 13.5,
                  fontWeight: '700',
                  color: theme.dark ? '#F8FAFC' : '#0F172A',
                }}>
                {activePal?.name}
              </Text>
              <Text
                style={{
                  fontSize: 11,
                  color: theme.dark
                    ? 'rgba(255,255,255,0.55)'
                    : 'rgba(15,23,42,0.55)',
                }}>
                Character Greeting
              </Text>
            </View>
          </View>
        )}

        <View style={styles.topRow}>
          {!showCharacterHeader && (
            <View style={styles.iconWrapper}>
              <SparkleIcon width={16} height={16} fill={theme.colors.primary} />
            </View>
          )}
          <Text
            style={[
              styles.text,
              isFancy && {
                fontSize: msgSize,
                lineHeight: Math.round(
                  msgSize * (uiStore.palsHubFancyLineHeightMultiplier || 1.48),
                ),
                fontStyle: 'normal',
                color: theme.dark ? '#F4F4F6' : '#18181B',
              },
              parsedCss?.messageText,
            ]}>
            {displayText}
          </Text>
        </View>

        {totalGreetings > 1 && onSelectIndex && (
          <View style={styles.paginationRow}>
            <TouchableOpacity
              style={[
                styles.pageButton,
                currentIndex === 0 && styles.pageButtonDisabled,
              ]}
              disabled={currentIndex === 0}
              onPress={handlePrev}
              accessibilityLabel="Previous greeting">
              <ChevronLeftSmIcon
                width={14}
                height={14}
                stroke={theme.colors.onSurface}
              />
            </TouchableOpacity>

            <Text style={styles.pageIndicatorText}>
              {currentIndex + 1} / {totalGreetings}
            </Text>

            <TouchableOpacity
              style={[
                styles.pageButton,
                currentIndex >= totalGreetings - 1 && styles.pageButtonDisabled,
              ]}
              disabled={currentIndex >= totalGreetings - 1}
              onPress={handleNext}
              accessibilityLabel="Next greeting">
              <ChevronRightSmIcon
                width={14}
                height={14}
                stroke={theme.colors.onSurface}
              />
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  },
);
