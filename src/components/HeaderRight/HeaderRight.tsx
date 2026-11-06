import React, {useContext} from 'react';
import {Alert, Keyboard, View} from 'react-native';

import {observer} from 'mobx-react';
import {Icon, IconButton, useTheme} from 'react-native-paper';

import {
  DotsVerticalIcon,
  DuplicateIcon,
  EditBoxIcon,
  EditIcon,
  GridIcon,
  PalIcon,
  ReverseLeftIcon,
  SettingsIcon,
  ShareIcon,
  SparkleIcon,
  TrashIcon,
} from '../../assets/icons';

import {Menu} from '../Menu';
import {styles} from './styles';

import {chatSessionStore, modelStore, uiStore} from '../../store';

import {L10nContext} from '../../utils';
import {Model, ModelOrigin} from '../../utils/types';
import {t} from '../../locales';
import {
  importChatSessions,
  importAllPocketPalData,
  pickJsonFile,
} from '../../utils/importUtils';
import {
  exportChatSession,
  exportChatSessionAsMarkdown,
  exportAllChatSessions,
  exportAllPocketPalData,
} from '../../utils/exportUtils';

import {
  RenameModal,
  UsageStats,
  ChatPersonalizationSheet,
  ChatGenerationSettingsSheet,
  GroupChatSheet,
  SillyTavernPresetSheet,
} from '..';

