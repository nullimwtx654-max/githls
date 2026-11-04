/**
 * Comprehensive Character Card V1, V2, V3, and V4 (CCv4) Specifications.
 * Supports character_book (Lorebook), depth_prompt, custom extensions, and assets.
 */

export interface CharacterBookEntry {
  id?: number | string;
  keys: string[];
  secondary_keys?: string[];
  comment?: string;
  content: string;
  constant?: boolean;
  selective?: boolean;
  insertion_order?: number;
  enabled?: boolean;
  position?: 'before_char' | 'after_char' | 'at_depth';
  case_sensitive?: boolean;
  name?: string;
  priority?: number;
  extensions?: Record<string, any>;
}

export interface CharacterBook {
  name?: string;
  description?: string;
  scan_depth?: number;
  token_budget?: number;
  recursive_scanning?: boolean;
  extensions?: Record<string, any>;
  entries: CharacterBookEntry[];
}

export interface CharacterAsset {
  type: string;
  uri: string;
  name?: string;
  ext?: string;
}

export interface DepthPrompt {
  prompt: string;
  depth: number;
  role: 'system' | 'user' | 'assistant';
}

export interface RegexScript {
  id?: string;
  script_name?: string;
  find_regex: string;
  replace_string: string;
  trim_strings?: string[];
  placement?: number[];
  disabled?: boolean;
  markdown_only?: boolean;
  prompt_only?: boolean;
  run_on_edit?: boolean;
  substitute_regex?: boolean;
  min_depth?: number;
  max_depth?: number;
}

/**
 * Character Card V4 (chara_card_v4) Specification
 */
export interface CharacterCardV4Data {
  name: string;
  description?: string;
  personality?: string;
  scenario?: string;
  first_mes?: string;
  mes_example?: string;
  creator_notes?: string;
  system_prompt?: string;
  post_history_instructions?: string;
  alternate_greetings?: string[];
  group_only_greetings?: string[];
  tags?: string[];
  creator?: string;
  character_version?: string;
  nickname?: string;
  character_book?: CharacterBook;
  assets?: CharacterAsset[];
  extensions?: {
    depth_prompt?: DepthPrompt;
    regex_scripts?: RegexScript[];
    talkativeness?: number | string;
    fav?: boolean;
    world?: string;
    [key: string]: any;
  };
}

export interface CharacterCardV4 {
  spec: 'chara_card_v4';
  spec_version: '4.0';
  data: CharacterCardV4Data;
}

export interface CharacterCardV2Data {
  name: string;
  description: string;
  personality: string;
  scenario: string;
  first_mes: string;
  mes_example: string;
  creator_notes?: string;
  system_prompt?: string;
  post_history_instructions?: string;
  alternate_greetings?: string[];
  character_book?: CharacterBook;
  tags?: string[];
  creator?: string;
  character_version?: string;
  extensions?: Record<string, any>;
}

export interface CharacterCardV2 {
  spec: 'chara_card_v2';
  spec_version: '2.0';
  data: CharacterCardV2Data;
}

export interface CharacterCardV1 {
  name: string;
  description: string;
  personality: string;
  scenario: string;
  first_mes: string;
  mes_example: string;
}

export type AnyCharacterCard =
  | CharacterCardV4
  | CharacterCardV2
  | (CharacterCardV1 & {spec?: never});
