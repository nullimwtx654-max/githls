import * as RNFS from '@dr.pogodin/react-native-fs';
import {
  isErrorWithCode,
  pick,
  types,
  errorCodes,
} from '@react-native-documents/picker';
import {Platform} from 'react-native';
import {v4 as uuidv4} from 'uuid';
import 'react-native-get-random-values';

import {chatSessionRepository} from '../repositories/ChatSessionRepository';
import {MessageType} from './types';
import {CompletionParams} from './completionTypes';
import {migrateCompletionSettings} from './completionSettingsVersions';
import {base64ToUint8Array} from './characterCardParser';
import {palStore} from '../store';
import type {Pal, ParameterDefinition} from '../types/pal';

/**
 * Interface for imported chat session data
 */
export interface ImportedChatSession {
  id: string;
  title: string;
  date: string;
  messages: ImportedMessage[];
  completionSettings: CompletionParams;
  activePalId?: string;
}

/**
 * Interface for imported message data
 */
export interface ImportedMessage {
  id: string;
  author: string;
  text?: string;
  type: string;
  metadata?: Record<string, any>;
  createdAt?: number;
}

/**
 * Pick a JSON, Tavo (.tbk / .tavo), ZIP, or JSONL file using document picker
 */
export const pickJsonFile = async (): Promise<string | null> => {
  try {
    const res = await pick({
      type: Platform.OS === 'ios' ? [types.allFiles] : [types.allFiles],
    });

    if (res && res.length > 0) {
      const file = res[0];

      // Support .tbk (Tavo binary backup), .zip, .json, .tavo, .jsonl, and .txt exports
      const lowerName = file.name?.toLowerCase() || '';
      if (
        !lowerName.endsWith('.tbk') &&
        !lowerName.endsWith('.zip') &&
        !lowerName.endsWith('.json') &&
        !lowerName.endsWith('.tavo') &&
        !lowerName.endsWith('.jsonl') &&
        !lowerName.endsWith('.txt') &&
        !file.type?.includes('json') &&
        !file.type?.includes('text') &&
        !file.type?.includes('octet-stream') &&
        !file.type?.includes('zip')
      ) {
        throw new Error(
          'Selected file must be a .tbk, .tavo, .json, .jsonl, or .zip export',
        );
      }

      return file.uri;
    }
    return null;
  } catch (err: any) {
    if (isErrorWithCode(err)) {
      switch (err.code) {
        case errorCodes.IN_PROGRESS:
          console.warn(
            'user attempted to present a picker, but a previous one was already presented',
          );
          break;
        case errorCodes.UNABLE_TO_OPEN_FILE_TYPE:
          throw new Error('unable to open file type');
        case errorCodes.OPERATION_CANCELED:
          return null;
        default:
          console.error(err);
          throw new Error('unknown error');
      }
    }
    throw err;
  }
};

/**
 * Read and parse a JSON file
 */
export const readJsonFile = async (fileUri: string): Promise<any> => {
  try {
    const fileContent = await RNFS.readFile(fileUri, 'utf8');
    return JSON.parse(fileContent);
  } catch (error) {
    console.error('Error reading or parsing JSON file:', error);
    throw new Error('Failed to read or parse the selected file');
  }
};

/**
 * Validate imported chat session data
 */
export const validateImportedData = (
  data: any,
): ImportedChatSession | ImportedChatSession[] => {
  if (Array.isArray(data)) {
    return data.map(session => validateSingleSession(session));
  } else {
    return validateSingleSession(data);
  }
};

/**
 * Validate a single chat session
 */
const validateSingleSession = (session: any): ImportedChatSession => {
  if (!session.title || typeof session.title !== 'string') {
    throw new Error('Invalid session: missing or invalid title');
  }

  if (!session.date || typeof session.date !== 'string') {
    session.date = new Date().toISOString();
  }

  if (!session.messages || !Array.isArray(session.messages)) {
    session.messages = [];
  }

  session.messages = session.messages.map((msg: any) => {
    if (!msg.id) {
      msg.id = uuidv4();
    }

    if (!msg.author) {
      throw new Error('Invalid message: missing author');
    }

    if (!msg.type) {
      msg.type = 'text';
    }

    if (!msg.createdAt) {
      msg.createdAt = Date.now();
    }

    return msg;
  });

  if (!session.completionSettings) {
    session.completionSettings = {};
  }

  session.completionSettings = migrateCompletionSettings(
    session.completionSettings,
  );

  if (!session.id) {
    session.id = uuidv4();
  }

  return session as ImportedChatSession;
};

