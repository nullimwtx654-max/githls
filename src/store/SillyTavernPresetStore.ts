import {makeAutoObservable, runInAction} from 'mobx';
import {makePersistable} from 'mobx-persist-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as RNFS from '@dr.pogodin/react-native-fs';
import {Platform} from 'react-native';
import {pick, types} from '@react-native-documents/picker';
import Share from 'react-native-share';
import {v4 as uuidv4} from 'uuid';

import type {
  SillyTavernPreset,
  STPromptItem,
  STRegexScript,
} from '../types/sillyTavernPreset';
import {BUILT_IN_ST_PRESETS} from '../utils/sillyTavernPresetEngine';

export class SillyTavernPresetStore {
  enabled: boolean = true;
  experimentalMacroEngine: boolean = true;
  activePresetId: string = 'st-default-roleplay';

  userName: string = 'User';
  userPersona: string = '';

  presets: SillyTavernPreset[] = JSON.parse(
    JSON.stringify(BUILT_IN_ST_PRESETS),
  );

  constructor() {
    makeAutoObservable(this);
    makePersistable(this, {
      name: 'SillyTavernPresetStore',
      properties: [
        'enabled',
        'experimentalMacroEngine',
        'activePresetId',
        'userName',
        'userPersona',
        'presets',
      ],
      storage: AsyncStorage,
    });
  }

  get activePreset(): SillyTavernPreset {
    const found = this.presets.find(p => p.id === this.activePresetId);
    return found || this.presets[0] || BUILT_IN_ST_PRESETS[0];
  }

  getPresetForPal(presetId?: string): SillyTavernPreset {
    if (presetId) {
      const found = this.presets.find(p => p.id === presetId);
      if (found) {
        return found;
      }
    }
    return this.activePreset;
  }

  setEnabled(val: boolean) {
    runInAction(() => {
      this.enabled = val;
    });
  }

  setExperimentalMacroEngine(val: boolean) {
    runInAction(() => {
      this.experimentalMacroEngine = val;
    });
  }

  setActivePreset(id: string) {
    runInAction(() => {
      this.activePresetId = id;
    });
  }

  setUserName(name: string) {
    runInAction(() => {
      this.userName = name;
    });
  }

  setUserPersona(persona: string) {
    runInAction(() => {
      this.userPersona = persona;
    });
  }

  updateActivePreset(updates: Partial<SillyTavernPreset>) {
    runInAction(() => {
      const preset = this.activePreset;
      if (preset) {
        Object.assign(preset, updates);
      }
    });
  }

  renamePreset(id: string, newName: string) {
    if (!newName.trim()) {
      return;
    }
    runInAction(() => {
      const preset = this.presets.find(p => p.id === id);
      if (preset) {
        preset.name = newName.trim();
      }
    });
  }

  /**
   * Create and save a brand-new custom preset (supports saving unlimited presets)
   */
  createNewPreset(name?: string, description?: string): SillyTavernPreset {
    const base: SillyTavernPreset = JSON.parse(
      JSON.stringify(this.activePreset || BUILT_IN_ST_PRESETS[0]),
    );
    const id = `st-custom-${uuidv4().slice(0, 8)}`;
    const cleanName =
      name && name.trim()
        ? name.trim()
        : `Custom Preset #${this.presets.length + 1}`;
    const newPreset: SillyTavernPreset = {
      ...base,
      id,
      name: cleanName,
      description:
        description || 'Custom user-created SillyTavern roleplay preset',
      isBuiltin: false,
    };
    runInAction(() => {
      this.presets.push(newPreset);
      this.activePresetId = id;
    });
    return newPreset;
  }

  updateSampler(presetId: string, updates: Partial<SillyTavernPreset>) {
    runInAction(() => {
      const preset =
        this.presets.find(p => p.id === presetId) || this.activePreset;
      if (preset) {
        Object.assign(preset, updates);
        preset.samplers = {...(preset.samplers || {}), ...updates};
      }
    });
  }

  updateUtility(presetId: string, updates: Partial<SillyTavernPreset>) {
    runInAction(() => {
      const preset =
        this.presets.find(p => p.id === presetId) || this.activePreset;
      if (preset) {
        Object.assign(preset, updates);
        preset.utility = {...(preset.utility || {}), ...updates};
      }
    });
  }

