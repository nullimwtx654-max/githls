import {makeAutoObservable, runInAction} from 'mobx';
import {makePersistable} from 'mobx-persist-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Keychain from 'react-native-keychain';

import {serverStore} from './ServerStore';
import {modelStore} from './ModelStore';
import {CompletionParams} from '../utils/completionTypes';
import {Model, ModelOrigin, ModelType} from '../utils/types';

export type AIProviderId = string;

export interface AIProviderConfig {
  id: AIProviderId;
  name: string;
  label: string;
  baseUrl: string;
  defaultModel: string;
  activeModel: string;
  popularModels: string[];
  models: string[];
  enabled?: boolean;
  isCustom?: boolean;
  platform?: string;
  apiKey?: string;
}

export class AIProviderStore {
  activeProviderId: AIProviderId = 'openai';
  useApiKeyForChat: boolean = true;

  providers: AIProviderConfig[] = [
    {
      id: 'openai',
      name: 'OpenAI',
      label: 'OpenAI',
      baseUrl: 'https://api.openai.com',
      defaultModel: 'gpt-4o-mini',
      activeModel: 'gpt-4o-mini',
      popularModels: ['gpt-4o-mini', 'gpt-4o', 'o3-mini', 'gpt-3.5-turbo'],
      models: ['gpt-4o-mini', 'gpt-4o', 'o3-mini', 'gpt-3.5-turbo'],
      enabled: true,
    },
    {
      id: 'openrouter',
      name: 'OpenRouter',
      label: 'OpenRouter',
      baseUrl: 'https://openrouter.ai/api',
      defaultModel: 'openai/gpt-4o-mini',
      activeModel: 'openai/gpt-4o-mini',
      popularModels: [
        'openai/gpt-4o-mini',
        'anthropic/claude-3.5-sonnet',
        'deepseek/deepseek-chat',
        'meta-llama/llama-3.3-70b-instruct',
      ],
      models: [
        'openai/gpt-4o-mini',
        'anthropic/claude-3.5-sonnet',
        'deepseek/deepseek-chat',
        'meta-llama/llama-3.3-70b-instruct',
      ],
      enabled: true,
    },
    {
      id: 'gemini',
      name: 'Google Gemini',
      label: 'Google Gemini',
      baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
      defaultModel: 'gemini-2.5-flash',
      activeModel: 'gemini-2.5-flash',
      popularModels: [
        'gemini-2.5-flash',
        'gemini-2.5-pro',
        'gemini-1.5-flash',
        'gemini-1.5-pro',
      ],
      models: [
        'gemini-2.5-flash',
        'gemini-2.5-pro',
        'gemini-1.5-flash',
        'gemini-1.5-pro',
      ],
      enabled: true,
    },
    {
      id: 'groq',
      name: 'Groq',
      label: 'Groq',
      baseUrl: 'https://api.groq.com/openai',
      defaultModel: 'llama-3.3-70b-versatile',
      activeModel: 'llama-3.3-70b-versatile',
      popularModels: [
        'llama-3.3-70b-versatile',
        'llama-3.1-8b-instant',
        'mixtral-8x7b-32768',
      ],
      models: [
        'llama-3.3-70b-versatile',
        'llama-3.1-8b-instant',
        'mixtral-8x7b-32768',
      ],
      enabled: true,
    },
    {
      id: 'deepseek',
      name: 'DeepSeek',
      label: 'DeepSeek',
      baseUrl: 'https://api.deepseek.com',
      defaultModel: 'deepseek-chat',
      activeModel: 'deepseek-chat',
      popularModels: ['deepseek-chat', 'deepseek-reasoner', 'deepseek-v4-flash'],
      models: ['deepseek-chat', 'deepseek-reasoner', 'deepseek-v4-flash'],
      enabled: true,
    },
    {
      id: 'mistral',
      name: 'Mistral AI',
      label: 'Mistral AI',
      baseUrl: 'https://api.mistral.ai',
      defaultModel: 'mistral-small-latest',
      activeModel: 'mistral-small-latest',
      popularModels: [
        'mistral-small-latest',
        'mistral-large-latest',
        'codestral-latest',
      ],
      models: [
        'mistral-small-latest',
        'mistral-large-latest',
        'codestral-latest',
      ],
      enabled: true,
    },
    {
      id: 'together',
      name: 'Together AI',
      label: 'Together AI',
      baseUrl: 'https://api.together.xyz',
      defaultModel: 'meta-llama/Llama-3.3-70B-Instruct-Turbo',
      activeModel: 'meta-llama/Llama-3.3-70B-Instruct-Turbo',
      popularModels: [
        'meta-llama/Llama-3.3-70B-Instruct-Turbo',
        'deepseek-ai/DeepSeek-V3',
      ],
      models: [
        'meta-llama/Llama-3.3-70B-Instruct-Turbo',
        'deepseek-ai/DeepSeek-V3',
      ],
      enabled: true,
    },
    {
      id: 'custom',
      name: 'Custom OpenAI API',
      label: 'Custom OpenAI API',
      baseUrl: 'http://localhost:1234',
      defaultModel: 'default-model',
      activeModel: 'default-model',
      popularModels: ['default-model', 'local-model'],
      models: ['default-model', 'local-model'],
      enabled: true,
      isCustom: true,
    },
  ];