/**
 * Import chat sessions from a JSON, JSONL, or Tavo (.tbk / .tavo) file
 */
export const importChatSessions = async (): Promise<number> => {
  try {
    const fileUri = await pickJsonFile();
    if (!fileUri) {
      return 0;
    }

    const {importTavoOrUnifiedData, importTavoTbkArchive} = await import(
      './tavoImportParser'
    );

    if (
      fileUri.toLowerCase().endsWith('.tbk') ||
      fileUri.toLowerCase().endsWith('.zip')
    ) {
      const b64 = await RNFS.readFile(fileUri, 'base64');
      const res = await importTavoTbkArchive(
        base64ToUint8Array(b64),
        fileUri,
      );
      return res.chatsImported + res.charactersImported;
    }

    const rawText = await RNFS.readFile(fileUri, 'utf8');
    if (rawText.startsWith('PK\x03\x04')) {
      const b64 = await RNFS.readFile(fileUri, 'base64');
      const res = await importTavoTbkArchive(
        base64ToUint8Array(b64),
        fileUri,
      );
      return res.chatsImported + res.charactersImported;
    }

    const tavoRes = await importTavoOrUnifiedData(rawText, fileUri);
    if (tavoRes.chatsImported > 0) {
      return tavoRes.chatsImported;
    }

    const data = JSON.parse(rawText);
    const validatedData = validateImportedData(data);

    if (Array.isArray(validatedData)) {
      let importedCount = 0;
      for (const session of validatedData) {
        await importSingleSession(session);
        importedCount++;
      }
      return importedCount;
    } else {
      await importSingleSession(validatedData);
      return 1;
    }
  } catch (error) {
    console.error('Error importing chat sessions:', error);
    throw error;
  }
};

/**
 * Import a single chat session
 */
const importSingleSession = async (
  session: ImportedChatSession,
): Promise<void> => {
  try {
    const messages = session.messages.map(
      msg =>
        ({
          id: msg.id,
          author: {id: msg.author},
          text: msg.text || '',
          type: msg.type as any,
          metadata: msg.metadata || {},
          createdAt: msg.createdAt || Date.now(),
        }) as MessageType.Any,
    );

    await chatSessionRepository.createSession(
      session.title,
      messages,
      session.completionSettings,
      session.activePalId,
    );
  } catch (error) {
    console.error('Error importing single session:', error);
    throw error;
  }
};

/**
 * Interface (Data Transfer Object (DTO)) for imported pal data (format v2.0)
 */
export interface ImportedPal {
  version: string;
  id: string;
  name: string;
  description?: string;
  thumbnail_url?: string;
  thumbnail_data?: string;
  systemPrompt: string;
  originalSystemPrompt?: string;
  isSystemPromptChanged: boolean;
  useAIPrompt: boolean;
  defaultModel?: any;
  promptGenerationModel?: any;
  generatingPrompt?: string;
  color?: [string, string];
  capabilities?: any;
  pact?: Pal['pact'];
  greeting?: Pal['greeting'];
  parameters: Record<string, any>;
  parameterSchema: ParameterDefinition[];
  source: 'local' | 'palshub';
  palshub_id?: string;
  creator_info?: any;
  categories?: string[];
  tags?: string[];
  rating?: number;
  review_count?: number;
  protection_level?: string;
  price_cents?: number;
  is_owned?: boolean;
  generation_settings?: any;
  created_at?: string;
  updated_at?: string;
}

/**
 * Import pals from a JSON or Tavo (.tbk) file (single or multiple)
 */
export const importPals = async (): Promise<number> => {
  try {
    const fileUri = await pickJsonFile();
    if (!fileUri) {
      return 0;
    }

    if (
      fileUri.toLowerCase().endsWith('.tbk') ||
      fileUri.toLowerCase().endsWith('.zip')
    ) {
      const {importTavoTbkArchive} = await import('./tavoImportParser');
      const b64 = await RNFS.readFile(fileUri, 'base64');
      const res = await importTavoTbkArchive(
        base64ToUint8Array(b64),
        fileUri,
      );
      return res.charactersImported;
    }

    const data = await readJsonFile(fileUri);
    const validatedData = validateImportedPalData(data);

    if (Array.isArray(validatedData)) {
      let importedCount = 0;
      for (const pal of validatedData) {
        await importSinglePal(pal);
        importedCount++;
      }
      return importedCount;
    } else {
      await importSinglePal(validatedData);
      return 1;
    }
  } catch (error) {
    console.error('Error importing pals:', error);
    throw error;
  }
};

