import React, {useRef, useContext, useEffect, useState} from 'react';
import {Dimensions, View, Pressable, Keyboard} from 'react-native';
import {observer} from 'mobx-react';
import {Text, Button} from 'react-native-paper';
import BottomSheet, {BottomSheetScrollView} from '@gorhom/bottom-sheet';

import {useTheme} from '../../hooks';
import {createStyles} from './styles';
import {modelStore} from '../../store';
import {CustomBackdrop} from '../Sheet/CustomBackdrop';
import {SheetBackground} from '../Sheet/SheetBackground';
import {getModelSkills, L10nContext, Model} from '../../utils';
import type {Pal} from '../../types/pal';
import {SkillsDisplay} from '../SkillsDisplay';
import {AIApiKeySheet} from '../AIApiKeySheet';

interface ChatPalModelPickerSheetProps {
  isVisible: boolean;
  chatInputHeight: number;
  onClose: () => void;
  onModelSelect?: (modelId: string) => void;
  onPalSelect?: (palId: string | undefined) => void;
  onPalSettingsSelect?: (pal: Pal) => void;
}

const ObservedSkillsDisplay = observer(({model}: {model: Model}) => {
  const hasProjectionModelWarning =
    model.supportsMultimodal &&
    model.visionEnabled &&
    modelStore.getProjectionModelStatus(model).state === 'missing';

  const toggleVision = async () => {
    if (!model.supportsMultimodal) {
      return;
    }
    try {
      await modelStore.setModelVisionEnabled(
        model.id,
        !modelStore.getModelVisionPreference(model),
      );
    } catch (error) {
      console.error('Failed to toggle vision setting:', error);
    }
  };
  const visionEnabled = modelStore.getModelVisionPreference(model);

  return (
    <SkillsDisplay
      model={model}
      hasProjectionModelWarning={hasProjectionModelWarning}
      onVisionPress={toggleVision}
      onProjectionWarningPress={() =>
        model.defaultProjectionModel &&
        modelStore.checkSpaceAndDownload(model.defaultProjectionModel)
      }
      visionEnabled={visionEnabled}
    />
  );
});

export const ChatPalModelPickerSheet = observer(
  ({
    isVisible,
    onClose,
    onModelSelect,
    chatInputHeight,
  }: ChatPalModelPickerSheetProps) => {
    const theme = useTheme();
    const l10n = useContext(L10nContext);
    const styles = createStyles({theme});
    const bottomSheetRef = useRef<BottomSheet>(null);
    const [showCloudSheet, setShowCloudSheet] = useState(false);

    useEffect(() => {
      if (isVisible) {
        Keyboard.dismiss();
      }
    }, [isVisible]);

    useEffect(() => {
      const keyboardDidShowListener = Keyboard.addListener(
        'keyboardDidShow',
        () => {
          if (isVisible) {
            onClose();
          }
        },
      );

      return () => {
        keyboardDidShowListener.remove();
      };
    }, [isVisible, onClose]);

    const handleModelSelect = React.useCallback(
      async (model: (typeof modelStore.availableModels)[0]) => {
        try {
          onModelSelect?.(model.id);
          onClose();
          await modelStore.selectModel(model);
        } catch (e) {
          console.log(`Error: ${e}`);
        }
      },
      [onModelSelect, onClose],
    );

    const renderModelItem = React.useCallback(
      (model: Model) => {
        const isActiveModel = model.id === modelStore.activeModelId;
        const modelSkills = getModelSkills(model)
          .flatMap(skill => skill.labelKey)
          .join(', ');
        return (
          <Pressable
            key={model.id}
            style={[styles.listItem, isActiveModel && styles.activeListItem]}
            onPress={() => handleModelSelect(model)}>
            <View style={styles.itemContent}>
              <Text
                style={[
                  styles.itemTitle,
                  isActiveModel && styles.activeItemTitle,
                ]}>
                {model.name}
                {model.serverName ? ` • ${model.serverName}` : ''}
              </Text>
              {modelSkills ? <ObservedSkillsDisplay model={model} /> : null}
            </View>
          </Pressable>
        );
      },
      [styles, handleModelSelect],
    );

    const snapPoints = React.useMemo(() => ['70%'], []);

    return (
      <>
        <BottomSheet
          ref={bottomSheetRef}
          onClose={onClose}
          enablePanDownToClose
          snapPoints={snapPoints}
          enableDynamicSizing={false}
          backdropComponent={isVisible ? CustomBackdrop : undefined}
          backgroundComponent={SheetBackground}
          backgroundStyle={{
            backgroundColor: theme.colors.surface,
          }}
          handleIndicatorStyle={{
            backgroundColor: theme.colors.primary,
          }}
          enableContentPanningGesture={false}
          enableHandlePanningGesture
          accessible={false}>
          <View
            style={[
              styles.tabs,
              {
                justifyContent: 'space-between',
                alignItems: 'center',
                paddingRight: 16,
              },
            ]}>
            <View
              testID="chat-pal-model-picker-tab-models"
              style={[styles.tab, styles.activeTab]}>
              <Text style={[styles.tabText, styles.activeTabText]}>
                {l10n.components.chatPalModelPickerSheet.modelsTab} (
                {modelStore.availableModels.length})
              </Text>
            </View>
            <Button
              mode="contained-tonal"
              compact
              icon="cloud-outline"
              onPress={() => setShowCloudSheet(true)}>
              Cloud / Custom API
            </Button>
          </View>
          <View style={{width: Dimensions.get('window').width, flex: 1}}>
            <BottomSheetScrollView
              contentContainerStyle={{paddingBottom: chatInputHeight + 66}}>
              {modelStore.availableModels.length === 0 ? (
                <View style={{padding: 24, alignItems: 'center', gap: 12}}>
                  <Text
                    style={{
                      color: theme.colors.onSurfaceVariant,
                      textAlign: 'center',
                    }}>
                    No local or cloud models configured yet. Download a local
                    GGUF model or configure a Cloud API model below.
                  </Text>
                  <Button
                    mode="contained"
                    icon="cloud-outline"
                    onPress={() => setShowCloudSheet(true)}>
                    Configure Cloud / Custom API Model
                  </Button>
                </View>
              ) : (
                modelStore.availableModels.map(renderModelItem)
              )}
            </BottomSheetScrollView>
          </View>
        </BottomSheet>
        <AIApiKeySheet
          isVisible={showCloudSheet}
          onDismiss={() => setShowCloudSheet(false)}
        />
      </>
    );
  },
);