  savePreset(preset: SillyTavernPreset) {
    runInAction(() => {
      const idx = this.presets.findIndex(p => p.id === preset.id);
      if (idx >= 0) {
        this.presets[idx] = preset;
      } else {
        this.presets.push(preset);
      }
    });
  }

  deletePreset(id: string) {
    runInAction(() => {
      this.presets = this.presets.filter(p => p.id !== id);
      if (this.activePresetId === id) {
        this.activePresetId = this.presets[0]?.id || 'st-default-roleplay';
      }
    });
  }

  duplicatePreset(id: string): SillyTavernPreset {
    const orig = this.presets.find(p => p.id === id) || this.activePreset;
    const copy: SillyTavernPreset = JSON.parse(JSON.stringify(orig));
    copy.id = `st-custom-${uuidv4().slice(0, 8)}`;
    copy.name = `${orig.name} (Copy)`;
    copy.isBuiltin = false;
    runInAction(() => {
      this.presets.push(copy);
      this.activePresetId = copy.id;
    });
    return copy;
  }

  // Regex Scripts Management (SillyTavern & Tavo Complex Regex Engine)
  addRegexScript(
    presetId: string,
    script: Omit<STRegexScript, 'id'> & {id?: string},
  ): STRegexScript {
    const fullScript: STRegexScript = {
      id: script.id || `rx_${uuidv4().slice(0, 8)}`,
      scriptName: script.scriptName || 'Custom Regex Rule',
      findRegex: script.findRegex,
      replaceString: script.replaceString ?? '',
      trimStrings: script.trimStrings || [],
      placement: script.placement || [1, 2],
      disabled: script.disabled ?? false,
      markdownOnly: script.markdownOnly ?? false,
      promptOnly: script.promptOnly ?? false,
      runOnEdit: true,
      substituteRegex: script.substituteRegex ?? 1,
      minDepth: script.minDepth,
      maxDepth: script.maxDepth,
    };

    runInAction(() => {
      const preset =
        this.presets.find(p => p.id === presetId) || this.activePreset;
      if (!preset) {
        return;
      }
      if (!Array.isArray(preset.regex_scripts)) {
        preset.regex_scripts = [];
      }
      preset.regex_scripts.push(fullScript);
    });
    return fullScript;
  }

  toggleRegexScript(presetId: string, scriptId: string, enabled: boolean) {
    runInAction(() => {
      const preset =
        this.presets.find(p => p.id === presetId) || this.activePreset;
      const rx = preset?.regex_scripts?.find(r => r.id === scriptId);
      if (rx) {
        rx.disabled = !enabled;
      }
    });
  }

  deleteRegexScript(presetId: string, scriptId: string) {
    runInAction(() => {
      const preset =
        this.presets.find(p => p.id === presetId) || this.activePreset;
      if (preset && Array.isArray(preset.regex_scripts)) {
        preset.regex_scripts = preset.regex_scripts.filter(
          r => r.id !== scriptId,
        );
      }
    });
  }

  // Prompt Manager Ordering & Toggles
  togglePrompt(presetId: string, identifier: string, enabled: boolean) {
    this.togglePromptItem(presetId, identifier, enabled);
  }

  togglePromptItem(presetId: string, identifier: string, enabled: boolean) {
    runInAction(() => {
      const preset = this.presets.find(p => p.id === presetId);
      if (!preset) {
        return;
      }
      const item = preset.prompts.find(p => p.identifier === identifier);
      if (item) {
        item.enabled = enabled;
      }
      if (preset.prompt_order?.[0]?.order) {
        const orderEntry = preset.prompt_order[0].order.find(
          o => o.identifier === identifier,
        );
        if (orderEntry) {
          orderEntry.enabled = enabled;
        }
      }
    });
  }