/**
 * Validate imported pal data (handles both legacy and modern formats)
 */
export const validateImportedPalData = (
  data: any,
): ImportedPal | ImportedPal[] => {
  if (Array.isArray(data)) {
    return data.map(pal => validateSinglePal(pal));
  } else {
    return validateSinglePal(data);
  }
};

/**
 * Validate a single pal (modern format v2.0+ only)
 */
const validateSinglePal = (pal: any): ImportedPal => {
  if (!pal.name || typeof pal.name !== 'string') {
    throw new Error('Import failed: Invalid pal data');
  }

  if (!pal.systemPrompt || typeof pal.systemPrompt !== 'string') {
    throw new Error('Import failed: Invalid pal data');
  }

  if (!pal.version || !pal.version.startsWith('2.')) {
    throw new Error('Import failed: Unsupported format');
  }

  if (typeof pal.useAIPrompt !== 'boolean') {
    pal.useAIPrompt = false;
  }

  if (typeof pal.isSystemPromptChanged !== 'boolean') {
    pal.isSystemPromptChanged = false;
  }

  if (!pal.parameters || typeof pal.parameters !== 'object') {
    pal.parameters = {};
  }

  if (!pal.parameterSchema || !Array.isArray(pal.parameterSchema)) {
    pal.parameterSchema = [];
  }

  if (!pal.source) {
    pal.source = 'local';
  }

  if (!pal.id) {
    pal.id = uuidv4();
  }

  return pal as ImportedPal;
};

/**
 * Save base64 image data as a local file
 */
const saveBase64Image = async (
  base64Data: string,
  palId: string,
): Promise<string> => {
  const extensionMatch = base64Data.match(/^data:image\/([a-z]+);base64,/);
  const fileExtension = extensionMatch ? extensionMatch[1] : 'jpg';
  const base64Content = base64Data.replace(/^data:image\/[a-z]+;base64,/, '');

  const PAL_IMAGES_DIR = `${RNFS.DocumentDirectoryPath}/pal-images`;
  const fileName = `${palId}_thumbnail.${fileExtension}`;
  const filePath = `${PAL_IMAGES_DIR}/${fileName}`;

  const exists = await RNFS.exists(PAL_IMAGES_DIR);
  if (!exists) {
    await RNFS.mkdir(PAL_IMAGES_DIR);
  }

  await RNFS.writeFile(filePath, base64Content, 'base64');

  return fileName;
};

/**
 * Transform imported pal to the format expected by palStore.createPal
 */
const transformImportPal = async (
  pal: ImportedPal,
): Promise<Omit<Pal, 'id' | 'created_at' | 'updated_at'>> => {
  let thumbnailUrl = pal.thumbnail_url;

  if (pal.thumbnail_data) {
    try {
      const newPalId = uuidv4();
      thumbnailUrl = await saveBase64Image(pal.thumbnail_data, newPalId);
    } catch (error) {
      console.warn('Failed to save imported thumbnail:', error);
      thumbnailUrl = undefined;
    }
  }

  return {
    type: 'local',
    name: pal.name,
    description: pal.description,
    thumbnail_url: thumbnailUrl,
    systemPrompt: pal.systemPrompt,
    originalSystemPrompt: pal.originalSystemPrompt,
    isSystemPromptChanged: pal.isSystemPromptChanged,
    useAIPrompt: pal.useAIPrompt,
    defaultModel: pal.defaultModel,
    promptGenerationModel: pal.promptGenerationModel,
    generatingPrompt: pal.generatingPrompt,
    color: pal.color,
    capabilities: pal.capabilities || {},
    pact: pal.pact,
    greeting: pal.greeting,
    parameters: pal.parameters,
    parameterSchema: pal.parameterSchema,
    source: pal.source,
    palshub_id: pal.palshub_id,
    creator_info: pal.creator_info,
    categories: pal.categories,
    tags: pal.tags,
    rating: pal.rating,
    review_count: pal.review_count,
    protection_level: pal.protection_level as
      | 'public'
      | 'reveal_on_purchase'
      | 'private'
      | undefined,
    price_cents: pal.price_cents,
    is_owned: pal.is_owned,
    completionSettings: pal.generation_settings,
  };
};

