import React, {useState, useEffect} from 'react';
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
import {aiProviderStore} from '../../store';
import {EyeIcon, EyeOffIcon} from '../../assets/icons';
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

    const activeProvider = aiProviderStore.providers.find(
      p => p.id === selectedProviderId,
    );

    useEffect(() => {
      if (isVisible) {
        const id =
          initialProviderId ||
          selectedProviderId ||
          aiProviderStore.activeProviderId ||
          'openai';
        setSelectedProviderId(id);
        const prov = aiProviderStore.providers.find(p => p.id === id);
        if (prov) {
          setProfileName(prov.name || '');
          setApiKey(aiProviderStore.getKey(prov.id) || prov.apiKey || '');
          setBaseUrl(prov.baseUrl || '');
          setActiveModel(prov.activeModel || prov.models[0] || '');
        }
      }
    }, [isVisible, initialProviderId, selectedProviderId]);

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

    const handleCreateNewProfile = async () => {
      const count = aiProviderStore.providers.length + 1;
      const created = await aiProviderStore.addCustomProvider({
        name: `Custom API #${count}`,
        baseUrl: baseUrl.trim() || 'https://api.openai.com',
        apiKey: apiKey.trim(),
        defaultModel: customModel.trim() || activeModel || 'gpt-4o-mini',
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
        setSnackbarMsg(`Duplicated "${activeProvider.name}" as "${cloned.name}"`);
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

    const handleSave = async () => {
      if (!selectedProviderId) {
        return;
      }
      setIsSaving(true);
      try {
        const modelToSave = customModel.trim() || activeModel;
        if (profileName.trim()) {
          aiProviderStore.renameProvider(selectedProviderId, profileName.trim());
        }
        if (baseUrl.trim()) {
          aiProviderStore.setBaseUrl(selectedProviderId, baseUrl.trim());
        }
        await aiProviderStore.setApiKey(selectedProviderId, apiKey.trim());
        if (modelToSave) {
          aiProviderStore.setActiveModel(selectedProviderId, modelToSave);
        }
        aiProviderStore.setActiveProvider(selectedProviderId);
        setSnackbarMsg(`Saved & activated ${profileName || activeProvider?.name}`);
        setTimeout(() => {
          onDismiss();
        }, 600);
      } catch (err: any) {
        setSnackbarMsg(
          'Failed to save API key: ' + (err?.message || 'Unknown error'),
        );
      } finally {
        setIsSaving(false);
      }
    };

    const handleClear = async () => {
      if (!selectedProviderId) {
        return;
      }
      try {
        await aiProviderStore.clearApiKey(selectedProviderId);
        setApiKey('');
        setSnackbarMsg(`Cleared API key for ${activeProvider?.name}`);
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

    return (
      <Sheet
        isVisible={isVisible}
        onClose={onDismiss}
        title="AI Cloud Providers & Unlimited Saved APIs"
        snapPoints={['88%']}>
        <Sheet.ScrollView contentContainerStyle={styles.container}>
          <Text style={styles.description}>
            Save as many API profiles, reverse proxies, Tavo endpoints, and
            model connections as you want and switch between them at any time.
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
                + New API Profile
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
              const isSelected = provider.id === selectedProviderId;
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
                {isConfigured ? 'Configured & Ready' : 'Not Configured'}
              </Text>

              <TextInput
                label="API Profile Name"
                value={profileName}
                onChangeText={setProfileName}
                placeholder="e.g. OpenRouter DeepSeek R1, My Proxy #2..."
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
                placeholder="sk-..."
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

              <Text style={styles.label}>Select or Enter Model</Text>
              <View style={styles.modelSelectContainer}>
                {activeProvider.models.map(model => {
                  const isModelActive = activeModel === model && !customModel;
                  return (
                    <TouchableOpacity
                      key={model}
                      style={[
                        styles.modelChip,
                        isModelActive && styles.modelChipActive,
                      ]}
                      onPress={() => {
                        setActiveModel(model);
                        setCustomModel('');
                      }}>
                      <Text
                        style={[
                          styles.modelChipText,
                          isModelActive && styles.modelChipTextActive,
                        ]}>
                        {model}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <TextInput
                label="Custom Model Name (Adds to saved models list)"
                value={customModel}
                onChangeText={setCustomModel}
                placeholder="e.g. deepseek-v4-flash, claude-3-7-sonnet, etc."
                autoCapitalize="none"
                autoCorrect={false}
              />
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
                onPress={handleSave}
                loading={isSaving}
                disabled={isSaving || !apiKey.trim()}
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