  movePromptItem(
    presetId: string,
    identifier: string,
    direction: 'up' | 'down',
  ) {
    runInAction(() => {
      const preset = this.presets.find(p => p.id === presetId);
      if (!preset || !preset.prompt_order?.[0]?.order) {
        return;
      }
      const order = preset.prompt_order[0].order;
      const idx = order.findIndex(o => o.identifier === identifier);
      if (idx === -1) {
        return;
      }

      const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
      if (targetIdx < 0 || targetIdx >= order.length) {
        return;
      }

      const temp = order[idx];
      order[idx] = order[targetIdx];
      order[targetIdx] = temp;
    });
  }

  updatePromptItem(
    presetId: string,
    identifier: string,
    updates: Partial<STPromptItem>,
  ) {
    runInAction(() => {
      const preset = this.presets.find(p => p.id === presetId);
      if (!preset) {
        return;
      }
      const item = preset.prompts.find(p => p.identifier === identifier);
      if (item) {
        Object.assign(item, updates);
      }
    });
  }

  addCustomPromptItem(
    presetId: string,
    item: Omit<STPromptItem, 'identifier'>,
  ): STPromptItem {
    const identifier = `custom_${uuidv4().slice(0, 8)}`;
    const fullItem: STPromptItem = {
      ...item,
      identifier,
      system_prompt: true,
      enabled: item.enabled ?? true,
    };

    runInAction(() => {
      const preset = this.presets.find(p => p.id === presetId);
      if (!preset) {
        return;
      }
      preset.prompts.push(fullItem);
      if (preset.prompt_order?.[0]?.order) {
        preset.prompt_order[0].order.push({
          identifier,
          enabled: fullItem.enabled ?? true,
        });
      }
    });

    return fullItem;
  }

  removePromptItem(presetId: string, identifier: string) {
    runInAction(() => {
      const preset = this.presets.find(p => p.id === presetId);
      if (!preset) {
        return;
      }
      preset.prompts = preset.prompts.filter(p => p.identifier !== identifier);
      if (preset.prompt_order?.[0]?.order) {
        preset.prompt_order[0].order = preset.prompt_order[0].order.filter(
          o => o.identifier !== identifier,
        );
      }
    });
  }

  async importPreset(parsed: Record<string, any>): Promise<SillyTavernPreset> {
    const base: SillyTavernPreset = JSON.parse(
      JSON.stringify(BUILT_IN_ST_PRESETS[0]),
    );
    const newPreset: SillyTavernPreset = {
      ...base,
      ...parsed,
      ...(parsed.samplers || {}),
      ...(parsed.utility || {}),
      id: parsed.id || `st-custom-${uuidv4().slice(0, 8)}`,
      name: parsed.name || 'Imported Preset',
      isBuiltin: false,
      prompts:
        Array.isArray(parsed.prompts) && parsed.prompts.length > 0
          ? parsed.prompts
          : base.prompts,
    };

    this.savePreset(newPreset);
    this.setActivePreset(newPreset.id);
    return newPreset;
  }

  async importPresetFromFile(): Promise<SillyTavernPreset | null> {
    try {
      const res = await pick({
        type: Platform.OS === 'ios' ? ['public.json'] : [types.allFiles],
      });
      if (!res || res.length === 0) {
        return null;
      }
      const content = await RNFS.readFile(res[0].uri, 'utf8');
      const parsed = JSON.parse(content);
      if (!parsed.name && res[0].name) {
        parsed.name = res[0].name.replace(/\.json$/i, '');
      }
      return await this.importPreset(parsed);
    } catch (err: any) {
      if (err?.code === 'OPERATION_CANCELED') {
        return null;
      }
      throw err;
    }
  }

  async exportPresetToFile(presetId: string): Promise<void> {
    const preset =
      this.presets.find(p => p.id === presetId) || this.activePreset;
    const sanitized = preset.name.replace(/[^a-zA-Z0-9_-]/g, '_');
    const path = `${RNFS.CachesDirectoryPath}/${sanitized}_st_preset.json`;
    await RNFS.writeFile(path, JSON.stringify(preset, null, 2), 'utf8');
    await Share.open({
      url: `file://${path}`,
      type: 'application/json',
      title: `Export ${preset.name} (SillyTavern Preset)`,
    });
  }
}

export const sillyTavernPresetStore = new SillyTavernPresetStore();
