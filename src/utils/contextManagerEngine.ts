/**
 * Smart Context Management Engine (`contextManagerEngine.ts`)
 *
 * Calculates exact token budgets for all permanent/pinned memory blocks:
 * 1. AI Preset Prompts (Main, Auxiliary/NSFW, Post-History/Jailbreak, Custom Prompts)
 * 2. Character Card Definitions (Description, Personality, Scenario, Example Dialogues, Card System Prompt)
 * 3. World Info / Lorebook Entries & Author's Note Depth Injections
 * 4. Personalization, User Persona/Bio, Semantic Memories & Cross-Chat Lookup
 * 5. Reserved Generation Output (`max_tokens` / `n_predict`)
 *
 * When the context window is set (e.g. 64k = 65,536 tokens, or 4k/8k/16k/32k/128k),
 * it subtracts the permanent pinned tokens + reserved output tokens from the context limit
 * and automatically trims the oldest chat messages from the conversation history so that
 * permanent memory blocks are NEVER truncated or overflowed.
 */

export interface ContextBudgetBreakdown {
  maxContextTokens: number;
  reservedOutputTokens: number;
  permanentPinnedTokens: number;
  presetAndCardTokens: number;
  memoryAndLoreTokens: number;
  latestUserTurnTokens: number;
  availableHistoryBudget: number;
  usedHistoryTokens: number;
  totalPromptTokens: number;
  keptMessagesCount: number;
  droppedOldestMessagesCount: number;
}

/**
 * Estimates BPE token count for mixed English/CJK/code/roleplay text.
 * Accounts for standard Llama-3 / DeepSeek / GPT-4o tokenization (~3.6 chars per token for Latin,
 * ~1.2 tokens per CJK ideograph) plus 4 tokens of ChatML role framing overhead per message.
 */
export function estimateTokenCount(text: string | undefined | null): number {
  if (!text) {
    return 0;
  }
  const str = String(text);
  if (!str.length) {
    return 0;
  }
  let cjkCount = 0;
  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i);
    if (
      (code >= 0x4e00 && code <= 0x9fff) ||
      (code >= 0x3040 && code <= 0x30ff) ||
      (code >= 0xac00 && code <= 0xd7af)
    ) {
      cjkCount++;
    }
  }
  const nonCjkLength = str.length - cjkCount;
  return Math.ceil(nonCjkLength / 3.6 + cjkCount * 1.2);
}

export function estimateMessageTokens(msg: {
  role?: string;
  content?: any;
}): number {
  if (!msg) {
    return 0;
  }
  const FRAMING_OVERHEAD = 4;
  if (typeof msg.content === 'string') {
    return FRAMING_OVERHEAD + estimateTokenCount(msg.content);
  }
  if (Array.isArray(msg.content)) {
    let sum = FRAMING_OVERHEAD;
    for (const part of msg.content) {
      if (part?.type === 'text' && typeof part.text === 'string') {
        sum += estimateTokenCount(part.text);
      } else if (part?.type === 'image_url') {
        sum += 256; // Approximate vision patch token budget
      }
    }
    return sum;
  }
  return FRAMING_OVERHEAD;
}

/**
 * Prunes the oldest chat history messages so that:
 * `permanentPinnedTokens + usedHistoryTokens + latestUserTurnTokens + reservedOutputTokens <= maxContextTokens`
 */
export function pruneChatHistoryToFitContext<
  T extends {role: string; content: any},
>({
  systemMessages,
  systemPromptFragments,
  chatHistoryMessages,
  latestUserMessage,
  maxContextTokens = 65536,
  reservedOutputTokens = 1024,
  extraPermanentTokens = 0,
}: {
  systemMessages: Array<{role: 'system'; content: string}>;
  systemPromptFragments: string[];
  chatHistoryMessages: T[];
  latestUserMessage: T;
  maxContextTokens?: number;
  reservedOutputTokens?: number;
  extraPermanentTokens?: number;
}): {
  keptHistoryMessages: T[];
  breakdown: ContextBudgetBreakdown;
} {
  const safeMaxContext = Math.max(1024, maxContextTokens || 65536);
  const safeReservedOutput = Math.min(
    Math.floor(safeMaxContext * 0.35),
    Math.max(128, reservedOutputTokens || 1024),
  );

  // 1. Calculate permanent tokens from Preset + Character Card + System Messages
  let presetAndCardTokens = 0;
  for (const sys of systemMessages) {
    presetAndCardTokens += estimateMessageTokens(sys);
  }

  // 2. Calculate permanent tokens from Memory + Personalization + Lorebook + Talent fragments
  let memoryAndLoreTokens = Math.max(0, extraPermanentTokens);
  for (const frag of systemPromptFragments) {
    if (frag && frag.trim()) {
      memoryAndLoreTokens += 4 + estimateTokenCount(frag);
    }
  }

  // 3. Calculate tokens for the latest incoming user message (always preserved)
  const latestUserTurnTokens = estimateMessageTokens(latestUserMessage);

  const permanentPinnedTokens =
    presetAndCardTokens + memoryAndLoreTokens + latestUserTurnTokens;

  // 4. Available token budget for past conversation turns
  const availableHistoryBudget = Math.max(
    128,
    safeMaxContext - permanentPinnedTokens - safeReservedOutput,
  );

  // 5. Walk backwards from newest history message to oldest, keeping all recent turns that fit
  const keptReversed: T[] = [];
  let usedHistoryTokens = 0;
  let droppedOldestMessagesCount = 0;

  for (let i = chatHistoryMessages.length - 1; i >= 0; i--) {
    const msg = chatHistoryMessages[i];
    const msgTokens = estimateMessageTokens(msg);
    if (usedHistoryTokens + msgTokens <= availableHistoryBudget) {
      keptReversed.push(msg);
      usedHistoryTokens += msgTokens;
    } else {
      // Once the budget is reached, all older messages before this point are dropped
      droppedOldestMessagesCount = i + 1;
      break;
    }
  }

  const keptHistoryMessages = keptReversed.reverse();
  const totalPromptTokens = permanentPinnedTokens + usedHistoryTokens;

  return {
    keptHistoryMessages,
    breakdown: {
      maxContextTokens: safeMaxContext,
      reservedOutputTokens: safeReservedOutput,
      permanentPinnedTokens,
      presetAndCardTokens,
      memoryAndLoreTokens,
      latestUserTurnTokens,
      availableHistoryBudget,
      usedHistoryTokens,
      totalPromptTokens,
      keptMessagesCount: keptHistoryMessages.length,
      droppedOldestMessagesCount,
    },
  };
}
