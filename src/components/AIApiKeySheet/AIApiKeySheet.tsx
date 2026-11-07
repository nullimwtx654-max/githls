import React, {useState, useEffect, useRef} from 'react';
import {View, TouchableOpacity} from 'react-native';
import {
  Text,
  Button,
  Snackbar,
  TextInput as PaperTextInput,
} from 'react-native-paper';
import {observer} from 'mobx-react';

import {Sheet, TextInput} from '..';
import {useTheme} from '../../hooks';
import {aiProviderStore, modelStore} from '../../store';
import {EyeIcon, EyeOffIcon, PlusIcon} from '../../assets/icons';
import {createStyles} from './styles';

interface AIApiKeySheetProps {
  isVisible: boolean;
  onDismiss: () => void;
  initialProviderId?: string;
}

export const AIApiKeySheet: React.FC<AIApiKeySheetProps> = observer(
  ({isVisible, onDismiss, initialProviderId}) => {
    const theme = useTheme();
    const styles = createStyles(theme);

    const [selectedProviderId, setSelectedProviderId] = useState<string>(
      initialProviderId || aiProviderStore.activeProviderId || 'openai',
    );
    const [profileName, setProfileName] = useState('');
    const [apiKey, setApiKey] = useState('');
    const [baseUrl, setBaseUrl] = useState('');
    const [activeModel, setActiveModel] = useState('');
    const [customModel, setCustomModel] = useState('');
    const [secureTextEntry, setSecureTextEntry] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [snackbarMsg, setSnackbarMsg] = useState<string | null>(null);
    const wasVisibleRef = useRef(false);

    const activeProvider =
      aiProviderStore.providers.find(p => p.id === selectedProviderId) ||
      aiProviderStore.providers[0];

    useEffect(() => {
      if (isVisible && !wasVisibleRef.current) {
        const id =
          initialProviderId ||
          aiProviderStore.activeProviderId ||
          aiProviderStore.providers[0]?.id ||
          'openai';
        setSelectedProviderId(id);
        const prov =
          aiProviderStore.providers.find(p => p.id === id) ||
          aiProviderStore.providers[0];
        if (prov) {
          setProfileName(prov.name || '');
          setApiKey(aiProviderStore.getKey(prov.id) || prov.apiKey || '');
          setBaseUrl(prov.baseUrl || '');
          setActiveModel(prov.activeModel || prov.models[0] || '');
          setCustomModel('');
        }
      }
      wasVisibleRef.current = isVisible;
    }, [isVisible, initialProviderId]);

    const handleSelectProvider = (id: string) => {
      setSelectedProviderId(id);
      const prov = aiProviderStore.providers.find(p => p.id === id);
      if (prov) {
        setProfileName(prov.name || '');
        setApiKey(aiProviderStore.getKey(prov.id) || prov.apiKey || '');
        setBaseUrl(prov.baseUrl || '');
        setActiveModel(prov.activeModel || prov.models[0] || '');
        setCustomModel('');
      }
    };

    const handleAddCustomModel = () => {
      const trimmed = customModel.trim();
      if (!trimmed || !activeProvider) {
        setSnackbarMsg('Enter a custom model ID first (e.g. deepseek-chat)');
        return;
      }
      const saved = aiProviderStore.addCustomModel(activeProvider.id, trimmed);
      if (saved) {
        setActiveModel(saved);
        setCustomModel('');
        setSnackbarMsg(`Saved & selected model "${saved}"`);
      }
    };

    const handleRemoveModel = (modelName: string) => {
      if (!activeProvider) {
        return;
      }
      aiProviderStore.removeModel(activeProvider.id, modelName);
      if (activeModel === modelName) {
        const next = activeProvider.models.find(m => m !== modelName) || '';
        setActiveModel(next);
      }
      setSnackbarMsg(`Removed model "${modelName}"`);
    };

    const handleCreateNewProfile = async () => {
      const count = aiProviderStore.providers.length + 1;
      const modelToUse = customModel.trim() || activeModel || 'gpt-4o-mini';
      const created = await aiProviderStore.addCustomProvider({
        name: `Custom API #${count}`,
        baseUrl: baseUrl.trim() || 'https://api.openai.com',
        apiKey: apiKey.trim(),
        defaultModel: modelToUse,
      });
      handleSelectProvider(created.id);
      setSnackbarMsg(`Created new API profile "${created.name}"`);
    };

    const handleCloneProfile = async () => {
      if (!activeProvider) {
        return;
      }
      const cloned = await aiProviderStore.duplicateProvider(activeProvider.id);
      if (cloned) {
        handleSelectProvider(cloned.id);
        setSnackbarMsg(
          `Duplicated "${activeProvider.name}" as "${cloned.name}"`,
        );
      }
    };

    const handleDeleteProfile = () => {
      if (!activeProvider) {
        return;
      }
      const deletedName = activeProvider.name;
      aiProviderStore.deleteProvider(activeProvider.id);
      const nextId = aiProviderStore.providers[0]?.id || 'openai';
      handleSelectProvider(nextId);
      setSnackbarMsg(`Deleted API profile "${deletedName}"`);
    };

    const handleSaveAndActivate = async () => {
      if (!activeProvider) {
        return;
      }
      setIsSaving(true);
      try {
        const targetId = activeProvider.id;
        const modelToSave =
          customModel.trim() ||
          activeModel.trim() ||
          activeProvider.activeModel ||
          activeProvider.models[0] ||
          'gpt-4o-mini';

        if (profileName.trim()) {
          aiProviderStore.renameProvider(targetId, profileName.trim());
        }
        if (customModel.trim()) {
          aiProviderStore.addCustomModel(targetId, customModel.trim());
          setActiveModel(customModel.trim());
          setCustomModel('');
        }

        const effectiveKey = apiKey.trim() || 'sk-local-endpoint';
        await aiProviderStore.setProviderConfigAndKey(targetId, {
          apiKey: effectiveKey,
          baseUrl: baseUrl.trim() || activeProvider.baseUrl,
          defaultModel: modelToSave,
          activateNow: true,
        });
        aiProviderStore.setActiveProvider(targetId);

        setSnackbarMsg(
          `Activated ${modelToSave} on ${profileName.trim() || activeProvider.name}`,
        );
        setTimeout(() => {
          onDismiss();
        }, 350);
      } catch (err: any) {
        setSnackbarMsg(
          'Failed to activate provider: ' + (err?.message || 'Unknown error'),
        );
      } finally {
        setIsSaving(false);
      }
    };

    const handleClear = async () => {
      if (!activeProvider) {
        return;
      }
      try {
        await aiProviderStore.clearApiKey(activeProvider.id);
        setApiKey('');
        setSnackbarMsg(`Cleared API key for ${activeProvider.name}`);
      } catch {
        setSnackbarMsg('Failed to clear key');
      }
    };

    const isConfigured = Boolean(
      activeProvider && aiProviderStore.hasKey(activeProvider.id),
    );
    const isCustomDeletable = Boolean(
      activeProvider &&
        (activeProvider.isCustom || activeProvider.id.startsWith('custom_')) &&
        activeProvider.id !== 'custom',
    );
    const currentlyActiveCloudModel = modelStore.activeModel;

    return (
      <Sheet
        isVisible={isVisible}
        onClose={onDismiss}
        title="Cloud AI Providers & Custom Models"
        snapPoints={['90%']}>
        <Sheet.ScrollView contentContainerStyle={styles.container}>
          {currentlyActiveCloudModel && (
            <View
              style={{
                paddingHorizontal: 12,
                paddingVertical: 8,
                borderRadius: 10,
                backgroundColor: theme.colors.primaryContainer,
                marginBottom: 8,
              }}>
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: '700',
                  color: theme.colors.onPrimaryContainer,
                }}>
                Active Model: {currentlyActiveCloudModel.name}
              </Text>
            </View>
          )}

          <Text style={styles.description}>
            Save unlimited API profiles, custom OpenAI/OpenRouter/DeepSeek
            endpoints, and custom model IDs.
          </Text>

          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 8,
              flexWrap: 'wrap',
              gap: 8,
            }}>
            <Text style={styles.label}>
              Saved API Profiles ({aiProviderStore.providers.length})
            </Text>
            <View style={{flexDirection: 'row', gap: 6}}>
              <Button
                mode="contained-tonal"
                compact
                onPress={handleCreateNewProfile}>
                + New Profile
              </Button>
              <Button mode="outlined" compact onPress={handleCloneProfile}>
                Clone
              </Button>
              {isCustomDeletable && (
                <Button
                  mode="text"
                  compact
                  textColor={theme.colors.error}
                  onPress={handleDeleteProfile}>
                  Delete
                </Button>
              )}
            </View>
          </View>

          <View style={styles.providerSelectorRow}>
            {aiProviderStore.providers.map(provider => {
              const isSelected = provider.id === activeProvider?.id;
              const hasKey = aiProviderStore.hasKey(provider.id);
              return (
                <TouchableOpacity
                  key={provider.id}
                  style={[
                    styles.providerChip,
                    isSelected && styles.providerChipActive,
                  ]}
                  onPress={() => handleSelectProvider(provider.id)}>
                  <Text
                    style={[
                      styles.providerChipText,
                      isSelected && styles.providerChipTextActive,
                    ]}>
                    {provider.name}
                    {hasKey ? ' • Ready' : ''}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {activeProvider && (
            <View style={styles.inputSection}>
              <Text
                style={[
                  styles.statusBadge,
                  isConfigured
                    ? styles.statusConfigured
                    : styles.statusNotConfigured,
                ]}>
                {isConfigured
                  ? `Configured • Model: ${customModel.trim() || activeModel}`
                  : 'Enter API Key or Endpoint Below'}
              </Text>

              <TextInput
                label="API Profile Name"
                value={profileName}
                onChangeText={setProfileName}
                placeholder="e.g. OpenRouter DeepSeek, My Proxy..."
                autoCapitalize="words"
              />

              <TextInput
                label="Base URL / Endpoint"
                value={baseUrl}
                onChangeText={setBaseUrl}
                placeholder="https://api.openai.com"
                autoCapitalize="none"
                autoCorrect={false}
              />

              <TextInput
                label={`${activeProvider.name} API Key`}
                value={apiKey}
                onChangeText={setApiKey}
                placeholder="sk-... (optional for local servers)"
                autoCapitalize="none"
                autoCorrect={false}
                spellCheck={false}
                secureTextEntry={secureTextEntry}
                right={
                  <PaperTextInput.Icon
                    icon={({color}) =>
                      secureTextEntry ? (
                        <EyeIcon width={24} height={24} stroke={color} />
                      ) : (
                        <EyeOffIcon width={24} height={24} stroke={color} />
                      )
                    }
                    onPress={() => setSecureTextEntry(prev => !prev)}
                  />
                }
              />

              <Text style={styles.label}>
                Saved Models for {activeProvider.name} ({activeProvider.models.length})
              </Text>
              <View style={styles.modelSelectContainer}>
                {activeProvider.models.map(model => {
                  const isModelActive =
                    activeModel === model && !customModel.trim();
                  return (
                    <View
                      key={model}
                      style={[
                        styles.modelChip,
                        isModelActive && styles.modelChipActive,
                        {flexDirection: 'row', alignItems: 'center', gap: 6},
                      ]}>
                      <TouchableOpacity
                        onPress={() => {
                          setActiveModel(model);
                          setCustomModel('');
                          aiProviderStore.setActiveModel(
                            activeProvider.id,
                            model,
                          );
                        }}>
                        <Text
                          style={[
                            styles.modelChipText,
                            isModelActive && styles.modelChipTextActive,
                          ]}>
                          {model}
                        </Text>
                      </TouchableOpacity>
                      {activeProvider.models.length > 1 && (
                        <TouchableOpacity
                          hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}
                          onPress={() => handleRemoveModel(model)}>
                          <Text
                            style={[
                              styles.modelChipText,
                              isModelActive && styles.modelChipTextActive,
                              {fontWeight: '700', opacity: 0.75},
                            ]}>
                            ×
                          </Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  );
                })}
              </View>

              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 8,
                  marginTop: 4,
                }}>
                <View style={{flex: 1}}>
                  <TextInput
                    label="Add Custom Model ID"
                    value={customModel}
                    onChangeText={setCustomModel}
                    onSubmitEditing={handleAddCustomModel}
                    placeholder="e.g. deepseek-v4-flash, claude-3-7-sonnet..."
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>
                <Button
                  mode="contained-tonal"
                  onPress={handleAddCustomModel}
                  disabled={!customModel.trim()}
                  style={{marginTop: 6}}
                  icon={({color}) => (
                    <PlusIcon width={16} height={16} stroke={color} />
                  )}>
                  Save Model
                </Button>
              </View>
            </View>
          )}
        </Sheet.ScrollView>

        <Sheet.Actions>
          <View style={styles.buttonsContainer}>
            {isConfigured ? (
              <Button
                mode="text"
                onPress={handleClear}
                style={styles.clearButton}
                textColor={theme.colors.error}>
                Clear Key
              </Button>
            ) : (
              <View />
            )}
            <View style={styles.rightButtons}>
              <Button mode="text" onPress={onDismiss}>
                Cancel
              </Button>
              <Button
                mode="contained"
                onPress={handleSaveAndActivate}
                loading={isSaving}
                disabled={isSaving}
                style={styles.saveButton}>
                Save & Activate
              </Button>
            </View>
          </View>
        </Sheet.Actions>

        <Snackbar
          visible={Boolean(snackbarMsg)}
          onDismiss={() => setSnackbarMsg(null)}
          duration={2500}
          style={styles.errorSnackbar}>
          {snackbarMsg || ''}
        </Snackbar>
      </Sheet>
    );
  },
);
