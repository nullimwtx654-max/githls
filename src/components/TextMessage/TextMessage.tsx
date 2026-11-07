import * as React from 'react';
import {
  Linking,
  Text,
  View,
  Image,
  TouchableOpacity,
  Modal,
} from 'react-native';
import {IconButton} from 'react-native-paper';
import {observer} from 'mobx-react';

import ParsedText from 'react-native-parsed-text';
import {
  LinkPreview,
  PreviewData,
  REGEX_LINK,
} from '@flyerhq/react-native-link-preview';

import {useTheme} from '../../hooks';

import {styles} from './styles';
import {MarkdownView} from '../MarkdownView';

import {AgentStep, MessageType} from '../../utils/types';
import {
  excludeDerivedMessageProps,
  getUserName,
  UserContext,
} from '../../utils';
import {visibleStepContent} from '../../utils/chat';
import {chatSessionStore, sillyTavernPresetStore} from '../../store';
import {applySillyTavernRegexScripts} from '../../utils/sillyTavernPresetEngine';

export interface TextMessageTopLevelProps {
  /** @see {@link LinkPreviewProps.onPreviewDataFetched} */
  onPreviewDataFetched?: ({
    message,
    previewData,
  }: {
    message: MessageType.Text;
    previewData: PreviewData;
  }) => void;
  /** Enables link (URL) preview */
  usePreviewData?: boolean;
}

export interface TextMessageProps extends TextMessageTopLevelProps {
  enableAnimation?: boolean;
  message: MessageType.DerivedText | MessageType.DerivedAssistantTurn;
  messageWidth: number;
  showName: boolean;
  step?: AgentStep;
}

