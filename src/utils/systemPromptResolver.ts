import type {Pal} from '../types/pal';
import {getAllPalGreetings} from '../types/pal';
import type {Model} from './types';
import {generateFinalSystemPrompt} from './palshub-template-parser';
import {chatPersonalizationStore} from '../store/ChatPersonalizationStore';
import {sillyTavernPresetStore} from '../store/SillyTavernPresetStore';
import {
  buildSillyTavernMessages,
  expandSillyTavernMacros,
} from './sillyTavernPresetEngine';

export interface SystemPromptDependencies {
  pal?: Pal | null;
  model?: Model | null;
  groupPals?: Pal[];
  mutedPalIds?: string[];
  recentMessages?: Array<{
    role: 'system' | 'user' | 'assistant';
    text: string;
    name?: string;
  }>;
}

/**
 * Resolves the system prompt based on priority:
 * 1. Pal's system prompt + full SillyTavern Preset Prompt Manager, World Info (0..7),
 *    Card Override Contract ({{original}} / forbid_overrides), Experimental Macro Engine,
 *    and Group Chat context — for PalsHub / Character Chats
 * 2. PocketPal Chat Personalization — for Normal Chat only
 * 3. Fallback to model's chat template system prompt
 * 4. Empty string if neither exists
 */
export function resolveSystemPrompt(
  dependencies: SystemPromptDependencies,
): string {
  const {
    pal,
    model,
    groupPals = [],
    mutedPalIds = [],
    recentMessages = [],
  } = dependencies;

  // Priority 1: Pal / PalsHub Character or Group Chat
  if (pal) {
    let rawPrompt = pal.systemPrompt || '';
    if (pal.parameters && Object.keys(pal.parameters).length > 0 && rawPrompt) {
      rawPrompt = generateFinalSystemPrompt(rawPrompt, pal.parameters);
    }

    try {
      const presetId =
        pal.sillyTavernPresetId || pal.greeting?.sillyTavernPresetId;
      const preset = sillyTavernPresetStore.getPresetForPal(presetId);
      const card = pal.characterCard || pal.greeting?.characterCard;
      const cardData = card?.data;

      const isGroupChat = groupPals.length > 1;
      const groupMembers = isGroupChat
        ? groupPals.map(p => p.name)
        : [pal.name || 'Character'];
      const groupMutedMembers = isGroupChat
        ? groupPals
            .filter(p => mutedPalIds.includes(p.id))
            .map(p => p.name)
        : [];

      // Merge lorebook entries across group members if in a group chat
      let mergedBook = cardData?.character_book;
      if (isGroupChat) {
        const allEntries: any[] = [];
        groupPals.forEach(gp => {
          const gBook =
            gp.characterCard?.data?.character_book ||
            gp.greeting?.characterCard?.data?.character_book;
          if (gBook?.entries) {
            const entriesArr = Array.isArray(gBook.entries)
              ? gBook.entries
              : Object.values(gBook.entries);
            allEntries.push(...entriesArr);
          }
        });
        if (allEntries.length > 0) {
          mergedBook = {
            name: 'Group Lorebook',
            entries: allEntries,
          };
        }
      }

      // Build group co-participant summary if in a group chat
      let groupProfilesBlock = '';
      if (isGroupChat) {
        const otherPals = groupPals.filter(p => p.id !== pal.id);
        if (otherPals.length > 0) {
          const profiles = otherPals
            .map(op => {
              const opCard =
                op.characterCard?.data || op.greeting?.characterCard?.data;
              const desc =
                opCard?.description || op.description || op.systemPrompt || '';
              return `- ${op.name}: ${desc.slice(0, 280)}`;
            })
            .join('\n');
          groupProfilesBlock = `[Group Chat Participants alongside ${pal.name}:\n${profiles}]`;
        }
      }

      const description = [
        cardData?.description || pal.description || '',
        groupProfilesBlock,
      ]
        .filter(Boolean)
        .join('\n\n');

      const allGreetings = getAllPalGreetings(pal);
      const assembled = buildSillyTavernMessages({
        preset,
        rawMessages: recentMessages,
        charName: pal.name || 'Character',
        userName: sillyTavernPresetStore.userName || 'User',
        userPersona: sillyTavernPresetStore.userPersona || '',
        description,
        personality: cardData?.personality || '',
        scenario: cardData?.scenario || '',
        mesExamples: cardData?.mes_example || '',
        originalSystemPrompt: rawPrompt,
        charPrompt: cardData?.system_prompt || rawPrompt,
        charInstruction: cardData?.post_history_instructions || '',
        charCreatorNotes: cardData?.creator_notes || '',
        charVersion: cardData?.character_version || '1.0',
        charFirstMessage: cardData?.first_mes || allGreetings[0] || '',
        alternateGreetings: allGreetings,
        groupMembers,
        groupMutedMembers,
        isGroupChat,
        characterBook: mergedBook,
        depthPrompt: cardData?.extensions?.depth_prompt,
        experimentalMacroEngine:
          sillyTavernPresetStore.experimentalMacroEngine,
      });

      // Extract all system-level prompt blocks assembled by SillyTavern Prompt Manager
      const systemBlocks = assembled
        .filter(m => m.role === 'system')
        .map(m => m.content)
        .filter(Boolean);

      if (systemBlocks.length > 0) {
        return systemBlocks.join('\n\n');
      }

      return expandSillyTavernMacros(rawPrompt, {
        charName: pal.name || 'Character',
        userName: sillyTavernPresetStore.userName || 'User',
        userPersona: sillyTavernPresetStore.userPersona || '',
        description,
        groupMembers,
        groupMutedMembers,
        isGroupChat,
        experimentalMacroEngine:
          sillyTavernPresetStore.experimentalMacroEngine,
      });
    } catch {
      return rawPrompt;
    }
  }

  // Priority 2: PocketPal Personalization & Identity (Normal Chat only!)
  if (chatPersonalizationStore && chatPersonalizationStore.enabled) {
    const personalPrompt = chatPersonalizationStore.buildPersonalizationPrompt();
    if (personalPrompt && personalPrompt.trim()) {
      return personalPrompt;
    }
  }

  // Priority 3: Model's chat template system prompt
  if (model?.chatTemplate?.systemPrompt) {
    return model.chatTemplate.systemPrompt;
  }

  // Priority 4: Empty string
  return '';
}

