import React, {useState, useEffect} from 'react';
import {View, TouchableOpacity, Alert} from 'react-native';
import {Text, Button, Switch} from 'react-native-paper';
import {observer} from 'mobx-react';

import {Sheet, TextInput} from '..';
import {useTheme} from '../../hooks';
import {chatSessionStore, palStore, GroupActivationStrategy} from '../../store';
import {createStyles} from './styles';

interface GroupChatSheetProps {
  isVisible: boolean;
  onDismiss: () => void;
}

export const GroupChatSheet: React.FC<GroupChatSheetProps> = observer(
  ({isVisible, onDismiss}) => {
    const theme = useTheme();
    const styles = createStyles(theme);

    const activeGroupConfig = chatSessionStore.activeGroupConfig;
    const [groupTitle, setGroupTitle] = useState('Party Group Chat');
    const [selectedPalIds, setSelectedPalIds] = useState<string[]>([]);
    const [mutedPalIds, setMutedPalIds] = useState<string[]>([]);
    const [strategy, setStrategy] =
      useState<GroupActivationStrategy>('natural');
    const [allowSelfResponses, setAllowSelfResponses] = useState(false);

    useEffect(() => {
      if (isVisible) {
        if (activeGroupConfig && activeGroupConfig.groupPalIds.length > 1) {
          setGroupTitle(
            chatSessionStore.activeSession?.title || 'Party Group Chat',
          );
          setSelectedPalIds([...activeGroupConfig.groupPalIds]);
          setMutedPalIds([...activeGroupConfig.mutedPalIds]);
          setStrategy(activeGroupConfig.strategy || 'natural');
          setAllowSelfResponses(Boolean(activeGroupConfig.allowSelfResponses));
        } else {
          const initialIds = chatSessionStore.activePalId
            ? [chatSessionStore.activePalId]
            : palStore.pals.slice(0, 2).map(p => p.id);
          setSelectedPalIds(initialIds);
          setMutedPalIds([]);
          setStrategy('natural');
          setAllowSelfResponses(false);
        }
      }
    }, [isVisible, activeGroupConfig]);

    const toggleSelectPal = (palId: string) => {
      setSelectedPalIds(prev =>
        prev.includes(palId)
          ? prev.filter(id => id !== palId)
          : [...prev, palId],
      );
    };

    const toggleMutePal = (palId: string) => {
      setMutedPalIds(prev =>
        prev.includes(palId)
          ? prev.filter(id => id !== palId)
          : [...prev, palId],
      );
    };

    const handleSaveOrCreate = async () => {
      if (selectedPalIds.length < 2) {
        Alert.alert(
          'Select Characters',
          'Please select at least 2 Pals/characters to form a Group Chat.',
        );
        return;
      }

      if (chatSessionStore.isGroupChat && chatSessionStore.activeSessionId) {
        await chatSessionStore.updateGroupChatConfig(
          chatSessionStore.activeSessionId,
          {
            groupPalIds: selectedPalIds,
            mutedPalIds,
            strategy,
            allowSelfResponses,
          },
        );
        if (groupTitle.trim()) {
          await chatSessionStore.updateSessionTitleBySessionId(
            chatSessionStore.activeSessionId,
            groupTitle.trim(),
          );
        }
      } else {
        const names = selectedPalIds
          .map(id => palStore.pals.find(p => p.id === id)?.name)
          .filter(Boolean);
        const title =
          groupTitle.trim() || `Group: ${names.slice(0, 3).join(', ')}`;
        await chatSessionStore.createGroupChat(
          title,
          selectedPalIds,
          strategy,
          mutedPalIds,
          allowSelfResponses,
        );
      }
      onDismiss();
    };

    const strategies: Array<{key: GroupActivationStrategy; label: string}> = [
      {key: 'natural', label: 'Natural (Name Mention + Turn)'},
      {key: 'list', label: 'Round-Robin List Order'},
      {key: 'pooled', label: 'Pooled Random Speaker'},
      {key: 'manual', label: 'Manual Tap-to-Speak'},
    ];

    return (
      <Sheet
        isVisible={isVisible}
        onClose={onDismiss}
        title="Multi-Character Group Chat"
        snapPoints={['85%']}>
        <Sheet.ScrollView contentContainerStyle={styles.container}>
          <Text style={styles.description}>
            {
              'Combine 2 or more Pals/characters in a shared conversation. Supports SillyTavern group macros ({{group}}, {{groupNotMuted}}, {{charIfNotGroup}}), merged lorebooks, and per-turn speaker attribution.'
            }
          </Text>

          <TextInput
            label="Group Chat Title"
            value={groupTitle}
            onChangeText={setGroupTitle}
            placeholder="e.g. Astral Archive Council"
          />

          <Text style={styles.sectionTitle}>Speaker Activation Strategy</Text>
          <View style={styles.strategyGrid}>
            {strategies.map(s => {
              const isSelected = strategy === s.key;
              return (
                <TouchableOpacity
                  key={s.key}
                  style={[
                    styles.strategyChip,
                    isSelected && styles.strategyChipActive,
                  ]}
                  onPress={() => setStrategy(s.key)}>
                  <Text
                    style={[
                      styles.strategyChipText,
                      isSelected && styles.strategyChipTextActive,
                    ]}>
                    {s.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={styles.switchRow}>
            <View style={{flex: 1, paddingRight: 12}}>
              <Text style={styles.switchLabel}>Allow Consecutive Self-Replies</Text>
              <Text style={styles.switchDesc}>
                Allow the same character to speak twice in a row in pooled/natural mode.
              </Text>
            </View>
            <Switch
              value={allowSelfResponses}
              onValueChange={setAllowSelfResponses}
            />
          </View>

          <Text style={styles.sectionTitle}>
            Select Group Members ({selectedPalIds.length} selected)
          </Text>

          {palStore.pals.length === 0 ? (
            <Text style={styles.description}>
              No Pals found yet. Create or import V1–V4 Character Cards in the
              Pals tab first.
            </Text>
          ) : (
            palStore.pals.map(pal => {
              const isSelected = selectedPalIds.includes(pal.id);
              const isMuted = mutedPalIds.includes(pal.id);
              const orderIdx = selectedPalIds.indexOf(pal.id);

              return (
                <TouchableOpacity
                  key={pal.id}
                  style={[
                    styles.palItem,
                    isSelected && styles.palItemSelected,
                  ]}
                  onPress={() => toggleSelectPal(pal.id)}>
                  <View style={styles.palInfo}>
                    <View style={styles.palNameRow}>
                      <Text style={styles.palName}>{pal.name}</Text>
                      {isSelected && (
                        <View style={styles.badge}>
                          <Text style={styles.badgeText}>
                            #{orderIdx + 1} Active
                          </Text>
                        </View>
                      )}
                      {isSelected && isMuted && (
                        <View style={styles.mutedBadge}>
                          <Text style={styles.mutedBadgeText}>Muted</Text>
                        </View>
                      )}
                    </View>
                    {pal.description ? (
                      <Text style={styles.palDesc} numberOfLines={1}>
                        {pal.description}
                      </Text>
                    ) : null}
                  </View>

                  {isSelected && (
                    <View style={styles.palActions}>
                      <TouchableOpacity
                        style={styles.muteBtn}
                        onPress={() => toggleMutePal(pal.id)}>
                        <Text style={styles.muteBtnText}>
                          {isMuted ? 'Unmute' : 'Mute'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })
          )}
        </Sheet.ScrollView>

        <Sheet.Actions>
          <View style={styles.footerActions}>
            <Button mode="text" onPress={onDismiss}>
              Cancel
            </Button>
            <Button
              mode="contained"
              onPress={handleSaveOrCreate}
              disabled={selectedPalIds.length < 2}>
              {chatSessionStore.isGroupChat
                ? 'Update Group Chat'
                : `Start Group Chat (${selectedPalIds.length})`}
            </Button>
          </View>
        </Sheet.Actions>
      </Sheet>
    );
  },
);
