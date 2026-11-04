import React, {useState, useEffect} from 'react';
import {View, TouchableOpacity, Alert} from 'react-native';
import {Text, Button, Switch, IconButton} from 'react-native-paper';
import {observer} from 'mobx-react';

import {Sheet, TextInput} from '..';
import {useTheme} from '../../hooks';
import {
  chatPersonalizationStore,
  chatMemoryStore,
  uiStore,
  ChatTone,
  POCKETPAL_DEFAULT_SYSTEM_PROMPT,
} from '../../store';
import {
  getRecentChatsSummaries,
  ChatSummaryItem,
} from '../../services/chatLookupService';
import {TrashIcon} from '../../assets/icons';
import {createStyles} from './styles';

interface ChatPersonalizationSheetProps {
  isVisible: boolean;
  onDismiss: () => void;
}

type TabKey = 'memory' | 'behavior' | 'advanced' | 'lookup';

const CONTEXT_CHIPS = [
  {label: '4k', value: 4096},
  {label: '8k', value: 8192},
  {label: '16k', value: 16384},
  {label: '32k', value: 32768},
  {label: '64k', value: 65536},
  {label: '128k', value: 131072},
];

export const ChatPersonalizationSheet: React.FC<ChatPersonalizationSheetProps> =
  observer(({isVisible, onDismiss}) => {
    const theme = useTheme();
    const styles = createStyles(theme);

    const [activeTab, setActiveTab] = useState<TabKey>('memory');
    const [newMemoryText, setNewMemoryText] = useState('');
    const [recentSummaries, setRecentSummaries] = useState<ChatSummaryItem[]>(
      [],
    );
    const [isLoadingSummaries, setIsLoadingSummaries] = useState(false);

    useEffect(() => {
      if (isVisible && activeTab === 'lookup') {
        loadSummaries();
      }
    }, [isVisible, activeTab]);

    const loadSummaries = async () => {
      setIsLoadingSummaries(true);
      try {
        const items = await getRecentChatsSummaries(
          chatPersonalizationStore.chatLookupCount || 35,
        );
        setRecentSummaries(items);
      } finally {
        setIsLoadingSummaries(false);
      }
    };

    const handleAddMemory = () => {
      if (!newMemoryText.trim()) {
        return;
      }
      try {
        chatMemoryStore.addMemory(newMemoryText.trim(), 'user');
        setNewMemoryText('');
      } catch (err: any) {
        Alert.alert('Memory Error', err?.message || 'Could not save memory');
      }
    };

    const handleDeleteMemory = (id: string) => {
      chatMemoryStore.deleteMemory(id);
    };

    const tones: Array<{key: ChatTone; label: string}> = [
      {key: 'friendly', label: 'Friendly & Peer'},
      {key: 'concise', label: 'Concise & Direct'},
      {key: 'creative', label: 'Creative & Vivid'},
      {key: 'analytical', label: 'Analytical & Rigorous'},
      {key: 'humorous', label: 'Humorous & Playful'},
    ];

    const breakdown = uiStore.lastContextBreakdown;

    return (
      <Sheet
        isVisible={isVisible}
        onClose={onDismiss}
        title="In-Chat Memory, Persona & Smart Context"
        snapPoints={['88%']}>
        <Sheet.ScrollView contentContainerStyle={styles.container}>
          {/* Navigation Tabs */}
          <View style={styles.tabsContainer}>
            <TouchableOpacity
              style={[
                styles.tabButton,
                activeTab === 'memory' && styles.tabButtonActive,
              ]}
              onPress={() => setActiveTab('memory')}>
              <Text
                style={[
                  styles.tabButtonText,
                  activeTab === 'memory' && styles.tabButtonTextActive,
                ]}>
                Memory & Context ({chatMemoryStore.memories.length})
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.tabButton,
                activeTab === 'behavior' && styles.tabButtonActive,
              ]}
              onPress={() => setActiveTab('behavior')}>
              <Text
                style={[
                  styles.tabButtonText,
                  activeTab === 'behavior' && styles.tabButtonTextActive,
                ]}>
                Persona & Tone
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.tabButton,
                activeTab === 'advanced' && styles.tabButtonActive,
              ]}
              onPress={() => setActiveTab('advanced')}>
              <Text
                style={[
                  styles.tabButtonText,
                  activeTab === 'advanced' && styles.tabButtonTextActive,
                ]}>
                Instructions
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.tabButton,
                activeTab === 'lookup' && styles.tabButtonActive,
              ]}
              onPress={() => setActiveTab('lookup')}>
              <Text
                style={[
                  styles.tabButtonText,
                  activeTab === 'lookup' && styles.tabButtonTextActive,
                ]}>
                Chat Lookup
              </Text>
            </TouchableOpacity>
          </View>

          {activeTab === 'memory' && (
            <View style={styles.tabSection}>
              <Text style={styles.sectionTitle}>
                Smart Context Management Engine
              </Text>
              <Text style={styles.description}>
                Automatically reserves token space for permanent context (AI
                Preset + Character Card + Lorebook + Memories) and trims the
                oldest chat messages when your context window (e.g. 64k) fills
                up.
              </Text>

              <View style={styles.toneGrid}>
                {CONTEXT_CHIPS.map(chip => {
                  const isSelected = uiStore.contextWindowLimit === chip.value;
                  return (
                    <TouchableOpacity
                      key={chip.label}
                      style={[
                        styles.toneChip,
                        isSelected && styles.toneChipActive,
                      ]}
                      onPress={() => uiStore.setContextWindowLimit(chip.value)}>
                      <Text
                        style={[
                          styles.toneChipText,
                          isSelected && styles.toneChipTextActive,
                        ]}>
                        {chip.label} ({chip.value.toLocaleString()})
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {breakdown && (
                <View style={styles.memoryItem}>
                  <View style={{flex: 1}}>
                    <Text style={styles.memoryText}>
                      Active Budget:{' '}
                      {breakdown.totalPromptTokens.toLocaleString()} /{' '}
                      {breakdown.maxContextTokens.toLocaleString()} tokens
                    </Text>
                    <Text style={styles.memoryMeta}>
                      Pinned (Preset+Card+Memory):{' '}
                      {breakdown.permanentPinnedTokens.toLocaleString()} tok •
                      History: {breakdown.usedHistoryTokens.toLocaleString()}{' '}
                      tok ({breakdown.keptMessagesCount} kept,{' '}
                      {breakdown.droppedOldestMessagesCount} oldest trimmed)
                    </Text>
                  </View>
                </View>
              )}

              <View style={styles.switchRow}>
                <View style={styles.switchTextContainer}>
                  <Text style={styles.switchLabel}>
                    Enable Memory & Personalization in Character Chats
                  </Text>
                  <Text style={styles.switchDesc}>
                    Use semantic memories, user persona, and custom instructions
                    inside Roleplay & Character chats as well as Normal chats.
                  </Text>
                </View>
                <Switch
                  value={chatPersonalizationStore.applyToCharacterChats}
                  onValueChange={val =>
                    chatPersonalizationStore.setApplyToCharacterChats(val)
                  }
                />
              </View>

              <View style={styles.switchRow}>
                <View style={styles.switchTextContainer}>
                  <Text style={styles.switchLabel}>AI Auto-Memory</Text>
                  <Text style={styles.switchDesc}>
                    Allow the AI to automatically remember important facts and
                    story events you share.
                  </Text>
                </View>
                <Switch
                  value={chatMemoryStore.isAutoMemoryEnabled}
                  onValueChange={val =>
                    chatMemoryStore.setAutoMemoryEnabled(val)
                  }
                />
              </View>

              <Text style={[styles.sectionTitle, {marginTop: 8}]}>
                Add Memory Fact to Current Chat
              </Text>
              <View style={styles.addMemoryRow}>
                <View style={{flex: 1}}>
                  <TextInput
                    value={newMemoryText}
                    onChangeText={setNewMemoryText}
                    placeholder="e.g. Victoria promised to meet at the rooftop cafe at 8 PM"
                  />
                </View>
                <Button
                  mode="contained"
                  onPress={handleAddMemory}
                  disabled={!newMemoryText.trim()}>
                  Save
                </Button>
              </View>

              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionTitle}>
                  Stored Memories ({chatMemoryStore.memories.length})
                </Text>
                {chatMemoryStore.memories.length > 0 && (
                  <Button
                    mode="text"
                    textColor={theme.colors.error}
                    onPress={() =>
                      Alert.alert(
                        'Clear Memories',
                        'Are you sure you want to delete all stored chat memories?',
                        [
                          {text: 'Cancel', style: 'cancel'},
                          {
                            text: 'Delete All',
                            style: 'destructive',
                            onPress: () => chatMemoryStore.clearMemories(),
                          },
                        ],
                      )
                    }>
                    Clear All
                  </Button>
                )}
              </View>

              {chatMemoryStore.memories.length === 0 ? (
                <Text style={styles.emptyNotice}>
                  No memories stored yet. Add one above or chat naturally!
                </Text>
              ) : (
                chatMemoryStore.memories.map(item => (
                  <View key={item.id} style={styles.memoryItem}>
                    <View style={{flex: 1, paddingRight: 8}}>
                      <Text style={styles.memoryText}>{item.content}</Text>
                      <Text style={styles.memoryMeta}>
                        Source: {item.source} •{' '}
                        {new Date(item.createdAt).toLocaleDateString()}
                      </Text>
                    </View>
                    <IconButton
                      icon={() => (
                        <TrashIcon
                          width={18}
                          height={18}
                          stroke={theme.colors.error}
                        />
                      )}
                      size={20}
                      onPress={() => handleDeleteMemory(item.id)}
                    />
                  </View>
                ))
              )}
            </View>
          )}

          {activeTab === 'behavior' && (
            <View style={styles.tabSection}>
              <Text style={styles.sectionTitle}>Your In-Chat Persona</Text>
              <TextInput
                label="Your Name ({{user}})"
                value={chatPersonalizationStore.userPersonaName}
                onChangeText={val =>
                  chatPersonalizationStore.setUserPersonaName(val)
                }
                placeholder="User"
              />
              <TextInput
                label="Your Persona / Appearance / Bio"
                value={chatPersonalizationStore.userPersonaBio}
                onChangeText={val =>
                  chatPersonalizationStore.setUserPersonaBio(val)
                }
                placeholder="Describe yourself or your character persona for the chat..."
                multiline
                numberOfLines={3}
              />

              <Text style={[styles.sectionTitle, {marginTop: 8}]}>
                Response Tone
              </Text>
              <View style={styles.toneGrid}>
                {tones.map(t => {
                  const isSelected = chatPersonalizationStore.tone === t.key;
                  return (
                    <TouchableOpacity
                      key={t.key}
                      style={[
                        styles.toneChip,
                        isSelected && styles.toneChipActive,
                      ]}
                      onPress={() => chatPersonalizationStore.setTone(t.key)}>
                      <Text
                        style={[
                          styles.toneChipText,
                          isSelected && styles.toneChipTextActive,
                        ]}>
                        {t.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={[styles.sectionTitle, {marginTop: 8}]}>
                Behavioral Toggles
              </Text>

              <View style={styles.switchRow}>
                <View style={styles.switchTextContainer}>
                  <Text style={styles.switchLabel}>Markdown Formatting</Text>
                  <Text style={styles.switchDesc}>
                    Use rich formatting, headings, bullet lists, and code
                    blocks.
                  </Text>
                </View>
                <Switch
                  value={chatPersonalizationStore.useMarkdown}
                  onValueChange={val =>
                    chatPersonalizationStore.setUseMarkdown(val)
                  }
                />
              </View>

              <View style={styles.switchRow}>
                <View style={styles.switchTextContainer}>
                  <Text style={styles.switchLabel}>Step-by-Step Reasoning</Text>
                  <Text style={styles.switchDesc}>
                    Encourage the model to think through complex problems
                    methodically.
                  </Text>
                </View>
                <Switch
                  value={chatPersonalizationStore.enableReasoning}
                  onValueChange={val =>
                    chatPersonalizationStore.setEnableReasoning(val)
                  }
                />
              </View>

              <View style={styles.switchRow}>
                <View style={styles.switchTextContainer}>
                  <Text style={styles.switchLabel}>Match User Language</Text>
                  <Text style={styles.switchDesc}>
                    Automatically respond in the same language as your prompt.
                  </Text>
                </View>
                <Switch
                  value={chatPersonalizationStore.matchUserLanguage}
                  onValueChange={val =>
                    chatPersonalizationStore.setMatchUserLanguage(val)
                  }
                />
              </View>

              <View style={styles.switchRow}>
                <View style={styles.switchTextContainer}>
                  <Text style={styles.switchLabel}>Concise Answers</Text>
                  <Text style={styles.switchDesc}>
                    Prioritize brief, scannable answers without unnecessary
                    exposition.
                  </Text>
                </View>
                <Switch
                  value={chatPersonalizationStore.conciseAnswers}
                  onValueChange={val =>
                    chatPersonalizationStore.setConciseAnswers(val)
                  }
                />
              </View>

              <View style={styles.switchRow}>
                <View style={styles.switchTextContainer}>
                  <Text style={styles.switchLabel}>Suggest Follow-Ups</Text>
                  <Text style={styles.switchDesc}>
                    Provide 2-3 logical next questions or suggestions at the
                    end.
                  </Text>
                </View>
                <Switch
                  value={chatPersonalizationStore.suggestFollowups}
                  onValueChange={val =>
                    chatPersonalizationStore.setSuggestFollowups(val)
                  }
                />
              </View>
            </View>
          )}

          {activeTab === 'advanced' && (
            <View style={styles.tabSection}>
              <Text style={styles.description}>
                Provide custom instructions or modify the base system prompt.
                Write anything you want the AI to do or know about you.
              </Text>

              <Text style={styles.sectionTitle}>Custom Instructions</Text>
              <TextInput
                label="What should the AI know about you or how it should behave?"
                value={chatPersonalizationStore.customInstructions}
                onChangeText={val =>
                  chatPersonalizationStore.setCustomInstructions(val)
                }
                placeholder="e.g. Keep dialogue expressive and remember ongoing plot threads."
                multiline
                numberOfLines={4}
              />

              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionTitle}>
                  PocketPal System Prompt
                </Text>
                <Button
                  mode="text"
                  onPress={() =>
                    chatPersonalizationStore.resetBaseSystemPrompt()
                  }>
                  Reset Default
                </Button>
              </View>
              <TextInput
                label="Base System Prompt"
                value={chatPersonalizationStore.baseSystemPrompt}
                onChangeText={val =>
                  chatPersonalizationStore.setBaseSystemPrompt(val)
                }
                placeholder={POCKETPAL_DEFAULT_SYSTEM_PROMPT}
                multiline
                numberOfLines={3}
              />
            </View>
          )}

          {activeTab === 'lookup' && (
            <View style={styles.tabSection}>
              <Text style={styles.description}>
                Cross-Chat Awareness provides 1-paragraph summaries of your last
                35 chats so the AI remembers past topics, storylines, and
                projects.
              </Text>

              <View style={styles.switchRow}>
                <View style={styles.switchTextContainer}>
                  <Text style={styles.switchLabel}>
                    Enable Cross-Chat Lookup
                  </Text>
                  <Text style={styles.switchDesc}>
                    Inject summaries of your last 35 chats into permanent
                    context.
                  </Text>
                </View>
                <Switch
                  value={chatPersonalizationStore.enableChatLookup}
                  onValueChange={val =>
                    chatPersonalizationStore.setEnableChatLookup(val)
                  }
                />
              </View>

              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionTitle}>
                  Last 35 Chats Summaries ({recentSummaries.length})
                </Text>
                <Button
                  mode="text"
                  loading={isLoadingSummaries}
                  onPress={loadSummaries}>
                  Refresh
                </Button>
              </View>

              {recentSummaries.length === 0 ? (
                <Text style={styles.emptyNotice}>
                  {isLoadingSummaries
                    ? 'Loading summaries...'
                    : 'No past chats found to summarize.'}
                </Text>
              ) : (
                recentSummaries.map((item, idx) => (
                  <View key={item.id} style={styles.chatSummaryCard}>
                    <View style={styles.chatSummaryHeader}>
                      <Text style={styles.chatSummaryTitle} numberOfLines={1}>
                        #{idx + 1}. {item.title}
                      </Text>
                      <Text style={styles.chatSummaryDate}>
                        {item.date ? item.date.substring(0, 10) : ''}
                      </Text>
                    </View>
                    <Text style={styles.chatSummaryBody}>{item.summary}</Text>
                  </View>
                ))
              )}
            </View>
          )}
        </Sheet.ScrollView>

        <Sheet.Actions>
          <View style={styles.footerActions}>
            <Button mode="contained" onPress={onDismiss}>
              Done
            </Button>
          </View>
        </Sheet.Actions>
      </Sheet>
    );
  });