/**
 * Import a single pal
 */
const importSinglePal = async (pal: ImportedPal): Promise<void> => {
  try {
    const palData = await transformImportPal(pal);
    const {saveToMyPals} = await import('../screens/PalsScreen/myPals');
    await saveToMyPals({...palData, source: 'local', palshub_id: undefined});
  } catch (error) {
    console.error('Error importing single pal:', error);
    throw error;
  }
};

/**
 * Import comprehensive PocketPal or Tavo (.tbk / .tavo / .json) backup data (chats, presets, settings, pals, api keys)
 */
export const importAllPocketPalData = async (
  rawBackup: string | Record<string, any>,
): Promise<{
  chats: number;
  presets: number;
  pals: number;
  apiProviders: number;
}> => {
  try {
    const {importTavoOrUnifiedData, importTavoTbkArchive} = await import(
      './tavoImportParser'
    );

    if (typeof rawBackup === 'string') {
      const trimmed = rawBackup.trim();
      const lower = trimmed.toLowerCase();

      // Check if `rawBackup` is a file URI to a `.tbk` or `.zip` archive
      if (
        !trimmed.startsWith('{') &&
        !trimmed.startsWith('[') &&
        (lower.endsWith('.tbk') || lower.endsWith('.zip'))
      ) {
        const b64 = await RNFS.readFile(trimmed, 'base64');
        const tbkRes = await importTavoTbkArchive(
          base64ToUint8Array(b64),
          trimmed,
        );
        return {
          chats: tbkRes.chatsImported,
          presets: tbkRes.presetsImported,
          pals: tbkRes.charactersImported,
          apiProviders: tbkRes.apiProvidersImported,
        };
      }

      // Or if it's a file URI whose binary header starts with `PK\x03\x04`
      if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) {
        const b64 = await RNFS.readFile(trimmed, 'base64');
        if (b64.startsWith('UEsDB')) {
          const tbkRes = await importTavoTbkArchive(
            base64ToUint8Array(b64),
            trimmed,
          );
          return {
            chats: tbkRes.chatsImported,
            presets: tbkRes.presetsImported,
            pals: tbkRes.charactersImported,
            apiProviders: tbkRes.apiProvidersImported,
          };
        }
      }
    }

    let rawContent = '';
    if (typeof rawBackup === 'string') {
      const trimmed = rawBackup.trim();
      if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
        rawContent = trimmed;
      } else {
        rawContent = await RNFS.readFile(rawBackup, 'utf8');
      }
    } else {
      rawContent = JSON.stringify(rawBackup);
    }

    const tavoRes = await importTavoOrUnifiedData(
      rawContent,
      typeof rawBackup === 'string' ? rawBackup : undefined,
    );
    if (
      tavoRes.chatsImported > 0 ||
      tavoRes.charactersImported > 0 ||
      tavoRes.apiProvidersImported > 0 ||
      tavoRes.presetsImported > 0 ||
      tavoRes.customCssImported
    ) {
      return {
        chats: tavoRes.chatsImported,
        presets: tavoRes.presetsImported,
        pals: tavoRes.charactersImported,
        apiProviders: tavoRes.apiProvidersImported,
      };
    }
  } catch (tavoErr) {
    console.warn('Tavo/unified fast-path fell back to legacy parser:', tavoErr);
  }

  try {
    const {sillyTavernPresetStore, aiProviderStore, uiStore, chatSessionStore} =
      await import('../store');

    let backup: Record<string, any>;
    if (typeof rawBackup === 'string') {
      const trimmed = rawBackup.trim();
      if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
        backup = JSON.parse(trimmed);
      } else {
        backup = await readJsonFile(rawBackup);
      }
    } else {
      backup = rawBackup;
    }

    let importedChatsCount = 0;
    let importedPresetsCount = 0;
    let importedPalsCount = 0;
    let importedApiCount = 0;

    if (Array.isArray(backup.presets)) {
      for (const preset of backup.presets) {
        try {
          await sillyTavernPresetStore.importPreset(preset);
          importedPresetsCount++;
        } catch (e) {
          console.warn('Error importing preset:', e);
        }
      }
    }

    if (backup.settings) {
      if (typeof backup.settings.palsHubFancyTheme === 'boolean') {
        uiStore.setPalsHubFancyTheme(backup.settings.palsHubFancyTheme);
      }
      if (typeof backup.settings.palsHubFancyBlurRadius === 'number') {
        uiStore.setPalsHubFancyBlurRadius(
          backup.settings.palsHubFancyBlurRadius,
        );
      }
      if (typeof backup.settings.palsHubFancyGlassOpacity === 'number') {
        uiStore.setPalsHubFancyGlassOpacity(
          backup.settings.palsHubFancyGlassOpacity,
        );
      }
      const scheme =
        backup.settings.colorScheme || backup.settings.displayTheme;
      if (scheme === 'dark' || scheme === 'light') {
        uiStore.setColorScheme(scheme);
      }
    }

    if (Array.isArray(backup.apiProviders)) {
      for (const prov of backup.apiProviders) {
        try {
          if (prov.id && prov.apiKey) {
            await aiProviderStore.setApiKey(prov.id, prov.apiKey);
          }
          if (prov.id && prov.activeModel) {
            aiProviderStore.setActiveModel(prov.id, prov.activeModel);
          }
          importedApiCount++;
        } catch (e) {
          console.warn('Error restoring API provider:', e);
        }
      }
    }

    if (Array.isArray(backup.pals)) {
      for (const pal of backup.pals) {
        try {
          const existing = palStore.pals.find(
            p => p.id === pal.id || p.name === pal.name,
          );
          if (!existing) {
            const greetingObj: Pal['greeting'] =
              typeof pal.greeting === 'object' && pal.greeting !== null
                ? {
                    ...pal.greeting,
                    alternateGreetings:
                      pal.greeting.alternateGreetings || pal.alternateGreetings,
                    characterCard:
                      pal.greeting.characterCard || pal.characterCard,
                    sillyTavernPresetId:
                      pal.greeting.sillyTavernPresetId ||
                      pal.sillyTavernPresetId,
                  }
                : {
                    text: typeof pal.greeting === 'string' ? pal.greeting : '',
                    alternateGreetings: pal.alternateGreetings,
                    characterCard: pal.characterCard,
                    sillyTavernPresetId: pal.sillyTavernPresetId,
                  };

            const {saveToMyPals} = await import('../screens/PalsScreen/myPals');
            await saveToMyPals({
              type: 'local',
              name: pal.name || 'Imported Pal',
              description: pal.description || '',
              thumbnail_url: pal.thumbnail_url || pal.avatarPath,
              systemPrompt: pal.systemPrompt || '',
              isSystemPromptChanged: Boolean(pal.isSystemPromptChanged),
              useAIPrompt: Boolean(pal.useAIPrompt),
              greeting: greetingObj,
              characterCard: pal.characterCard,
              sillyTavernPresetId: pal.sillyTavernPresetId,
              parameters:
                pal.parameters && typeof pal.parameters === 'object'
                  ? pal.parameters
                  : {},
              parameterSchema: Array.isArray(pal.parameterSchema)
                ? pal.parameterSchema
                : [],
              source: 'local',
              palshub_id: undefined,
              completionSettings: pal.completionSettings,
            });
            importedPalsCount++;
          }
        } catch (e) {
          console.warn('Error importing pal:', e);
        }
      }
    }

    if (Array.isArray(backup.chats)) {
      for (const session of backup.chats) {
        try {
          const rawMsgs = Array.isArray(session.messages)
            ? session.messages
            : [];
          const mappedMessages: MessageType.Any[] = rawMsgs.map(
            (msg: any) =>
              ({
                id: msg.id || uuidv4(),
                author:
                  typeof msg.author === 'object' && msg.author !== null
                    ? msg.author
                    : {id: String(msg.author || 'user')},
                text: msg.text || '',
                type: (msg.type || 'text') as any,
                metadata: msg.metadata || {},
                createdAt: msg.createdAt || Date.now(),
              }) as MessageType.Any,
          );

          const migratedSettings = migrateCompletionSettings(
            session.completionSettings || {},
          );

          await chatSessionRepository.createSession(
            session.title || 'Imported Chat',
            mappedMessages,
            migratedSettings,
            session.activePalId,
          );
          importedChatsCount++;
        } catch (e) {
          console.warn('Error importing chat session:', e);
        }
      }
      await chatSessionStore.loadSessionList();
    }

    return {
      chats: importedChatsCount,
      presets: importedPresetsCount,
      pals: importedPalsCount,
      apiProviders: importedApiCount,
    };
  } catch (error) {
    console.error('Error importing all PocketPal data:', error);
    throw error;
  }
};