export const TextMessage = observer(
  ({
    enableAnimation,
    message,
    messageWidth,
    onPreviewDataFetched,
    showName,
    usePreviewData,
    step,
  }: TextMessageProps) => {
    const rawVisibleText: string = step
      ? visibleStepContent(step)
      : 'text' in message
      ? message.text
      : '';
    const theme = useTheme();
    const user = React.useContext(UserContext);
    const [previewData, setPreviewData] = React.useState(
      'previewData' in message ? message.previewData : undefined,
    );
    const [selectedImageIndex, setSelectedImageIndex] = React.useState<
      number | null
    >(null);

    // Apply SillyTavern & Character Card display-scoped Regex scripts (`applySillyTavernRegexScripts`)
    const visibleText = React.useMemo(() => {
      if (!rawVisibleText) {
        return '';
      }
      const activePreset = sillyTavernPresetStore.activePreset;
      const activePal = chatSessionStore.activePal;
      const cardRegexes =
        (activePal?.characterCard?.data?.extensions as any)?.regex_scripts ||
        [];
      const presetRegexes = activePreset?.regex_scripts || [];
      const allScripts = [...presetRegexes, ...cardRegexes];
      if (allScripts.length === 0) {
        return rawVisibleText;
      }
      const isUserAuthor = message.author?.id === user?.id;
      return applySillyTavernRegexScripts(rawVisibleText, allScripts, {
        placement: isUserAuthor ? 1 : 2,
        depth: 0,
        isMarkdownRender: true,
        charName: activePal?.name || message.author?.firstName || 'Assistant',
        userName: sillyTavernPresetStore.userName || 'User',
      });
    }, [
      rawVisibleText,
      sillyTavernPresetStore.activePreset,
      sillyTavernPresetStore.userName,
      chatSessionStore.activePal,
      message.author?.id,
      message.author?.firstName,
      user?.id,
    ]);

    const {
      descriptionText,
      headerText,
      titleText,
      text,
      textContainer,
      imageContainer,
      imageThumbnail,
      imageContent,
      imagePreviewModal,
      imagePreviewCloseButton,
      imagePreviewContent,
    } = styles({
      message,
      theme,
      user,
    });

    const imageUris = (message as any).imageUris || [];
    const hasImages = imageUris && imageUris.length > 0;

    const handleEmailPress = (email: string) => {
      try {
        Linking.openURL(`mailto:${email}`);
      } catch {}
    };

    const handlePreviewDataFetched = (data: PreviewData) => {
      setPreviewData(data);
      onPreviewDataFetched?.({
        message: excludeDerivedMessageProps(message) as MessageType.Text,
        previewData: data,
      });
    };

    const handleUrlPress = (url: string) => {
      const uri = url.toLowerCase().startsWith('http') ? url : `https://${url}`;
      Linking.openURL(uri);
    };

    const renderPreviewDescription = (description: string) => {
      return (
        <Text numberOfLines={3} style={descriptionText}>
          {description}
        </Text>
      );
    };

    const renderPreviewHeader = (header: string) => {
      return (
        <Text numberOfLines={1} style={headerText}>
          {header}
        </Text>
      );
    };

    const renderPreviewText = (previewText: string) => {
      return (
        <ParsedText
          accessibilityRole="link"
          parse={[
            {
              onPress: handleEmailPress,
              style: [text, {textDecorationLine: 'underline'}],
              type: 'email',
            },
            {
              onPress: handleUrlPress,
              pattern: REGEX_LINK,
              style: [text, {textDecorationLine: 'underline'}],
            },
          ]}
          style={text}>
          {previewText}
        </ParsedText>
      );
    };

    const renderPreviewTitle = (title: string) => {
      return (
        <Text numberOfLines={2} style={titleText}>
          {title}
        </Text>
      );
    };

    const renderImages = () => {
      if (!hasImages) {
        return null;
      }

      return (
        <View style={imageContainer}>
          {imageUris.map((uri: string, index: number) => (
            <TouchableOpacity
              key={index}
              style={imageThumbnail}
              onPress={() => setSelectedImageIndex(index)}>
              <Image source={{uri}} style={imageContent} resizeMode="cover" />
            </TouchableOpacity>
          ))}
        </View>
      );
    };

    const renderImagePreview = () => {
      if (selectedImageIndex === null) {
        return null;
      }

      return (
        <Modal
          visible={selectedImageIndex !== null}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setSelectedImageIndex(null)}>
          <View style={imagePreviewModal}>
            <IconButton
              icon="close"
              size={24}
              iconColor="white"
              style={imagePreviewCloseButton}
              onPress={() => setSelectedImageIndex(null)}
            />
            <Image
              source={{uri: imageUris[selectedImageIndex]}}
              style={imagePreviewContent}
              resizeMode="contain"
            />
          </View>
        </Modal>
      );
    };

    const linkPreviewEligible =
      !step &&
      usePreviewData &&
      !!onPreviewDataFetched &&
      visibleText.length > 0 &&
      REGEX_LINK.test(visibleText.toLowerCase());

    const resolvedAuthorName =
      getUserName(message.author) ||
      (message.author?.id !== user?.id
        ? chatSessionStore.activePal?.name || ''
        : '');

    return (
      <>
        {linkPreviewEligible ? (
          <LinkPreview
            containerStyle={{
              width: previewData?.image ? messageWidth : undefined,
            }}
            enableAnimation={enableAnimation}
            header={showName ? resolvedAuthorName : undefined}
            onPreviewDataFetched={handlePreviewDataFetched}
            previewData={previewData}
            renderDescription={renderPreviewDescription}
            renderHeader={renderPreviewHeader}
            renderText={renderPreviewText}
            renderTitle={renderPreviewTitle}
            text={visibleText}
            textContainerStyle={textContainer}
            touchableWithoutFeedbackProps={{
              accessibilityRole: undefined,
              accessible: false,
              disabled: true,
            }}
          />
        ) : (
          <View style={textContainer}>
            {showName && resolvedAuthorName
              ? renderPreviewHeader(resolvedAuthorName)
              : null}

            {!step && renderImages()}

            <MarkdownView
              markdownText={visibleText.trim()}
              maxMessageWidth={messageWidth}
              selectable={false}
            />
          </View>
        )}

        {!step && renderImagePreview()}
      </>
    );
  },
);