  private keyCache: Record<string, string> = {};

  constructor() {
    makeAutoObservable(this);
    makePersistable(this, {
      name: 'AIProviderStore',
      properties: ['activeProviderId', 'useApiKeyForChat', 'providers'],
      storage: AsyncStorage,
    }).then(() => {
      this.loadAllKeysFromKeychain();
    });
  }

  private async loadAllKeysFromKeychain() {
    for (const prov of this.providers) {
      if (prov.apiKey) {
        runInAction(() => {
          this.keyCache[prov.id] = prov.apiKey!;
        });
      }
      try {
        const cred = await Keychain.getGenericPassword({
          service: `pocketpal_ai_provider_key_${prov.id}`,
        });
        if (cred && cred.password) {
          runInAction(() => {
            this.keyCache[prov.id] = cred.password;
            prov.apiKey = cred.password;
          });
        }
      } catch {
        // ignore keychain lookup error
      }
      // Sync configured providers into ServerStore on startup
      const effectiveKey = this.keyCache[prov.id] || prov.apiKey;
      if (effectiveKey) {
        const serverId = `ai_provider_${prov.id}`;
        serverStore.addServer({
          id: serverId,
          name: prov.label || prov.name,
          url: prov.baseUrl,
        });
        await serverStore.setApiKey(serverId, effectiveKey);
        const selectedModel = prov.activeModel || prov.defaultModel;
        if (selectedModel) {
          serverStore.addUserSelectedModel(serverId, selectedModel);
        }
      }
    }
  }

  get activeProvider(): AIProviderConfig {
    return (
      this.providers.find(p => p.id === this.activeProviderId) ||
      this.providers[0]
    );
  }

  get hasConfiguredProviders(): boolean {
    return this.providers.some(p => this.hasKey(p.id));
  }

  getKey(providerId: string): string {
    const prov = this.providers.find(p => p.id === providerId);
    return this.keyCache[providerId] || prov?.apiKey || '';
  }

  hasKey(providerId: string): boolean {
    return Boolean(this.getKey(providerId).trim());
  }

  get hasActiveProviderKey(): boolean {
    return this.hasKey(this.activeProviderId);
  }

  setActiveProvider(providerId: AIProviderId) {
    runInAction(() => {
      this.activeProviderId = providerId;
    });
  }

  setUseApiKeyForChat(useKey: boolean) {
    runInAction(() => {
      this.useApiKeyForChat = useKey;
    });
  }

  toggleProvider(providerId: string, enabled: boolean) {
    const prov = this.providers.find(p => p.id === providerId);
    if (prov) {
      runInAction(() => {
        prov.enabled = enabled;
      });
    }
  }

  renameProvider(providerId: string, newName: string) {
    const prov = this.providers.find(p => p.id === providerId);
    if (prov && newName.trim()) {
      runInAction(() => {
        prov.name = newName.trim();
        prov.label = newName.trim();
      });
    }
  }

  /**
   * Add and save a custom model name to a provider's model list and select it.
   */
  addCustomModel(providerId: AIProviderId, modelName: string): string | null {
    const trimmed = modelName.trim();
    if (!trimmed) {
      return null;
    }
    const prov = this.providers.find(p => p.id === providerId);
    if (!prov) {
      return null;
    }
    runInAction(() => {
      if (!Array.isArray(prov.models)) {
        prov.models = [];
      }
      if (!prov.models.includes(trimmed)) {
        prov.models = [...prov.models, trimmed];
      }
      if (!Array.isArray(prov.popularModels)) {
        prov.popularModels = [];
      }
      if (!prov.popularModels.includes(trimmed)) {
        prov.popularModels = [...prov.popularModels, trimmed];
      }
      prov.activeModel = trimmed;
      prov.defaultModel = trimmed;
      this.providers = [...this.providers];
    });
    return trimmed;
  }

