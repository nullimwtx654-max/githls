import {makeAutoObservable, runInAction} from 'mobx';
import {makePersistable} from 'mobx-persist-store';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type ChatTone =
  | 'friendly'
  | 'concise'
  | 'creative'
  | 'analytical'
  | 'humorous';

export const POCKETPAL_DEFAULT_SYSTEM_PROMPT =
  "You are PocketPal, an intelligent, helpful, and friendly AI assistant running locally and privately on the user's mobile device. You provide thoughtful, accurate, and constructive responses, respecting user privacy and local-first computing.";

export class ChatPersonalizationStore {
  enabled = true;
  /** Whether Memory & Personalization are also active inside Character / Roleplay chats */
  applyToCharacterChats = true;
  baseSystemPrompt = POCKETPAL_DEFAULT_SYSTEM_PROMPT;
  userPersonaName = 'User';
  userPersonaBio = '';
  tone: ChatTone = 'friendly';
  useMarkdown = true;
  suggestFollowups = false;
  enableReasoning = true;
  matchUserLanguage = true;
  conciseAnswers = false;
  customInstructions = '';
  enableMemory = true;
  enableChatLookup = true;
  chatLookupCount = 35;

  constructor() {
    makeAutoObservable(this);
    makePersistable(this, {
      name: 'ChatPersonalizationStore',
      properties: [
        'enabled',
        'applyToCharacterChats',
        'baseSystemPrompt',
        'userPersonaName',
        'userPersonaBio',
        'tone',
        'useMarkdown',
        'suggestFollowups',
        'enableReasoning',
        'matchUserLanguage',
        'conciseAnswers',
        'customInstructions',
        'enableMemory',
        'enableChatLookup',
        'chatLookupCount',
      ],
      storage: AsyncStorage,
    });
  }

  setEnabled(val: boolean) {
    runInAction(() => {
      this.enabled = val;
    });
  }

  setApplyToCharacterChats(val: boolean) {
    runInAction(() => {
      this.applyToCharacterChats = val;
    });
  }

  setUserPersonaName(name: string) {
    runInAction(() => {
      this.userPersonaName = name;
    });
  }

  setUserPersonaBio(bio: string) {
    runInAction(() => {
      this.userPersonaBio = bio;
    });
  }

  setTone(tone: ChatTone) {
    runInAction(() => {
      this.tone = tone;
    });
  }

  setBaseSystemPrompt(prompt: string) {
    runInAction(() => {
      this.baseSystemPrompt = prompt;
    });
  }

  resetBaseSystemPrompt() {
    runInAction(() => {
      this.baseSystemPrompt = POCKETPAL_DEFAULT_SYSTEM_PROMPT;
    });
  }

  setCustomInstructions(instructions: string) {
    runInAction(() => {
      this.customInstructions = instructions;
    });
  }

  setUseMarkdown(val: boolean) {
    runInAction(() => {
      this.useMarkdown = val;
    });
  }

  setSuggestFollowups(val: boolean) {
    runInAction(() => {
      this.suggestFollowups = val;
    });
  }

  setEnableReasoning(val: boolean) {
    runInAction(() => {
      this.enableReasoning = val;
    });
  }

  setMatchUserLanguage(val: boolean) {
    runInAction(() => {
      this.matchUserLanguage = val;
    });
  }

  setConciseAnswers(val: boolean) {
    runInAction(() => {
      this.conciseAnswers = val;
    });
  }

  setEnableMemory(val: boolean) {
    runInAction(() => {
      this.enableMemory = val;
    });
  }

  setEnableChatLookup(val: boolean) {
    runInAction(() => {
      this.enableChatLookup = val;
    });
  }

  setChatLookupCount(count: number) {
    runInAction(() => {
      this.chatLookupCount = Math.max(1, Math.min(100, count));
    });
  }

  /**
   * Builds the consolidated personalization system prompt.
   */
  buildPersonalizationPrompt(): string {
    if (!this.enabled) {
      return this.baseSystemPrompt;
    }

    const sections: string[] = [];

    // 1. Identity & Base System Prompt
    sections.push(this.baseSystemPrompt.trim());

    // 2. User Persona / Bio
    if (this.userPersonaBio && this.userPersonaBio.trim()) {
      sections.push(
        `User Persona (${this.userPersonaName || 'User'}):\n${this.userPersonaBio.trim()}`,
      );
    }

    // 3. Tone Guidelines
    const toneGuidelines: Record<ChatTone, string> = {
      friendly:
        'Adopt a warm, encouraging, and conversational tone, like a helpful and knowledgeable peer.',
      concise:
        'Be extremely direct, clear, and to the point. Trim unnecessary fluff and lead with key answers.',
      creative:
        'Be imaginative, engaging, and expressive. Use vivid descriptions and creative phrasing.',
      analytical:
        'Adopt a structured, rigorous, and logically precise tone. Break down problems systematically with rationale.',
      humorous:
        'Incorporate light, playful humor and witty remarks while remaining helpful and grounded.',
    };

    if (toneGuidelines[this.tone]) {
      sections.push(`Tone: ${toneGuidelines[this.tone]}`);
    }

    // 4. Behavioral Directives
    const behaviors: string[] = [];
    if (this.useMarkdown) {
      behaviors.push(
        'Format responses with clean Markdown, headings, lists, and code blocks where helpful.',
      );
    }
    if (this.conciseAnswers) {
      behaviors.push('Keep responses brief and easy to scan.');
    }
    if (this.suggestFollowups) {
      behaviors.push(
        'Suggest 2-3 logical next questions or actions at the very end of your response.',
      );
    }
    if (this.enableReasoning) {
      behaviors.push(
        'Think through complex inquiries step-by-step before concluding.',
      );
    }
    if (this.matchUserLanguage) {
      behaviors.push(
        'Respond in the same language and locale used by the user.',
      );
    }

    if (behaviors.length > 0) {
      sections.push(`Behavioral Guidelines:\n- ${behaviors.join('\n- ')}`);
    }

    // 5. Memory Instruction (Instructing the AI how to save new facts)
    if (this.enableMemory) {
      sections.push(
        'Memory Capability: You have access to user memory. If the user shares an important personal fact, preference, project context, or story event worth remembering for future conversations, output a tag `[MEMORY: concise fact to remember]` at the end of your response.',
      );
    }

    // 6. Advanced Custom Instructions
    if (this.customInstructions && this.customInstructions.trim()) {
      sections.push(
        `User Custom Instructions:\n${this.customInstructions.trim()}`,
      );
    }

    return sections.join('\n\n');
  }
}

export const chatPersonalizationStore = new ChatPersonalizationStore();
