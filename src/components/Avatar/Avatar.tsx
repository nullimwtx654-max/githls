import * as React from 'react';
import {Image, StyleSheet, Text, View} from 'react-native';
import {observer} from 'mobx-react';

import {MessageType, Theme} from '../../utils/types';
import {getUserAvatarNameColor, getUserInitials} from '../../utils';
import {chatSessionStore, palStore, uiStore} from '../../store';
import {getFullThumbnailUri} from '../../utils/imageUtils';
import {parseCustomCss} from '../../utils/customCssEngine';

export const Avatar = observer(
  ({
    author,
    currentUserIsAuthor,
    showAvatar,
    showUserAvatars,
    theme,
  }: {
    author: MessageType.Any['author'];
    currentUserIsAuthor: boolean;
    showAvatar: boolean;
    showUserAvatars?: boolean;
    theme: Theme;
  }) => {
    const hasPalOrGroup = Boolean(
      chatSessionStore.activePalId || chatSessionStore.isGroupChat,
    );
    const isFancy = uiStore.isFancyActive(hasPalOrGroup);

    // Resolve Character PFP from author.imageUrl or activePal / group member pal
    const resolvedImageUri = React.useMemo(() => {
      if (author?.imageUrl) {
        return getFullThumbnailUri(author.imageUrl) || author.imageUrl;
      }
      if (!currentUserIsAuthor) {
        const speakerName = author?.firstName?.trim();
        if (speakerName && chatSessionStore.isGroupChat) {
          const matchedPal = palStore.pals.find(
            p => p.name.toLowerCase() === speakerName.toLowerCase(),
          );
          if (matchedPal?.thumbnail_url) {
            return getFullThumbnailUri(matchedPal.thumbnail_url);
          }
        }
        const activePal = chatSessionStore.activePal;
        if (activePal?.thumbnail_url) {
          return getFullThumbnailUri(activePal.thumbnail_url);
        }
      }
      return undefined;
    }, [
      author?.imageUrl,
      author?.firstName,
      currentUserIsAuthor,
      chatSessionStore.activePal,
      chatSessionStore.isGroupChat,
    ]);

    const customAvatarStyle = React.useMemo(() => {
      if (!uiStore.customCssEnabled || !uiStore.customCss.trim()) {
        return null;
      }
      return parseCustomCss(uiStore.customCss).avatar;
    }, [uiStore.customCssEnabled, uiStore.customCss]);

    const renderAvatar = () => {
      const activePal = chatSessionStore.activePal;
      const effectiveAuthor =
        author?.firstName || !activePal
          ? author
          : {...author, firstName: activePal.name};
      const color = getUserAvatarNameColor(
        effectiveAuthor,
        theme.colors.userAvatarNameColors,
      );
      const initials =
        getUserInitials(effectiveAuthor) ||
        (activePal?.name ? activePal.name.slice(0, 2).toUpperCase() : 'AI');

      const fancyRingStyle = isFancy
        ? {
            width: 36,
            height: 36,
            borderRadius: 18,
            borderWidth: 1.5,
            borderColor: theme.dark
              ? 'rgba(255, 255, 255, 0.28)'
              : 'rgba(15, 23, 42, 0.16)',
          }
        : null;

      if (resolvedImageUri) {
        return (
          <Image
            accessibilityRole="image"
            testID="avatar-image"
            resizeMode="cover"
            source={{uri: resolvedImageUri}}
            style={[styles.image, fancyRingStyle, customAvatarStyle]}
          />
        );
      }

      return (
        <View
          style={[
            styles.avatarBackground,
            {backgroundColor: color},
            fancyRingStyle,
            customAvatarStyle,
          ]}>
          <Text style={styles.initialsText}>{initials}</Text>
        </View>
      );
    };

    return !currentUserIsAuthor && showUserAvatars ? (
      <View testID="AvatarContainer" style={styles.container}>
        {showAvatar ? (
          renderAvatar()
        ) : (
          <View style={[styles.placeholder, isFancy && {width: 44}]} />
        )}
      </View>
    ) : null;
  },
);

const styles = StyleSheet.create({
  container: {
    justifyContent: 'flex-start',
    paddingTop: 2,
  },
  avatarBackground: {
    alignItems: 'center',
    borderRadius: 16,
    height: 32,
    justifyContent: 'center',
    marginRight: 8,
    width: 32,
  },
  initialsText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  image: {
    alignItems: 'center',
    borderRadius: 16,
    height: 32,
    justifyContent: 'center',
    marginRight: 8,
    width: 32,
  },
  placeholder: {
    width: 40,
  },
});
