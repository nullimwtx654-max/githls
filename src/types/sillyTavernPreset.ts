/**
 * SillyTavern Presets & Prompt Manager TypeScript Definitions
 * Covers full Chat Completion & Context Presets:
 * - Prompt Manager ordering & depth injections
 * - Standard & Experimental Macro Engine ({{char}}, {{user}}, {{persona}}, .var/$var shorthands,
 *   scoped blocks {{if}}...{{else}}...{{/if}}, nested macros, math/calc, pipe filters, outlets)
 * - World Info / Lorebook formatting (all 8 positions: 0..7)
 * - Complete generation samplers
 * - Utility prompts & post-processing
 */

import type {RegexScript} from './characterCard';

export type STPromptRole = 'system' | 'user' | 'assistant';

export interface STPromptItem {
  identifier: string;
  name: string;
  system_prompt?: boolean;
  role?: STPromptRole;
  content: string;
  marker?: boolean;
  injection_position?: number; // 0 = relative order, 1 = in-chat at depth
  injection_depth?: number;
  injection_order?: number;
  forbid_overrides?: boolean;
  enabled?: boolean;
}

export interface STPromptOrderEntry {
  identifier: string;
  enabled: boolean;
}

export interface STPromptOrderGroup {
  character_id?: number | string;
  order: STPromptOrderEntry[];
}

export type STPromptPostProcessing = 'none' | 'merge' | 'semi' | 'strict';
export type STNamesBehavior = -1 | 0 | 1 | 2; // -1: None, 0: Default, 1: Completion, 2: Content

export interface SillyTavernPreset {
  id: string;
  name: string;
  description?: string;
  isBuiltin?: boolean;

  // Samplers
  temperature: number;
  top_p: number;
  top_k: number;
  min_p: number;
  top_a: number;
  typical_p: number;
  tfs: number;
  repetition_penalty: number;
  repetition_penalty_range: number;
  frequency_penalty: number;
  presence_penalty: number;
  mirostat_mode?: number;
  mirostat_tau?: number;
  mirostat_eta?: number;
  dry_multiplier?: number;
  dry_base?: number;
  dry_allowed_length?: number;
  dry_sequence_breakers?: string[];
  xtc_threshold?: number;
  xtc_probability?: number;
  dynatemp_low?: number;
  dynatemp_high?: number;
  dynatemp_exponent?: number;
  smoothing_factor?: number;
  smoothing_curve?: number;
  max_context?: number;
  max_tokens: number;
  custom_stopping_strings?: string[];
  logit_bias?: Record<string, number>;

  // Formatting & Utility Prompts
  wi_format: string;
  scenario_format: string;
  personality_format: string;
  new_chat_prompt?: string;
  new_group_chat_prompt?: string;
  new_example_chat_prompt?: string;
  continue_nudge_prompt?: string;
  impersonation_prompt?: string;
  group_nudge_prompt?: string;
  send_if_empty?: string;
  authors_note?: string;
  authors_note_depth?: number;
  authors_note_role?: STPromptRole;
  names_behavior?: STNamesBehavior;
  custom_prompt_post_processing?: STPromptPostProcessing;
  squash_system_messages?: boolean;
  wrap_in_quotes?: boolean;
  prefer_character_prompt?: boolean;
  prefer_character_instructions?: boolean;

  // Optional nested convenience wrappers
  samplers?: Record<string, any>;
  utility?: Record<string, any>;

  // Prompt Manager
  prompts: STPromptItem[];
  prompt_order?: STPromptOrderGroup[];

  // Regex scripts
  regex_scripts?: RegexScript[];
}

export interface STMacroContext {
  charName: string;
  userName?: string;
  userPersona?: string;
  description?: string;
  personality?: string;
  scenario?: string;
  mesExamples?: string;
  mesExamplesRaw?: string;
  original?: string;
  charPrompt?: string;
  charInstruction?: string;
  charCreatorNotes?: string;
  charVersion?: string;
  charFirstMessage?: string;
  alternateGreetings?: string[];
  groupMembers?: string[];
  groupMutedMembers?: string[];
  isGroupChat?: boolean;
  lastChatMessage?: string;
  lastUserMessage?: string;
  lastCharMessage?: string;
  currentInput?: string;
  modelName?: string;
  maxContextTokens?: number;
  maxResponseTokens?: number;
  lastGenerationType?: string;
  messageCount?: number;
  turnCount?: number;
  lastMessageId?: number | string;
  firstIncludedMessageId?: number | string;
  messages?: Array<{role: string; text: string; name?: string}>;
  outlets?: Record<string, string>;
  authorsNote?: string;
  charDepthPrompt?: string;
  experimentalMacroEngine?: boolean;
}