export const HeaderRight: React.FC = observer(() => {
  const theme = useTheme();
  const [menuVisible, setMenuVisible] = React.useState(false);
  const [renameModalVisible, setRenameModalVisible] = React.useState(false);
  const [chatGenerationSettingsVisible, setChatGenerationSettingsVisible] =
    React.useState(false);
  const [personalizationSheetVisible, setPersonalizationSheetVisible] =
    React.useState(false);
  const [groupChatSheetVisible, setGroupChatSheetVisible] =
    React.useState(false);
  const [presetSheetVisible, setPresetSheetVisible] = React.useState(false);

  const openMenu = () => {
    if (Keyboard.isVisible()) {
      Keyboard.dismiss();
    }
    setMenuVisible(true);
  };
  const closeMenu = () => setMenuVisible(false);
  const l10n = useContext(L10nContext);

  const models = modelStore.availableModels;
  const activeModelId = modelStore.activeModelId;
  const session = chatSessionStore.sessions.find(
    s => s.id === chatSessionStore.activeSessionId,
  );

  const onSelectModel = (model: Model) => {
    modelStore.selectModel(model);
    closeMenu();
  };

  const onPressGenerationSettings = () => {
    setChatGenerationSettingsVisible(true);
    closeMenu();
  };

  const onPressDelete = () => {
    if (session?.id) {
      Alert.alert(
        l10n.components.headerRight.deleteChatTitle,
        l10n.components.headerRight.deleteChatMessage,
        [
          {
            text: l10n.common.cancel,
            style: 'cancel',
          },
          {
            text: l10n.common.delete,
            style: 'destructive',
            onPress: async () => {
              chatSessionStore.resetActiveSession();
              await chatSessionStore.deleteSession(session.id);
              closeMenu();
            },
          },
        ],
      );
    }
    closeMenu();
  };

  const onPressDuplicate = async () => {
    if (session?.id) {
      await chatSessionStore.duplicateSession(session.id);
      closeMenu();
    }
  };

  const onPressGoBack = async () => {
    await chatSessionStore.goBackOneTurn();
    closeMenu();
  };

  const onPressUndoGoBack = async () => {
    await chatSessionStore.undoGoBack();
    closeMenu();
  };

  const onPressRename = () => {
    setRenameModalVisible(true);
    closeMenu();
  };

  const onPressExportCurrentSession = async () => {
    if (session?.id) {
      try {
        await exportChatSession(session.id);
      } catch (error) {
        console.error('Error exporting current session:', error);
        Alert.alert('Export Error', 'Failed to export the current session.');
      }
    }
    closeMenu();
  };

  const onPressExportCurrentSessionAsMarkdown = async () => {
    if (session?.id) {
      try {
        await exportChatSessionAsMarkdown(session.id);
      } catch (error) {
        console.error('Error exporting current session as markdown:', error);
        Alert.alert('Export Error', 'Failed to export the current session.');
      }
    }
    closeMenu();
  };

  const onPressExportAllSessions = async () => {
    try {
      await exportAllChatSessions();
    } catch (error) {
      console.error('Error exporting all sessions:', error);
      Alert.alert('Export Error', 'Failed to export all sessions.');
    }
    closeMenu();
  };

  const onPressImportSessions = async () => {
    try {
      const count = await importChatSessions();
      if (count > 0) {
        Alert.alert(
          'Import Success',
          t(l10n.settings.importSuccess, {count: count.toString()}),
        );
        await chatSessionStore.loadSessionList();
      }
    } catch (error) {
      console.error('Error importing sessions:', error);
      Alert.alert('Import Error', l10n.settings.importError);
    }
    closeMenu();
  };

  const onPressImportTavoOrUnified = async () => {
    closeMenu();
    try {
      const fileUri = await pickJsonFile();
      if (!fileUri) {
        return;
      }
      const res = await importAllPocketPalData(fileUri);
      Alert.alert(
        'Tavo (.tbk) / Unified Import Complete',
        `Imported ${res.chats} chats, ${res.pals} characters/pals, ${res.apiProviders} API providers, and ${res.presets} presets.`,
      );
    } catch (err: any) {
      Alert.alert(
        'Import Failed',
        err?.message || 'Could not import Tavo or backup file.',
      );
    }
  };

  return (
    <View style={styles.headerRightContainer}>
      {uiStore.displayMemUsage && <UsageStats width={40} height={20} />}
      {chatSessionStore.canGoBack && (
        <IconButton
          icon={() => (
            <ReverseLeftIcon
              width={20}
              height={20}
              stroke={theme.colors.primary}
            />
          )}
          style={styles.chatBtn}
          onPress={() => chatSessionStore.goBackOneTurn()}
          testID="rewind-button"
        />
      )}
      {/* Direct In-Chat Memory & Personalization Button */}
      <IconButton
        icon={() => (
          <SparkleIcon width={20} height={20} fill={theme.colors.primary} />
        )}
        testID="chat-memory-personalization-button"
        style={styles.chatBtn}
        onPress={() => setPersonalizationSheetVisible(true)}
      />
      <IconButton
        icon={() => <EditBoxIcon stroke={theme.colors.primary} />}
        testID="reset-button"
        style={styles.chatBtn}
        onPress={() => {
          chatSessionStore.resetActiveSession();
        }}
      />
      <Menu
        visible={menuVisible}
        onDismiss={closeMenu}
        anchorPosition="bottom"
        anchor={
          <IconButton
            icon={() => <DotsVerticalIcon fill={theme.colors.primary} />}
            style={styles.menuBtn}
            onPress={openMenu}
            testID="menu-button"
          />
        }>
        <Menu.Item
          onPress={onPressGenerationSettings}
          label={l10n.components.headerRight.generationSettings}
          leadingIcon={() => <SettingsIcon stroke={theme.colors.primary} />}
        />
        <Menu.Item
          onPress={() => {
            setPersonalizationSheetVisible(true);
            closeMenu();
          }}
          label="Memory, Persona & Context (64k)"
          leadingIcon={() => (
            <SparkleIcon width={20} height={20} fill={theme.colors.primary} />
          )}
        />
        <Menu.Item
          onPress={() => {
            setPresetSheetVisible(true);
            closeMenu();
          }}
          label="SillyTavern Presets & Regex"
          leadingIcon={() => <SettingsIcon stroke={theme.colors.primary} />}
        />
        <Menu.Item
          onPress={() => {
            setGroupChatSheetVisible(true);
            closeMenu();
          }}
          label={
            chatSessionStore.isGroupChat
              ? `Manage Group Chat (${chatSessionStore.activeGroupPals.length})`
              : 'Multi-Character Group Chat'
          }
          leadingIcon={() => (
            <PalIcon width={20} height={20} stroke={theme.colors.primary} />
          )}
        />
        <Menu.Item
          disabled={models.length === 0}
          submenu={models.map(model => (
            <Menu.Item
              label={
                model.origin === ModelOrigin.REMOTE
                  ? `${model.name} (${model.serverName})`
                  : model.name
              }
              onPress={() => onSelectModel(model)}
              key={model.id}
              selectable
              selected={model.id === activeModelId}
              leadingIcon={
                model.origin === ModelOrigin.REMOTE
                  ? () => (
                      <Icon
                        source="cloud-outline"
                        size={16}
                        color={theme.colors.secondary}
                      />
                    )
                  : undefined
              }
            />
          ))}
          label={l10n.components.headerRight.model}
          leadingIcon={() => <GridIcon stroke={theme.colors.primary} />}
        />
        {session?.id && (
          <>
            <Menu.Separator />
            <Menu.Item
              onPress={onPressDuplicate}
              label={l10n.components.headerRight.duplicateChatHistory}
              leadingIcon={() => (
                <DuplicateIcon stroke={theme.colors.primary} />
              )}
            />
            {chatSessionStore.canGoBack && (
              <Menu.Item
                onPress={onPressGoBack}
                label="Rewind Turn (Go Back)"
                leadingIcon={() => (
                  <ReverseLeftIcon
                    width={20}
                    height={20}
                    stroke={theme.colors.primary}
                  />
                )}
              />
            )}
            {chatSessionStore.canUndoGoBack && (
              <Menu.Item
                onPress={onPressUndoGoBack}
                label="Restore Rewound Turn"
                leadingIcon={() => (
                  <ReverseLeftIcon
                    width={20}
                    height={20}
                    stroke={theme.colors.primary}
                    style={{transform: [{scaleX: -1}]}}
                  />
                )}
              />
            )}
            <Menu.Item
              onPress={onPressRename}
              label={l10n.common.rename}
              leadingIcon={() => <EditIcon stroke={theme.colors.primary} />}
            />
            <Menu.Item
              onPress={onPressDelete}
              label={l10n.common.delete}
              labelStyle={{color: theme.colors.error}}
              leadingIcon={() => <TrashIcon stroke={theme.colors.error} />}
            />
          </>
        )}
        <Menu.Item
          submenu={[
            <Menu.Item
              disabled={!session?.id}
              key="export-current"
              onPress={onPressExportCurrentSession}
              label={l10n.components.headerRight.exportCurrentSession}
            />,
            <Menu.Item
              disabled={!session?.id}
              key="export-current-markdown"
              onPress={onPressExportCurrentSessionAsMarkdown}
              label={l10n.components.headerRight.exportCurrentSessionMarkdown}
            />,
            <Menu.Item
              key="export-all"
              onPress={onPressExportAllSessions}
              label={l10n.components.headerRight.exportAllSessions}
            />,
            <Menu.Item
              key="export-all-backup"
              onPress={() => exportAllPocketPalData()}
              label="Export Unified PocketPal Backup"
            />,
            <Menu.Item
              key="import-tavo"
              onPress={onPressImportTavoOrUnified}
              label="Import Tavo (.tbk / .json) Export"
            />,
            <Menu.Item
              key="import"
              onPress={onPressImportSessions}
              label={l10n.components.headerRight.importSessions}
            />,
          ]}
          label={l10n.components.headerRight.export}
          leadingIcon={() => <ShareIcon stroke={theme.colors.primary} />}
        />
      </Menu>
      <ChatGenerationSettingsSheet
        isVisible={chatGenerationSettingsVisible}
        onClose={() => setChatGenerationSettingsVisible(false)}
      />
      <ChatPersonalizationSheet
        isVisible={personalizationSheetVisible}
        onDismiss={() => setPersonalizationSheetVisible(false)}
      />
      <SillyTavernPresetSheet
        isVisible={presetSheetVisible}
        onDismiss={() => setPresetSheetVisible(false)}
      />
      <GroupChatSheet
        isVisible={groupChatSheetVisible}
        onDismiss={() => setGroupChatSheetVisible(false)}
      />
      {session && (
        <RenameModal
          visible={renameModalVisible}
          onClose={() => setRenameModalVisible(false)}
          session={session}
        />
      )}
    </View>
  );
});