  /**
   * Remove a model from a provider's saved model list.
   */
  removeModel(providerId: AIProviderId, modelName: string): void {
    const prov = this.providers.find(p => p.id === providerId);
    if (!prov || prov.models.length <= 1) {
      return;
    }
    runInAction(() => {
      prov.models = prov.models.filter(m => m !== modelName);
      prov.popularModels = (prov.popularModels || []).filter(
        m => m !== modelName,
      );
      if (prov.activeModel === modelName) {
        prov.activeModel = prov.models[0] || 'gpt-4o-mini';
        prov.defaultModel = prov.activeModel;
      }
      this.providers = [...this.providers];
    });
  }

  /**
   * Create and save a new named API profile (supports saving unlimited APIs)
   */
  async addCustomProvider(input: {
    name: string;
    baseUrl: string;
    apiKey?: string;
    defaultModel?: string;
    platform?: string;
  }): Promise<AIProviderConfig> {
    const id = `custom_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const cleanName =
      input.name.trim() || `Saved API ${this.providers.length + 1}`;
    const cleanUrl = input.baseUrl.trim() || 'https://api.openai.com';
    const cleanModel = input.defaultModel?.trim() || 'gpt-4o-mini';

    const newProv: AIProviderConfig = {
      id,
      name: cleanName,
      label: cleanName,
      baseUrl: cleanUrl,
      defaultModel: cleanModel,
      activeModel: cleanModel,
      popularModels: [cleanModel],
      models: [cleanModel],
      enabled: true,
      isCustom: true,
      platform: input.platform || 'custom',
      apiKey: input.apiKey?.trim() || undefined,
    };

    runInAction(() => {
      this.providers = [...this.providers, newProv];
      this.activeProviderId = id;
    });

    if (input.apiKey && input.apiKey.trim()) {
      await this.setProviderConfigAndKey(id, {
        apiKey: input.apiKey.trim(),
        baseUrl: cleanUrl,
        defaultModel: cleanModel,
        activateNow: true,
      });
    }

    return newProv;
  }

  async duplicateProvider(
    providerId: string,
  ): Promise<AIProviderConfig | undefined> {
    const orig = this.providers.find(p => p.id === providerId);
    if (!orig) {
      return undefined;
    }
    return await this.addCustomProvider({
      name: `${orig.name} (Copy)`,
      baseUrl: orig.baseUrl,
      apiKey: this.getKey(orig.id),
      defaultModel: orig.activeModel || orig.defaultModel,
      platform: orig.platform,
    });
  }

  deleteProvider(providerId: string): void {
    const prov = this.providers.find(p => p.id === providerId);
    if (!prov || (!prov.isCustom && !providerId.startsWith('custom_'))) {
      return;
    }
    runInAction(() => {
      this.providers = this.providers.filter(p => p.id !== providerId);
      delete this.keyCache[providerId];
      if (this.activeProviderId === providerId) {
        this.activeProviderId = this.providers[0]?.id || 'openai';
      }
    });
  }

  async setApiKey(providerId: string, apiKey: string): Promise<void> {
    await this.setProviderConfigAndKey(providerId, {
      apiKey,
      activateNow: Boolean(apiKey.trim()),
    });
  }

  setBaseUrl(providerId: string, baseUrl: string): void {
    const prov = this.providers.find(p => p.id === providerId);
    if (prov && baseUrl.trim()) {
      runInAction(() => {
        prov.baseUrl = baseUrl.trim();
        this.providers = [...this.providers];
      });
    }
  }

  setActiveModel(providerId: string, modelName: string): void {
    this.addCustomModel(providerId, modelName);
  }

  async clearApiKey(providerId: string): Promise<void> {
    await this.clearKey(providerId);
  }

  async setProviderConfigAndKey(
    providerId: AIProviderId,
    config: {
      apiKey?: string;
      baseUrl?: string;
      defaultModel?: string;
      activateNow?: boolean;
    },
  ): Promise<void> {
    const prov = this.providers.find(p => p.id === providerId);
    if (!prov) {
      return;
    }

    if (config.apiKey !== undefined) {
      const cleanKey = config.apiKey.trim();
      runInAction(() => {
        if (cleanKey) {
          this.keyCache[providerId] = cleanKey;
          prov.apiKey = cleanKey;
        } else {
          delete this.keyCache[providerId];
          prov.apiKey = undefined;
        }
      });
      try {
        if (cleanKey) {
          await Keychain.setGenericPassword('api_key', cleanKey, {
            service: `pocketpal_ai_provider_key_${providerId}`,
          });
        } else {
          await Keychain.resetGenericPassword({
            service: `pocketpal_ai_provider_key_${providerId}`,
          });
        }
      } catch (e) {
        console.warn('Keychain save warning (using persisted store fallback):', e);
      }
    }

    runInAction(() => {
      if (config.baseUrl && config.baseUrl.trim()) {
        prov.baseUrl = config.baseUrl.trim();
      }
      if (config.defaultModel && config.defaultModel.trim()) {
        const m = config.defaultModel.trim();
        prov.defaultModel = m;
        prov.activeModel = m;
        if (!prov.models.includes(m)) {
          prov.models = [...prov.models, m];
        }
        if (!prov.popularModels.includes(m)) {
          prov.popularModels = [...(prov.popularModels || []), m];
        }
      }
      this.providers = [...this.providers];
    });

    if (config.activateNow) {
      await this.activateProviderModel(providerId);
    }
  }

  async clearKey(providerId: AIProviderId): Promise<void> {
    await this.setProviderConfigAndKey(providerId, {apiKey: ''});
  }

  getSelectedModel(providerId: AIProviderId): string {
    const prov = this.providers.find(p => p.id === providerId);
    return prov?.activeModel || prov?.defaultModel || 'gpt-4o-mini';
  }

  /**
   * Synchronizes the configured AI provider with ServerStore and registers it
   * into ModelStore as the active remote model so chat uses it immediately.
   */
  async activateProviderModel(
    providerId: AIProviderId,
  ): Promise<Model | undefined> {
    const prov = this.providers.find(p => p.id === providerId);
    if (!prov) {
      return undefined;
    }

    const key = this.getKey(providerId) || prov.apiKey || '';
    const serverId = `ai_provider_${providerId}`;
    const selectedModel =
      prov.activeModel || prov.defaultModel || prov.models[0] || 'gpt-4o-mini';

    // 1. Register or update the server in ServerStore with deterministic ID
    const existingServer = serverStore.servers.find(s => s.id === serverId);
    if (existingServer) {
      serverStore.updateServer(serverId, {
        name: prov.label || prov.name,
        url: prov.baseUrl,
      });
    } else {
      serverStore.addServer({
        id: serverId,
        name: prov.label || prov.name,
        url: prov.baseUrl,
      });
    }

    // 2. Store API key in ServerStore (in-memory + Keychain)
    if (key) {
      await serverStore.setApiKey(serverId, key);
    }

    // 3. Register model in ServerStore.userSelectedModels so ModelStore.remoteModels & availableModels include it
    serverStore.addUserSelectedModel(serverId, selectedModel);

    // 4. Construct valid remote Model with required serverId & remoteModelId
    const emptyChatTemplate = {
      name: 'ChatML',
      addBosToken: false,
      addEosToken: false,
      bosToken: '',
      eosToken: '',
      chatTemplate: '',
      addGenerationPrompt: false,
    };

    const remoteModel: Model =
      modelStore.remoteModels.find(
        m => m.serverId === serverId && m.remoteModelId === selectedModel,
      ) || {
        id: `${serverId}/${selectedModel}`,
        name: selectedModel,
        author: prov.label || prov.name,
        size: 0,
        params: 0,
        isDownloaded: true,
        isLocal: false,
        downloadUrl: '',
        hfUrl: '',
        downloadSpeed: '',
        progress: 100,
        filename: '',
        origin: ModelOrigin.REMOTE,
        modelType: ModelType.CHAT,
        serverId,
        serverName: prov.label || prov.name,
        remoteModelId: selectedModel,
        defaultChatTemplate: emptyChatTemplate,
        chatTemplate: emptyChatTemplate,
        defaultStopWords: [],
        stopWords: [],
        defaultCompletionSettings: {} as CompletionParams,
        completionSettings: {} as CompletionParams,
      };

    // 5. Activate in ModelStore (creates OpenAICompletionEngine & sets activeModelId)
    await modelStore.setRemoteModel(remoteModel);
    return remoteModel;
  }
}

export const aiProviderStore = new AIProviderStore();
