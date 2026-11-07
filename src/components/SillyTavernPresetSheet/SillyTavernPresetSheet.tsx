import React, {useState} from 'react';
import {View, TouchableOpacity, Alert} from 'react-native';
import {Text, Button, Switch} from 'react-native-paper';
import {observer} from 'mobx-react';

import {Sheet, TextInput, InputSlider} from '..';
import {useTheme} from '../../hooks';
import {sillyTavernPresetStore, uiStore} from '../../store';
import {pickJsonFile, readJsonFile} from '../../utils/importUtils';
import {applySillyTavernRegexScripts} from '../../utils/sillyTavernPresetEngine';
import {createStyles} from './styles';

interface SillyTavernPresetSheetProps {
  isVisible: boolean;
  onDismiss: () => void;
}

type TabKey = 'presets' | 'prompts' | 'samplers' | 'regex' | 'utility';

const CONTEXT_PRESET_CHIPS = [
  {label: '4k', value: 4096},
  {label: '8k', value: 8192},
  {label: '16k', value: 16384},
  {label: '32k', value: 32768},
  {label: '64k', value: 65536},
  {label: '128k', value: 131072},
];

export const SillyTavernPresetSheet: React.FC<SillyTavernPresetSheetProps> =
  observer(({isVisible, onDismiss}) => {
    const theme = useTheme();
    const styles = createStyles(theme);

    const [activeTab, setActiveTab] = useState<TabKey>('presets');
    const [newPresetName, setNewPresetName] = useState('');
    const [newPromptName, setNewPromptName] = useState('');
    const [newPromptContent, setNewPromptContent] = useState('');

    // Regex editor states
    const [rxName, setRxName] = useState('');
    const [rxFind, setRxFind] = useState('');
    const [rxReplace, setRxReplace] = useState('');
    const [rxScope, setRxScope] = useState<'both' | 'display' | 'prompt'>(
      'both',
    );
    const [rxSampleText, setRxSampleText] = useState(
      '[HP: 95/100 | Location: Cyber-Neo Tokyo] "Hello there!" *she smiled warmly*',
    );

    const activePreset = sillyTavernPresetStore.activePreset;

    const handleCreateNewPreset = () => {
      const created = sillyTavernPresetStore.createNewPreset(
        newPresetName.trim() || undefined,
      );
      setNewPresetName('');
      Alert.alert(
        'Preset Saved',
        `Created and activated new preset "${created.name}". You can save as many presets as you want!`,
      );
    };

    const handleDuplicateActivePreset = () => {
      if (!activePreset) {
        return;
      }
      const copy = sillyTavernPresetStore.duplicatePreset(activePreset.id);
      Alert.alert(
        'Preset Cloned',
        `Duplicated "${activePreset.name}" as "${copy.name}".`,
      );
    };

    const handleImportPreset = async () => {
      try {
        const fileUriOrContent = await pickJsonFile();
        if (!fileUriOrContent) {
          return;
        }
        const parsed = fileUriOrContent.trim().startsWith('{')
          ? JSON.parse(fileUriOrContent)
          : await readJsonFile(fileUriOrContent);
        const preset = await sillyTavernPresetStore.importPreset(parsed);
        Alert.alert(
          'Imported Preset',
          `Successfully imported "${preset.name}".`,
        );
      } catch (err: any) {
        Alert.alert(
          'Import Failed',
          err?.message || 'Could not parse preset JSON.',
        );
      }
    };

    const handleExportPreset = async () => {
      try {
        if (!activePreset) {
          return;
        }
        await sillyTavernPresetStore.exportPresetToFile(activePreset.id);
      } catch (err: any) {
        Alert.alert(
          'Export Failed',
          err?.message || 'Could not export preset.',
        );
      }
    };

    const handleSamplerChange = (key: string, value: number) => {
      if (!activePreset) {
        return;
      }
      sillyTavernPresetStore.updateSampler(activePreset.id, {
        [key]: value,
      } as any);
    };

    const handleAddCustomPrompt = () => {
      if (!activePreset || !newPromptContent.trim()) {
        return;
      }
      sillyTavernPresetStore.addCustomPromptItem(activePreset.id, {
        name: newPromptName.trim() || 'Custom Prompt Block',
        role: 'system',
        content: newPromptContent.trim(),
        enabled: true,
      });
      setNewPromptName('');
      setNewPromptContent('');
    };

    const handleAddRegexRule = () => {
      if (!activePreset || !rxFind.trim()) {
        return;
      }
      sillyTavernPresetStore.addRegexScript(activePreset.id, {
        scriptName: rxName.trim() || 'Complex Regex Rule',
        findRegex: rxFind.trim(),
        replaceString: rxReplace,
        placement: [1, 2],
        markdownOnly: rxScope === 'display',
        promptOnly: rxScope === 'prompt',
      });
      setRxName('');
      setRxFind('');
      setRxReplace('');
    };

    const orderEntries = activePreset?.prompt_order?.[0]?.order || [];
    const regexScripts = activePreset?.regex_scripts || [];
    const breakdown = uiStore.lastContextBreakdown;

    const regexPreviewResult = React.useMemo(() => {
      if (!rxSampleText) {
        return '';
      }
      const tempScripts = [
        ...regexScripts,
        ...(rxFind.trim()
          ? [
              {
                id: 'preview_rx',
                scriptName: 'Preview',
                findRegex: rxFind.trim(),
                replaceString: rxReplace,
                placement: [1, 2],
                disabled: false,
              },
            ]
          : []),
      ];
      return applySillyTavernRegexScripts(rxSampleText, tempScripts, {
        placement: 2,
        isMarkdownRender: true,
      });
    }, [rxSampleText, regexScripts, rxFind, rxReplace]);

    return (
      <Sheet
        isVisible={isVisible}
        onClose={onDismiss}
        title="SillyTavern Preset, Context & Regex Manager"
        snapPoints={['88%']}>
        <Sheet.ScrollView contentContainerStyle={styles.container}>
          {/* Navigation Tabs */}
          <View style={styles.tabsContainer}>
            {(
              [
                ['presets', 'Presets'],
                ['prompts', 'Prompts'],
                ['samplers', 'Context & Samplers'],
                ['regex', 'Regex'],
                ['utility', 'Macros'],
              ] as Array<[TabKey, string]>
            ).map(([key, label]) => (
              <TouchableOpacity
                key={key}
                style={[
                  styles.tabButton,
                  activeTab === key && styles.tabButtonActive,
                ]}
                onPress={() => setActiveTab(key)}>
                <Text
                  style={[
                    styles.tabButtonText,
                    activeTab === key && styles.tabButtonTextActive,
                  ]}>
                  {label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {activeTab === 'presets' && (
            <View style={styles.tabSection}>
              <Text style={styles.description}>
                Save as many presets as you want! Create new presets, clone
                existing ones, or import SillyTavern & Tavo (.tbk) presets.
              </Text>

              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 8,
                  marginBottom: 8,
                }}>
                <View style={{flex: 1}}>
                  <TextInput
                    label="New Preset Name"
                    value={newPresetName}
                    onChangeText={setNewPresetName}
                    placeholder="e.g. Dark Fantasy 64k, Whisper Custom..."
                  />
                </View>
                <Button mode="contained" onPress={handleCreateNewPreset}>
                  + Save New
                </Button>
              </View>

              <View style={styles.actionRow}>
                <Button
                  mode="contained-tonal"
                  onPress={handleDuplicateActivePreset}
                  style={styles.actionButton}>
                  Clone Active
                </Button>
                <Button
                  mode="contained-tonal"
                  onPress={handleImportPreset}
                  style={styles.actionButton}>
                  Import JSON / .tbk
                </Button>
                <Button
                  mode="outlined"
                  onPress={handleExportPreset}
                  style={styles.actionButton}>
                  Export
                </Button>
              </View>

              <Text style={styles.sectionTitle}>
                Saved Presets ({sillyTavernPresetStore.presets.length})
              </Text>
              {sillyTavernPresetStore.presets.map(preset => {
                const isActive =
                  preset.id === sillyTavernPresetStore.activePresetId;
                return (
                  <TouchableOpacity
                    key={preset.id}
                    style={[
                      styles.presetCard,
                      isActive && styles.presetCardActive,
                    ]}
                    onPress={() =>
                      sillyTavernPresetStore.setActivePreset(preset.id)
                    }>
                    <View style={{flex: 1}}>
                      <View style={styles.presetTitleRow}>
                        <Text style={styles.presetName}>{preset.name}</Text>
                        {isActive && (
                          <View style={styles.activeBadge}>
                            <Text style={styles.activeBadgeText}>Active</Text>
                          </View>
                        )}
                      </View>
                      {preset.description ? (
                        <Text style={styles.presetDesc}>
                          {preset.description}
                        </Text>
                      ) : null}
                    </View>
                    {!preset.isBuiltin && (
                      <Button
                        mode="text"
                        textColor={theme.colors.error}
                        onPress={() =>
                          sillyTavernPresetStore.deletePreset(preset.id)
                        }>
                        Delete
                      </Button>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {activeTab === 'prompts' && (
            <View style={styles.tabSection}>
              <Text style={styles.description}>
                Prompt Manager defines the exact order and permanent system
                prompts injected into the context window.
              </Text>

              <View style={styles.promptItem}>
                <Text style={styles.promptItemName}>
                  + Add Custom Prompt Block
                </Text>
                <TextInput
                  label="Prompt Title"
                  value={newPromptName}
                  onChangeText={setNewPromptName}
                  placeholder="e.g. 🎭 Narrative Style, Status Bar Rules..."
                />
                <TextInput
                  label="Prompt Content (Supports {{char}}, {{user}}, macros)"
                  value={newPromptContent}
                  onChangeText={setNewPromptContent}
                  placeholder="Write instructions to inject into context..."
                  multiline
                  numberOfLines={2}
                />
                <Button
                  mode="contained-tonal"
                  onPress={handleAddCustomPrompt}
                  disabled={!newPromptContent.trim()}
                  style={{marginTop: 6}}>
                  Add Prompt to Preset
                </Button>
              </View>

              <Text style={styles.sectionTitle}>
                Prompt Order ({activePreset?.prompts?.length || 0} entries)
              </Text>
              {activePreset?.prompts?.map((prompt, idx) => {
                const isEnabled =
                  orderEntries.find(p => p.identifier === prompt.identifier)
                    ?.enabled ??
                  prompt.enabled ??
                  true;
                return (
                  <View
                    key={prompt.identifier || idx}
                    style={styles.promptItem}>
                    <View style={styles.promptItemHeader}>
                      <View style={{flex: 1, paddingRight: 10}}>
                        <Text style={styles.promptItemName}>{prompt.name}</Text>
                        <Text style={styles.promptItemRole}>
                          {prompt.role || 'system'} •{' '}
                          {prompt.marker ? 'Marker' : 'Prompt'}
                        </Text>
                      </View>
                      <Switch
                        value={Boolean(isEnabled)}
                        onValueChange={enabled =>
                          sillyTavernPresetStore.togglePrompt(
                            activePreset.id,
                            prompt.identifier,
                            enabled,
                          )
                        }
                      />
                    </View>
                    {prompt.content ? (
                      <Text style={styles.promptItemContent} numberOfLines={3}>
                        {prompt.content}
                      </Text>
                    ) : null}
                  </View>
                );
              })}
            </View>
          )}

          {activeTab === 'samplers' && (
            <View style={styles.tabSection}>
              <Text style={styles.sectionTitle}>
                Smart Context Management Engine
              </Text>
              <Text style={styles.description}>
                Calculates permanent context tokens (AI Preset + Character Card
                + Lorebook + Memories) and automatically trims the oldest chat
                messages so permanent memory is never lost when set to e.g. 64k.
              </Text>

              <View
                style={{
                  flexDirection: 'row',
                  flexWrap: 'wrap',
                  gap: 6,
                  marginVertical: 8,
                }}>
                {CONTEXT_PRESET_CHIPS.map(chip => {
                  const selected = uiStore.contextWindowLimit === chip.value;
                  return (
                    <TouchableOpacity
                      key={chip.label}
                      onPress={() => uiStore.setContextWindowLimit(chip.value)}
                      style={[
                        styles.tabButton,
                        selected && styles.tabButtonActive,
                        {paddingHorizontal: 12, paddingVertical: 6},
                      ]}>
                      <Text
                        style={[
                          styles.tabButtonText,
                          selected && styles.tabButtonTextActive,
                        ]}>
                        {chip.label} ({chip.value.toLocaleString()})
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {breakdown && (
                <View style={styles.promptItem}>
                  <Text style={styles.promptItemName}>
                    Last Turn Context Breakdown (Limit:{' '}
                    {breakdown.maxContextTokens.toLocaleString()} tokens)
                  </Text>
                  <Text style={styles.promptItemContent}>
                    • Permanent Pinned (Preset + Card + Lore + Memory):{' '}
                    {breakdown.permanentPinnedTokens.toLocaleString()} tokens
                    {'\n'}• Reserved Output Generation:{' '}
                    {breakdown.reservedOutputTokens.toLocaleString()} tokens
                    {'\n'}• Available Chat History Budget:{' '}
                    {breakdown.availableHistoryBudget.toLocaleString()} tokens
                    {'\n'}• Used History:{' '}
                    {breakdown.usedHistoryTokens.toLocaleString()} tokens (
                    {breakdown.keptMessagesCount} messages kept,{' '}
                    {breakdown.droppedOldestMessagesCount} oldest trimmed)
                  </Text>
                </View>
              )}

              <View style={styles.sliderRow}>
                <InputSlider
                  label="Reserved Output Budget (max_tokens)"
                  value={uiStore.reservedOutputTokens}
                  onValueChange={val =>
                    uiStore.setReservedOutputTokens(Math.round(val))
                  }
                  min={256}
                  max={8192}
                  step={128}
                  precision={0}
                />
              </View>

              <Text style={styles.sectionTitle}>Generation Samplers</Text>
              <View style={styles.sliderRow}>
                <InputSlider
                  label="Temperature"
                  value={activePreset?.temperature ?? 1.0}
                  onValueChange={val => handleSamplerChange('temperature', val)}
                  min={0.0}
                  max={2.0}
                  step={0.05}
                  precision={2}
                />
              </View>

              <View style={styles.sliderRow}>
                <InputSlider
                  label="Top P"
                  value={activePreset?.top_p ?? 0.95}
                  onValueChange={val => handleSamplerChange('top_p', val)}
                  min={0.0}
                  max={1.0}
                  step={0.01}
                  precision={2}
                />
              </View>

              <View style={styles.sliderRow}>
                <InputSlider
                  label="Min P"
                  value={activePreset?.min_p ?? 0.05}
                  onValueChange={val => handleSamplerChange('min_p', val)}
                  min={0.0}
                  max={1.0}
                  step={0.01}
                  precision={2}
                />
              </View>

              <View style={styles.sliderRow}>
                <InputSlider
                  label="Repetition Penalty"
                  value={activePreset?.repetition_penalty ?? 1.1}
                  onValueChange={val =>
                    handleSamplerChange('repetition_penalty', val)
                  }
                  min={1.0}
                  max={2.0}
                  step={0.02}
                  precision={2}
                />
              </View>
            </View>
          )}

          {activeTab === 'regex' && (
            <View style={styles.tabSection}>
              <Text style={styles.description}>
                Complex Regex Engine: Supports capture groups ($1..$9,
                $&lt;name&gt;, &#123;&#123;match&#125;&#125;), lookarounds,
                multiline/dotAll flags (/pattern/gmsiu), and HTML/CSS status bar
                replacement.
              </Text>

              <View style={styles.promptItem}>
                <Text style={styles.promptItemName}>
                  + Add Complex Regex Script
                </Text>
                <TextInput
                  label="Rule Name"
                  value={rxName}
                  onChangeText={setRxName}
                  placeholder="e.g. RPG Status Bar HTML, Strip CoT Tags..."
                />
                <TextInput
                  label="Find Regex (e.g. /\[HP:\s*(\d+\/\d+)\s*\|\s*Location:\s*([^\]]+)\]/gi)"
                  value={rxFind}
                  onChangeText={setRxFind}
                  placeholder="/\[Status:\s*(.*?)\]/gs"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <TextInput
                  label="Replace String / HTML (Supports $1, $2, $<group>, {{match}})"
                  value={rxReplace}
                  onChangeText={setRxReplace}
                  placeholder='<div class="rpg-hud">❤️ $1 | 📍 $2</div>'
                  autoCapitalize="none"
                  autoCorrect={false}
                  multiline
                />
                <View
                  style={{
                    flexDirection: 'row',
                    gap: 6,
                    marginVertical: 6,
                  }}>
                  {(
                    [
                      ['both', 'Prompt + Display'],
                      ['display', 'Display Only (UI)'],
                      ['prompt', 'Prompt Only (AI)'],
                    ] as const
                  ).map(([sc, lbl]) => (
                    <TouchableOpacity
                      key={sc}
                      onPress={() => setRxScope(sc)}
                      style={[
                        styles.tabButton,
                        rxScope === sc && styles.tabButtonActive,
                      ]}>
                      <Text
                        style={[
                          styles.tabButtonText,
                          rxScope === sc && styles.tabButtonTextActive,
                        ]}>
                        {lbl}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <Button
                  mode="contained"
                  onPress={handleAddRegexRule}
                  disabled={!rxFind.trim()}>
                  Save Regex Rule
                </Button>
              </View>

              <View style={styles.promptItem}>
                <Text style={styles.promptItemName}>Live Regex Test Bench</Text>
                <TextInput
                  label="Sample Input Text"
                  value={rxSampleText}
                  onChangeText={setRxSampleText}
                  multiline
                />
                <Text
                  style={[
                    styles.promptItemRole,
                    {marginTop: 6, fontWeight: '700'},
                  ]}>
                  Transformed Output:
                </Text>
                <Text style={styles.promptItemContent}>
                  {regexPreviewResult}
                </Text>
              </View>

              <Text style={styles.sectionTitle}>
                Active Regex Scripts ({regexScripts.length})
              </Text>
              {regexScripts.map(rx => (
                <View key={rx.id} style={styles.promptItem}>
                  <View style={styles.promptItemHeader}>
                    <View style={{flex: 1, paddingRight: 8}}>
                      <Text style={styles.promptItemName}>{rx.scriptName}</Text>
                      <Text style={styles.promptItemRole}>
                        Find: {rx.findRegex}
                      </Text>
                      <Text style={styles.promptItemContent} numberOfLines={2}>
                        Replace: {rx.replaceString || '(empty / strip)'}
                      </Text>
                    </View>
                    <Switch
                      value={!rx.disabled}
                      onValueChange={enabled =>
                        sillyTavernPresetStore.toggleRegexScript(
                          activePreset.id,
                          rx.id,
                          enabled,
                        )
                      }
                    />
                    <Button
                      mode="text"
                      compact
                      textColor={theme.colors.error}
                      onPress={() =>
                        sillyTavernPresetStore.deleteRegexScript(
                          activePreset.id,
                          rx.id,
                        )
                      }>
                      Del
                    </Button>
                  </View>
                </View>
              ))}
            </View>
          )}

          {activeTab === 'utility' && (
            <View style={styles.tabSection}>
              <View style={styles.promptItem}>
                <View style={styles.promptItemHeader}>
                  <View style={{flex: 1, paddingRight: 12}}>
                    <Text style={styles.promptItemName}>
                      Experimental Macro Engine
                    </Text>
                    <Text style={styles.promptItemContent}>
                      {
                        'Enable inside-out nested macro recursion, .var / $var shorthands, conditionals ({{if}}...{{else}}...{{/if}}), math/calc ({{calc}}), and pipe filters ({{char | uppercase}}).'
                      }
                    </Text>
                  </View>
                  <Switch
                    value={sillyTavernPresetStore.experimentalMacroEngine}
                    onValueChange={val =>
                      sillyTavernPresetStore.setExperimentalMacroEngine(val)
                    }
                  />
                </View>
              </View>

              <Text style={styles.description}>
                Configure User Persona, in-chat Author Notes, and system nudges.
              </Text>
              <TextInput
                label="User Name ({{user}})"
                value={sillyTavernPresetStore.userName}
                onChangeText={val => sillyTavernPresetStore.setUserName(val)}
                placeholder="User"
              />
              <TextInput
                label="User Persona ({{persona}})"
                value={sillyTavernPresetStore.userPersona}
                onChangeText={val => sillyTavernPresetStore.setUserPersona(val)}
                placeholder="Describe your character or persona..."
                multiline
                numberOfLines={2}
              />
              <TextInput
                label="Author's Note"
                value={activePreset?.authors_note || ''}
                onChangeText={val =>
                  activePreset &&
                  sillyTavernPresetStore.updateUtility(activePreset.id, {
                    authors_note: val,
                  })
                }
                placeholder="e.g. Write vividly with focus on dialogue and emotions."
                multiline
                numberOfLines={3}
              />
              <TextInput
                label="Continue Nudge Prompt"
                value={activePreset?.continue_nudge_prompt || ''}
                onChangeText={val =>
                  activePreset &&
                  sillyTavernPresetStore.updateUtility(activePreset.id, {
                    continue_nudge_prompt: val,
                  })
                }
                placeholder="Continue your response naturally..."
              />
              <TextInput
                label="Impersonation Prompt"
                value={activePreset?.impersonation_prompt || ''}
                onChangeText={val =>
                  activePreset &&
                  sillyTavernPresetStore.updateUtility(activePreset.id, {
                    impersonation_prompt: val,
                  })
                }
                placeholder="Write the next response as {{user}}..."
              />
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