type ChatMessage = {role: string; content?: unknown};

/**
 * Fold the system prompt + every talent fragment into ONE leading system
 * message; a second system message makes strict chat templates raise.
 */
export function assembleMessages(
  systemMessages: Array<{role: 'system'; content: string}>,
  systemPromptFragments: string[],
  followingMessages: ChatMessage[],
): ChatMessage[] {
  const parts = [
    ...systemMessages.map(msg => msg.content),
    ...systemPromptFragments,
  ].filter(part => part.trim().length > 0);

  const leadingSystemMessage: ChatMessage[] = parts.length
    ? [{role: 'system', content: parts.join('\n\n')}]
    : [];

  const messages = [...leadingSystemMessage, ...followingMessages];

  if (__DEV__) {
    const systemPositions = messages
      .map((msg, index) => (msg.role === 'system' ? index : -1))
      .filter(index => index >= 0);
    if (
      systemPositions.length > 1 ||
      (systemPositions.length === 1 && systemPositions[0] !== 0)
    ) {
      console.error(
        'assembleMessages: chat templates require at most one leading system ' +
          `message, but found system messages at [${systemPositions.join(', ')}].`,
      );
    }
  }

  return messages;
}

/**
 * Resolves system prompt and formats it as a system message array
 * Returns empty array if no system prompt is available
 */
export function resolveSystemMessages(
  dependencies: SystemPromptDependencies,
): Array<{role: 'system'; content: string}> {
  const systemPrompt = resolveSystemPrompt(dependencies);

  if (!systemPrompt.trim()) {
    return [];
  }

  return [
    {
      role: 'system' as const,
      content: systemPrompt,
    },
  ];
}
