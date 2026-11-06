/**
 * SillyTavern Preset & Experimental Macro Engine (Official Spec Compliant):
 * - Full Standard & Experimental Macro Engine:
 *   - Recursive inside-out balanced evaluation (`{{getvar::{{char}}_mood}}`)
 *   - Variable shorthands `.localVar` and `$globalVar` with operators
 *     (`=`, `++`, `--`, `+=`, `-=`, `||`, `??`, `||=`, `??=`, `==`, `!=`, `>`, `>=`, `<`, `<=`)
 *   - Scoped macros (`{{if cond}}...{{else}}...{{/if}}`, `{{#if cond}}...{{/if}}`,
 *     `{{setvar name}}...{{/setvar}}`, `{{#setvar name}}...{{/setvar}}`, `{{//}}...{{///}}`)
 *   - Space-separated (`{{getvar foo}}`, `{{roll 1d20}}`), `::`-separated, and `:`-separated args
 *   - Escaped braces `\{\{literal\}\}` and legacy markers `<USER>`, `<BOT>`, `<CHAR>`, `<GROUP>`, `<CHARIFNOTGROUP>`
 *   - Pipe filters (`{{char | uppercase | trim}}`), math/calc (`{{calc::...}}`), date/time formatting
 *   - Group chat macros (`{{group}}`, `{{groupNotMuted}}`, `{{charIfNotGroup}}`, `{{notChar}}`)
 * - World Info / Lorebook multi-pass recursive scanner with all 8 positions (0..7) & selective logic
 * - Card override contract (`{{original}}`, `forbid_overrides`, `system_prompt`, `post_history_instructions`)
 * - Regex replacement script runner (supporting `/pattern/flags` and raw patterns)
 */

import type {
  SillyTavernPreset,
  STMacroContext,
  STPromptItem,
} from '../types/sillyTavernPreset';
import type {CharacterBook, RegexScript} from '../types/characterCard';
import type {CompletionParams} from './completionTypes';

export const DEFAULT_ST_PROMPTS: STPromptItem[] = [
  {
    identifier: 'main',
    name: 'Main Prompt',
    system_prompt: true,
    role: 'system',
    content:
      "Write {{char}}'s next reply in a fictional chat between {{char}} and {{user}}.",
    marker: false,
    injection_position: 0,
    injection_depth: 4,
    forbid_overrides: false,
    enabled: true,
  },
  {
    identifier: 'worldInfoBefore',
    name: 'World Info (before)',
    system_prompt: true,
    role: 'system',
    content: '',
    marker: true,
    injection_position: 0,
    enabled: true,
  },
  {
    identifier: 'personaDescription',
    name: 'Persona Description',
    system_prompt: true,
    role: 'system',
    content: '',
    marker: true,
    injection_position: 0,
    enabled: true,
  },
  {
    identifier: 'charDescription',
    name: 'Char Description',
    system_prompt: true,
    role: 'system',
    content: '',
    marker: true,
    injection_position: 0,
    enabled: true,
  },
  {
    identifier: 'charPersonality',
    name: 'Char Personality',
    system_prompt: true,
    role: 'system',
    content: '',
    marker: true,
    injection_position: 0,
    enabled: true,
  },
  {
    identifier: 'scenario',
    name: 'Scenario',
    system_prompt: true,
    role: 'system',
    content: '',
    marker: true,
    injection_position: 0,
    enabled: true,
  },
  {
    identifier: 'enhanceDefinitions',
    name: 'Enhance Definitions',
    system_prompt: true,
    role: 'system',
    content:
      "If you have more knowledge of {{char}}, add to the character's lore and personality to enhance them.",
    marker: false,
    injection_position: 0,
    enabled: false,
  },
  {
    identifier: 'nsfw',
    name: 'Auxiliary Prompt',
    system_prompt: true,
    role: 'system',
    content:
      'Stay true to the established tone, setting, and character voice of {{char}}.',
    marker: false,
    injection_position: 0,
    enabled: true,
  },
  {
    identifier: 'worldInfoAfter',
    name: 'World Info (after)',
    system_prompt: true,
    role: 'system',
    content: '',
    marker: true,
    injection_position: 0,
    enabled: true,
  },
  {
    identifier: 'dialogueExamples',
    name: 'Chat Examples',
    system_prompt: true,
    role: 'system',
    content: '',
    marker: true,
    injection_position: 0,
    enabled: true,
  },
  {
    identifier: 'chatHistory',
    name: 'Chat History',
    system_prompt: true,
    role: 'system',
    content: '',
    marker: true,
    injection_position: 0,
    enabled: true,
  },
  {
    identifier: 'jailbreak',
    name: 'Post-History Instructions',
    system_prompt: true,
    role: 'system',
    content:
      '[System note: Write vivid, in-character responses for {{char}}. Do not speak or act for {{user}}.]',
    marker: false,
    injection_position: 0,
    forbid_overrides: false,
    enabled: true,
  },
];

export const BUILT_IN_ST_PRESETS: SillyTavernPreset[] = [
  {
    id: 'st-default-roleplay',
    name: 'SillyTavern Default Roleplay',
    description: 'Standard SillyTavern character chat & roleplay preset.',
    isBuiltin: true,
    temperature: 0.95,
    top_p: 0.95,
    top_k: 40,
    min_p: 0.05,
    top_a: 0,
    typical_p: 1,
    tfs: 1,
    repetition_penalty: 1.1,
    repetition_penalty_range: 1024,
    frequency_penalty: 0,
    presence_penalty: 0,
    dry_multiplier: 0.8,
    xtc_probability: 0,
    xtc_threshold: 0.1,
    dynatemp_low: 0.7,
    dynatemp_high: 1.2,
    smoothing_factor: 0.2,
    max_tokens: 512,
    wi_format: '[World Info — {0}: {1}]',
    scenario_format: '[Scenario: {{scenario}}]',
    personality_format: "[{{char}}'s personality: {{personality}}]",
    new_chat_prompt: '[Start a new Chat]',
    new_group_chat_prompt: '[Start a new group chat. Group members: {{group}}]',
    new_example_chat_prompt: '[Example Chat]',
    group_nudge_prompt: '[Write the next reply only as {{char}}.]',
    continue_nudge_prompt:
      '[Continue the following message without repeating its original text: {{lastChatMessage}}]',
    impersonation_prompt:
      "[Write your next reply from the point of view of {{user}}, using the chat history so far as a guideline for {{user}}'s writing style. Don't write as {{char}}.]",
    authors_note:
      "[Author's Note: Use vivid sensory details and stay faithful to {{char}}'s established voice.]",
    authors_note_depth: 4,
    authors_note_role: 'system',
    names_behavior: 0,
    custom_prompt_post_processing: 'none',
    squash_system_messages: false,
    wrap_in_quotes: false,
    prefer_character_prompt: true,
    prefer_character_instructions: true,
    prompts: JSON.parse(JSON.stringify(DEFAULT_ST_PROMPTS)),
    prompt_order: [
      {
        character_id: 100001,
        order: DEFAULT_ST_PROMPTS.map(p => ({
          identifier: p.identifier,
          enabled: p.enabled ?? true,
        })),
      },
    ],
  },
  {
    id: 'st-immersive-creative',
    name: 'Immersive Creative Novelist',
    description:
      'Atmospheric literary fiction preset with higher creativity and sensory depth.',
    isBuiltin: true,
    temperature: 1.12,
    top_p: 0.98,
    top_k: 60,
    min_p: 0.06,
    top_a: 0,
    typical_p: 1,
    tfs: 1,
    repetition_penalty: 1.12,
    repetition_penalty_range: 2048,
    frequency_penalty: 0.05,
    presence_penalty: 0.05,
    dry_multiplier: 0.8,
    xtc_probability: 0.15,
    xtc_threshold: 0.1,
    dynatemp_low: 0.85,
    dynatemp_high: 1.35,
    smoothing_factor: 0.25,
    max_tokens: 768,
    wi_format: '[Lorebook ({0}): {1}]',
    scenario_format: '[Current Scenario: {{scenario}}]',
    personality_format: '[Character Traits: {{personality}}]',
    new_chat_prompt: '[Begin Narrative Scene]',
    new_group_chat_prompt: '[Begin Group Scene with {{group}}]',
    group_nudge_prompt: '[Write the next response solely as {{char}}.]',
    continue_nudge_prompt:
      '[Continue seamlessly from the exact point where the last paragraph ended.]',
    impersonation_prompt:
      "[Write the next response from {{user}}'s perspective in rich narrative prose.]",
    authors_note:
      "[Author's Note: Emphasize atmosphere, body language, internal monologue, and natural pacing.]",
    authors_note_depth: 3,
    authors_note_role: 'system',
    names_behavior: 0,
    custom_prompt_post_processing: 'merge',
    squash_system_messages: false,
    wrap_in_quotes: false,
    prefer_character_prompt: true,
    prefer_character_instructions: true,
    prompts: JSON.parse(JSON.stringify(DEFAULT_ST_PROMPTS)),
    prompt_order: [
      {
        character_id: 100001,
        order: DEFAULT_ST_PROMPTS.map(p => ({
          identifier: p.identifier,
          enabled: p.enabled ?? true,
        })),
      },
    ],
  },
  {
    id: 'st-precise-grounded',
    name: 'Focused & Grounded Logic',
    description:
      'Low-temperature, coherent preset for structured roleplay and long-context consistency.',
    isBuiltin: true,
    temperature: 0.72,
    top_p: 0.9,
    top_k: 30,
    min_p: 0.08,
    top_a: 0,
    typical_p: 1,
    tfs: 1,
    repetition_penalty: 1.08,
    repetition_penalty_range: 1024,
    frequency_penalty: 0,
    presence_penalty: 0,
    max_tokens: 512,
    wi_format: '[Context ({0}): {1}]',
    scenario_format: '[Scenario: {{scenario}}]',
    personality_format: '[Personality: {{personality}}]',
    new_chat_prompt: '[Start Session]',
    new_group_chat_prompt: '[Start Group Session: {{group}}]',
    group_nudge_prompt: '[Reply as {{char}}.]',
    continue_nudge_prompt: '[Continue your previous response.]',
    impersonation_prompt: '[Respond as {{user}}.]',
    authors_note:
      "[Author's Note: Maintain strict continuity with established facts and character logic.]",
    authors_note_depth: 4,
    authors_note_role: 'system',
    names_behavior: 0,
    custom_prompt_post_processing: 'none',
    squash_system_messages: false,
    wrap_in_quotes: false,
    prefer_character_prompt: true,
    prefer_character_instructions: true,
    prompts: JSON.parse(JSON.stringify(DEFAULT_ST_PROMPTS)),
    prompt_order: [
      {
        character_id: 100001,
        order: DEFAULT_ST_PROMPTS.map(p => ({
          identifier: p.identifier,
          enabled: p.enabled ?? true,
        })),
      },
    ],
  },
];

// Runtime variable stores for {{setvar}} / {{getvar}} / {{.var}} and {{setglobalvar}} / {{getglobalvar}} / {{$var}}
const stRuntimeVariables: Record<string, string> = {};
const stGlobalVariables: Record<string, string> = {};
const stRuntimeOutlets: Record<string, string> = {};

export const getSillyTavernVariables = () => ({
  local: {...stRuntimeVariables},
  global: {...stGlobalVariables},
  outlets: {...stRuntimeOutlets},
});

export const setSillyTavernVariable = (
  key: string,
  value: string,
  isGlobal = false,
) => {
  if (isGlobal) {
    stGlobalVariables[key.trim()] = value;
  } else {
    stRuntimeVariables[key.trim()] = value;
  }
};

export const clearSillyTavernVariables = (clearGlobal = false) => {
  Object.keys(stRuntimeVariables).forEach(k => delete stRuntimeVariables[k]);
  if (clearGlobal) {
    Object.keys(stGlobalVariables).forEach(k => delete stGlobalVariables[k]);
  }
};

/**
 * Official SillyTavern truthiness check:
 * Falsy values: empty string, "false", "0", "off", "no", "null", "undefined", "nan"
 */
function isMacroTruthy(val: string | undefined | null): boolean {
  if (val === undefined || val === null) {
    return false;
  }
  const s = String(val).trim().toLowerCase();
  return (
    s !== '' &&
    s !== '0' &&
    s !== 'false' &&
    s !== 'off' &&
    s !== 'no' &&
    s !== 'null' &&
    s !== 'undefined' &&
    s !== 'nan'
  );
}

/**
 * De-dents and trims scoped macro content per official SillyTavern Experimental Macro Engine rules
 */
function trimAndDedentScopedContent(content: string): string {
  const lines = content.replace(/^\r?\n/, '').replace(/\r?\n[ \t]*$/, '').split(/\r?\n/);
  let minIndent: number | null = null;
  for (const line of lines) {
    if (line.trim().length === 0) {
      continue;
    }
    const match = line.match(/^[ \t]*/);
    const indent = match ? match[0].length : 0;
    if (minIndent === null || indent < minIndent) {
      minIndent = indent;
    }
  }
  if (minIndent && minIndent > 0) {
    return lines
      .map(l => (l.length >= minIndent! ? l.slice(minIndent!) : l))
      .join('\n')
      .trim();
  }
  return lines.join('\n').trim();
}

/**
 * Safe arithmetic expression evaluator for {{calc::...}} / {{math::...}}
 * Supports +, -, *, /, %, ^, parentheses, and decimal numbers without eval()
 */
export function evaluateSafeMathExpression(expr: string): string {
  const sanitized = expr.replace(/[^0-9+\-*/%.^()\s]/g, '').trim();
  if (!sanitized) {
    return '0';
  }
  try {
    let pos = 0;
    const str = sanitized.replace(/\s+/g, '');

    function parseExpression(): number {
      let val = parseTerm();
      while (pos < str.length && (str[pos] === '+' || str[pos] === '-')) {
        const op = str[pos++];
        const right = parseTerm();
        val = op === '+' ? val + right : val - right;
      }
      return val;
    }

    function parseTerm(): number {
      let val = parsePower();
      while (
        pos < str.length &&
        (str[pos] === '*' || str[pos] === '/' || str[pos] === '%')
      ) {
        const op = str[pos++];
        const right = parsePower();
        if (op === '*') {
          val *= right;
        } else if (op === '/') {
          val = right !== 0 ? val / right : 0;
        } else {
          val = right !== 0 ? val % right : 0;
        }
      }
      return val;
    }

    function parsePower(): number {
      let val = parseFactor();
      while (pos < str.length && str[pos] === '^') {
        pos++;
        const right = parseFactor();
        val = Math.pow(val, right);
      }
      return val;
    }

    function parseFactor(): number {
      if (str[pos] === '+') {
        pos++;
        return parseFactor();
      }
      if (str[pos] === '-') {
        pos++;
        return -parseFactor();
      }
      if (str[pos] === '(') {
        pos++;
        const val = parseExpression();
        if (str[pos] === ')') {
          pos++;
        }
        return val;
      }
      const start = pos;
      while (
        pos < str.length &&
        ((str[pos] >= '0' && str[pos] <= '9') || str[pos] === '.')
      ) {
        pos++;
      }
      const numStr = str.slice(start, pos);
      const parsed = parseFloat(numStr);
      return Number.isFinite(parsed) ? parsed : 0;
    }

    const res = parseExpression();
    if (!Number.isFinite(res)) {
      return '0';
    }
    return Number.isInteger(res) ? String(res) : String(Number(res.toFixed(6)));
  } catch {
    return '0';
  }
}

/**
 * Evaluates a pipe filter in the Experimental Macro Engine: e.g. `value | uppercase | trim`
 */
function applyPipeFilter(
  value: string,
  filterSpec: string,
  ctx: STMacroContext,
): string {
  const parts = filterSpec.trim().split(/[:\s]+/);
  const filterName = (parts[0] || '').toLowerCase();
  const arg = parts.slice(1).join(' ');

  switch (filterName) {
    case 'upper':
    case 'uppercase':
      return value.toUpperCase();
    case 'lower':
    case 'lowercase':
      return value.toLowerCase();
    case 'capitalize':
      return value.charAt(0).toUpperCase() + value.slice(1);
    case 'title':
    case 'titlecase':
      return value.replace(
        /\w\S*/g,
        txt => txt.charAt(0).toUpperCase() + txt.slice(1).toLowerCase(),
      );
    case 'trim':
      return value.trim();
    case 'reverse':
      return value.split('').reverse().join('');
    case 'length':
    case 'len':
      return String(value.length);
    case 'default':
      return value && value.trim() ? value : arg;
    case 'add':
    case 'plus': {
      const a = parseFloat(value);
      const b = parseFloat(arg);
      if (!Number.isNaN(a) && !Number.isNaN(b)) {
        return String(a + b);
      }
      return value + arg;
    }
    case 'sub':
    case 'minus': {
      const a = parseFloat(value) || 0;
      const b = parseFloat(arg) || 0;
      return String(a - b);
    }
    case 'mul':
    case 'times': {
      const a = parseFloat(value) || 0;
      const b = parseFloat(arg) || 0;
      return String(a * b);
    }
    case 'div': {
      const a = parseFloat(value) || 0;
      const b = parseFloat(arg) || 1;
      return b !== 0 ? String(a / b) : '0';
    }
    case 'round':
      return String(Math.round(parseFloat(value) || 0));
    case 'floor':
      return String(Math.floor(parseFloat(value) || 0));
    case 'ceil':
      return String(Math.ceil(parseFloat(value) || 0));
    case 'abs':
      return String(Math.abs(parseFloat(value) || 0));
    default:
      return expandSingleInnermostMacro(
        filterName + (arg ? `::${arg}` : ''),
        ctx,
      );
  }
}

/**
 * Evaluates Official SillyTavern Experimental Macro Engine Variable Shorthands:
 * `.varName` (local) and `$varName` (global) with operators:
 * `(none)`, `=`, `++`, `--`, `+=`, `-=`, `||`, `??`, `||=`, `??=`, `==`, `!=`, `>`, `>=`, `<`, `<=`
 */
function evaluateVariableShorthand(body: string): string | null {
  const trimmed = body.trim();
  if (!trimmed.startsWith('.') && !trimmed.startsWith('$')) {
    return null;
  }
  const isGlobal = trimmed.startsWith('$');
  const store = isGlobal ? stGlobalVariables : stRuntimeVariables;
  const rest = trimmed.slice(1).trim();

  // Match variable name at start
  const varMatch = rest.match(/^([a-zA-Z][a-zA-Z0-9_-]*)\s*(.*)$/s);
  if (!varMatch) {
    return null;
  }
  const varName = varMatch[1];
  const tail = varMatch[2].trim();

  // 1. No operator -> Get variable
  if (!tail) {
    return store[varName] ?? '';
  }

  // 2. Increment / Decrement (`++`, `--`)
  if (tail === '++') {
    const next = (parseFloat(store[varName] || '0') || 0) + 1;
    store[varName] = String(next);
    return String(next);
  }
  if (tail === '--') {
    const next = (parseFloat(store[varName] || '0') || 0) - 1;
    store[varName] = String(next);
    return String(next);
  }

  // 3. Two-/three-char operators (`||=`, `??=`, `+=`, `-=`, `==`, `!=`, `>=`, `<=`, `||`, `??`, `=`, `>`, `<`)
  const opMatch = tail.match(
    /^(\|\|=|\?\?=|\+=|-=|==|!=|>=|<=|\|\||\?\?|=|>|<)\s*(.*)$/s,
  );
  if (!opMatch) {
    return null;
  }
  const op = opMatch[1];
  const rhs = opMatch[2];
  const exists = Object.prototype.hasOwnProperty.call(store, varName);
  const current = store[varName] ?? '';

  switch (op) {
    case '=':
      store[varName] = rhs;
      return '';
    case '+=': {
      const a = parseFloat(current || '0');
      const b = parseFloat(rhs);
      if (!Number.isNaN(a) && !Number.isNaN(b) && (current === '' || !Number.isNaN(Number(current)))) {
        store[varName] = String(a + b);
      } else {
        store[varName] = current + rhs;
      }
      return '';
    }
    case '-=': {
      const a = parseFloat(current || '0');
      const b = parseFloat(rhs);
      if (!Number.isNaN(a) && !Number.isNaN(b)) {
        store[varName] = String(a - b);
      }
      return '';
    }
    case '||':
      return isMacroTruthy(current) ? current : rhs;
    case '??':
      return exists && store[varName] !== undefined ? store[varName] : rhs;
    case '||=':
      if (!isMacroTruthy(current)) {
        store[varName] = rhs;
      }
      return store[varName] ?? '';
    case '??=':
      if (!exists || store[varName] === undefined) {
        store[varName] = rhs;
      }
      return store[varName] ?? '';
    case '==':
      return String(current.trim() === rhs.trim());
    case '!=':
      return String(current.trim() !== rhs.trim());
    case '>':
      return String((parseFloat(current || '0') || 0) > (parseFloat(rhs || '0') || 0));
    case '>=':
      return String((parseFloat(current || '0') || 0) >= (parseFloat(rhs || '0') || 0));
    case '<':
      return String((parseFloat(current || '0') || 0) < (parseFloat(rhs || '0') || 0));
    case '<=':
      return String((parseFloat(current || '0') || 0) <= (parseFloat(rhs || '0') || 0));
    default:
      return null;
  }
}

/**
 * Formats a date using SillyTavern's `{{datetimeformat::FORMAT}}` tokens
 */
function formatCustomDateTime(date: Date, fmt: string): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  const yyyy = String(date.getFullYear());
  const yy = yyyy.slice(-2);
  const MM = pad(date.getMonth() + 1);
  const dd = pad(date.getDate());
  const HH = pad(date.getHours());
  const hh12 = pad(date.getHours() % 12 || 12);
  const mm = pad(date.getMinutes());
  const ss = pad(date.getSeconds());
  const ampm = date.getHours() >= 12 ? 'PM' : 'AM';
  const weekday = date.toLocaleDateString('en-US', {weekday: 'long'});
  const monthName = date.toLocaleDateString('en-US', {month: 'long'});

  return fmt
    .replace(/YYYY/g, yyyy)
    .replace(/YY/g, yy)
    .replace(/MMMM/g, monthName)
    .replace(/MM/g, MM)
    .replace(/dddd/g, weekday)
    .replace(/DD/g, dd)
    .replace(/HH/g, HH)
    .replace(/hh/g, hh12)
    .replace(/mm/g, mm)
    .replace(/ss/g, ss)
    .replace(/A/g, ampm)
    .replace(/a/g, ampm.toLowerCase());
}

/**
 * Evaluates a single innermost macro body (without the outer `{{` and `}}`)
 * Supports both classic SillyTavern macros and Experimental Macro Engine syntax.
 */
function expandSingleInnermostMacro(rawBody: string, ctx: STMacroContext): string {
  let body = rawBody.trim();
  if (!body) {
    return '';
  }

  // Strip optional Experimental Macro Engine leading flags (`!`, `?`, `~`, `>`, `#`)
  if (/^[!?~>#]+\s*/.test(body) && !body.startsWith('!')) {
    body = body.replace(/^[?~>#]+\s*/, '');
  }

  // 1. Comments (`{{// ...}}`, `{{comment: ...}}`)
  if (
    body.startsWith('//') ||
    body.startsWith('/+') ||
    body.toLowerCase().startsWith('comment:') ||
    body.toLowerCase().startsWith('comment::') ||
    body.toLowerCase().startsWith('hidden_key:') ||
    body.toLowerCase().startsWith('hidden_key::')
  ) {
    return '';
  }

  // 2. Experimental Macro Engine Variable Shorthands (`.var` and `$var`)
  if (body.startsWith('.') || body.startsWith('$')) {
    const shorthandRes = evaluateVariableShorthand(body);
    if (shorthandRes !== null) {
      return shorthandRes;
    }
  }

  // 3. Experimental Macro Engine Pipe Syntax: `expr | filter1 | filter2`
  if (body.includes('|') && !body.includes('||') && !body.includes('::')) {
    const segments = body
      .split('|')
      .map(s => s.trim())
      .filter(Boolean);
    if (segments.length > 1) {
      let current = expandSingleInnermostMacro(segments[0], ctx);
      if (current === `{{${segments[0]}}}`) {
        current =
          stRuntimeVariables[segments[0]] ??
          stGlobalVariables[segments[0]] ??
          segments[0];
      }
      for (let i = 1; i < segments.length; i++) {
        current = applyPipeFilter(current, segments[i], ctx);
      }
      return current;
    }
  }

  // Normalize single-space argument syntax (`{{getvar myVar}}`, `{{roll 1d20}}`, `{{reverse Hello World}}`)
  // into `::` syntax if it doesn't already use `::`
  if (!body.includes('::') && /^([a-zA-Z_]+)\s+(.+)$/s.test(body)) {
    const m = body.match(/^([a-zA-Z_]+)\s+(.+)$/s);
    if (m) {
      const candidateCmd = m[1].toLowerCase();
      const spaceKnownCmds = new Set([
        'getvar',
        'setvar',
        'hasvar',
        'deletevar',
        'delvar',
        'flushvar',
        'incvar',
        'decvar',
        'addvar',
        'getglobalvar',
        'setglobalvar',
        'hasglobalvar',
        'deleteglobalvar',
        'delglobalvar',
        'flushglobalvar',
        'incglobalvar',
        'decglobalvar',
        'addglobalvar',
        'roll',
        'reverse',
        'upper',
        'uppercase',
        'lower',
        'lowercase',
        'capitalize',
        'titlecase',
        'trim',
        'length',
        'len',
        'calc',
        'math',
        'outlet',
        'banned',
        'datetimeformat',
        'newline',
        'space',
        'hasextension',
        'charfirstmessage',
      ]);
      if (spaceKnownCmds.has(candidateCmd)) {
        body = `${candidateCmd}::${m[2].trim()}`;
      }
    }
  }

  // 4. Double-colon (`::`) parameterized macros
  if (body.includes('::')) {
    const parts = body.split('::');
    const cmd = parts[0].trim().toLowerCase();
    const args = parts.slice(1);

    switch (cmd) {
      // Local & Global Variables
      case 'setvar': {
        const key = (args[0] || '').trim();
        const val = args.slice(1).join('::');
        if (key) {
          stRuntimeVariables[key] = val;
        }
        return '';
      }
      case 'var':
      case 'getvar': {
        const key = (args[0] || '').trim();
        return stRuntimeVariables[key] ?? '';
      }
      case 'hasvar': {
        const key = (args[0] || '').trim();
        return String(
          Object.prototype.hasOwnProperty.call(stRuntimeVariables, key),
        );
      }
      case 'deletevar':
      case 'flushvar':
      case 'delvar': {
        const key = (args[0] || '').trim();
        delete stRuntimeVariables[key];
        return '';
      }
      case 'setglobalvar': {
        const key = (args[0] || '').trim();
        const val = args.slice(1).join('::');
        if (key) {
          stGlobalVariables[key] = val;
        }
        return '';
      }
      case 'getglobalvar': {
        const key = (args[0] || '').trim();
        return stGlobalVariables[key] ?? '';
      }
      case 'hasglobalvar': {
        const key = (args[0] || '').trim();
        return String(
          Object.prototype.hasOwnProperty.call(stGlobalVariables, key),
        );
      }
      case 'deleteglobalvar':
      case 'flushglobalvar':
      case 'delglobalvar': {
        const key = (args[0] || '').trim();
        delete stGlobalVariables[key];
        return '';
      }
      case 'addvar': {
        const key = (args[0] || '').trim();
        const delta = args.slice(1).join('::');
        const cur = stRuntimeVariables[key] ?? '0';
        const numCur = parseFloat(cur);
        const numDelta = parseFloat(delta);
        if (!Number.isNaN(numCur) && !Number.isNaN(numDelta)) {
          stRuntimeVariables[key] = String(numCur + numDelta);
        } else {
          stRuntimeVariables[key] = (stRuntimeVariables[key] ?? '') + delta;
        }
        return '';
      }
      case 'addglobalvar': {
        const key = (args[0] || '').trim();
        const delta = args.slice(1).join('::');
        const cur = stGlobalVariables[key] ?? '0';
        const numCur = parseFloat(cur);
        const numDelta = parseFloat(delta);
        if (!Number.isNaN(numCur) && !Number.isNaN(numDelta)) {
          stGlobalVariables[key] = String(numCur + numDelta);
        } else {
          stGlobalVariables[key] = (stGlobalVariables[key] ?? '') + delta;
        }
        return '';
      }
      case 'incvar': {
        const key = (args[0] || '').trim();
        const next = (parseFloat(stRuntimeVariables[key] || '0') || 0) + 1;
        stRuntimeVariables[key] = String(next);
        return String(next);
      }
      case 'decvar': {
        const key = (args[0] || '').trim();
        const next = (parseFloat(stRuntimeVariables[key] || '0') || 0) - 1;
        stRuntimeVariables[key] = String(next);
        return String(next);
      }
      case 'incglobalvar': {
        const key = (args[0] || '').trim();
        const next = (parseFloat(stGlobalVariables[key] || '0') || 0) + 1;
        stGlobalVariables[key] = String(next);
        return String(next);
      }
      case 'decglobalvar': {
        const key = (args[0] || '').trim();
        const next = (parseFloat(stGlobalVariables[key] || '0') || 0) - 1;
        stGlobalVariables[key] = String(next);
        return String(next);
      }

      // Outlets
      case 'outlet': {
        const name = (args[0] || '').trim();
        return ctx.outlets?.[name] ?? stRuntimeOutlets[name] ?? '';
      }
      case 'setoutlet': {
        const name = (args[0] || '').trim();
        const val = args.slice(1).join('::');
        if (name) {
          stRuntimeOutlets[name] = val;
        }
        return '';
      }

      // Random / Pick
      case 'random':
      case 'pick': {
        const items = args.filter(Boolean);
        if (items.length === 0) {
          return '';
        }
        if (cmd === 'pick') {
          // Deterministic pick per input items + chat length
          const seedStr = `${items.join('|')}:${ctx.messageCount ?? 0}`;
          let hash = 0;
          for (let i = 0; i < seedStr.length; i++) {
            hash = (hash * 31 + seedStr.charCodeAt(i)) >>> 0;
          }
          return items[hash % items.length];
        }
        return items[Math.floor(Math.random() * items.length)];
      }

      // Dice Roll
      case 'roll': {
        return evaluateDiceRoll(args[0] || '1d20');
      }

      // Math & Arithmetic (Experimental Macro Engine)
      case 'add':
      case 'sum': {
        const sum = args.reduce((acc, v) => acc + (parseFloat(v) || 0), 0);
        return String(sum);
      }
      case 'sub':
      case 'subtract': {
        const a = parseFloat(args[0] || '0') || 0;
        const b = parseFloat(args[1] || '0') || 0;
        return String(a - b);
      }
      case 'mul':
      case 'multiply': {
        const prod = args.reduce((acc, v) => acc * (parseFloat(v) || 0), 1);
        return String(prod);
      }
      case 'div':
      case 'divide': {
        const a = parseFloat(args[0] || '0') || 0;
        const b = parseFloat(args[1] || '1') || 1;
        return b !== 0 ? String(a / b) : '0';
      }
      case 'mod': {
        const a = parseFloat(args[0] || '0') || 0;
        const b = parseFloat(args[1] || '1') || 1;
        return b !== 0 ? String(a % b) : '0';
      }
      case 'pow': {
        const a = parseFloat(args[0] || '0') || 0;
        const b = parseFloat(args[1] || '1') || 1;
        return String(Math.pow(a, b));
      }
      case 'min': {
        const nums = args.map(v => parseFloat(v)).filter(n => !Number.isNaN(n));
        return nums.length ? String(Math.min(...nums)) : '0';
      }
      case 'max': {
        const nums = args.map(v => parseFloat(v)).filter(n => !Number.isNaN(n));
        return nums.length ? String(Math.max(...nums)) : '0';
      }
      case 'abs':
        return String(Math.abs(parseFloat(args[0] || '0') || 0));
      case 'round':
        return String(Math.round(parseFloat(args[0] || '0') || 0));
      case 'floor':
        return String(Math.floor(parseFloat(args[0] || '0') || 0));
      case 'ceil':
        return String(Math.ceil(parseFloat(args[0] || '0') || 0));
      case 'calc':
      case 'math':
        return evaluateSafeMathExpression(args.join('::'));

      // Conditionals & Boolean Comparisons
      case 'if':
      case 'ifelse': {
        const cond = evaluateMacroCondition(args[0] || '', ctx);
        const thenBranch = args[1] ?? '';
        const elseBranch = args.slice(2).join('::');
        return cond ? thenBranch : elseBranch;
      }
      case 'unless': {
        const cond = evaluateMacroCondition(args[0] || '', ctx);
        const thenBranch = args[1] ?? '';
        const elseBranch = args.slice(2).join('::');
        return !cond ? thenBranch : elseBranch;
      }
      case 'eq':
      case 'equals':
        return String((args[0] ?? '').trim() === (args[1] ?? '').trim());
      case 'ne':
      case 'neq':
        return String((args[0] ?? '').trim() !== (args[1] ?? '').trim());
      case 'gt':
        return String(
          (parseFloat(args[0] || '0') || 0) > (parseFloat(args[1] || '0') || 0),
        );
      case 'lt':
        return String(
          (parseFloat(args[0] || '0') || 0) < (parseFloat(args[1] || '0') || 0),
        );
      case 'gte':
        return String(
          (parseFloat(args[0] || '0') || 0) >=
            (parseFloat(args[1] || '0') || 0),
        );
      case 'lte':
        return String(
          (parseFloat(args[0] || '0') || 0) <=
            (parseFloat(args[1] || '0') || 0),
        );
      case 'and':
        return String(args.every(a => isMacroTruthy(a)));
      case 'or':
        return String(args.some(a => isMacroTruthy(a)));
      case 'not':
        return String(!isMacroTruthy(args[0]));
      case 'contains':
        return String(
          (args[0] ?? '').toLowerCase().includes((args[1] ?? '').toLowerCase()),
        );
      case 'matches': {
        try {
          const re = new RegExp(args[1] || '', 'i');
          return String(re.test(args[0] || ''));
        } catch {
          return 'false';
        }
      }

      // String & Regex Transformations
      case 'lowercase':
      case 'lower':
        return args.join('::').toLowerCase();
      case 'uppercase':
      case 'upper':
        return args.join('::').toUpperCase();
      case 'capitalize': {
        const s = args.join('::');
        return s.charAt(0).toUpperCase() + s.slice(1);
      }
      case 'titlecase': {
        const s = args.join('::');
        return s.replace(
          /\w\S*/g,
          txt => txt.charAt(0).toUpperCase() + txt.slice(1).toLowerCase(),
        );
      }
      case 'reverse':
        return args.join('::').split('').reverse().join('');
      case 'trim':
        return args.join('::').trim();
      case 'length':
      case 'len':
        return String(args.join('::').length);
      case 'substr':
      case 'substring': {
        const str = args[0] || '';
        const start = parseInt(args[1] || '0', 10) || 0;
        const len = args[2] !== undefined ? parseInt(args[2], 10) : undefined;
        return len !== undefined
          ? str.slice(start, start + len)
          : str.slice(start);
      }
      case 'replace': {
        const str = args[0] || '';
        const find = args[1] || '';
        const rep = args[2] ?? '';
        return find ? str.split(find).join(rep) : str;
      }
      case 'regex_replace': {
        const str = args[0] || '';
        const pattern = args[1] || '';
        const rep = args[2] ?? '';
        try {
          return str.replace(new RegExp(pattern, 'g'), rep);
        } catch {
          return str;
        }
      }
      case 'repeat': {
        const count = Math.min(
          100,
          Math.max(0, parseInt(args[0] || '1', 10) || 0),
        );
        const str = args.slice(1).join('::');
        return str.repeat(count);
      }
      case 'newline': {
        const count = Math.min(20, Math.max(1, parseInt(args[0] || '1', 10) || 1));
        return '\n'.repeat(count);
      }
      case 'space': {
        const count = Math.min(100, Math.max(1, parseInt(args[0] || '1', 10) || 1));
        return ' '.repeat(count);
      }
      case 'join': {
        const sep = args[0] ?? ', ';
        return args.slice(1).join(sep);
      }
      case 'datetimeformat': {
        return formatCustomDateTime(new Date(), args.join('::') || 'YYYY-MM-DD HH:mm');
      }
      case 'time': {
        const offsetMatch = (args[0] || '').match(/UTC([+-]\d+)/i);
        if (offsetMatch) {
          const offsetHours = parseInt(offsetMatch[1], 10) || 0;
          const utcMs = Date.now() + new Date().getTimezoneOffset() * 60000;
          const target = new Date(utcMs + offsetHours * 3600000);
          return target.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'});
        }
        return new Date().toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'});
      }
      case 'charfirstmessage': {
        const idx = parseInt(args[0] || '0', 10) || 0;
        const greetings = ctx.alternateGreetings || [];
        if (idx === 0) {
          return ctx.charFirstMessage || greetings[0] || '';
        }
        return greetings[idx] ?? ctx.charFirstMessage ?? '';
      }
      case 'hasextension':
        return 'false';
      case 'banned':
        return '';

      // Message History Lookups
      case 'nthmessage': {
        const idx = parseInt(args[0] || '0', 10);
        const msgs = ctx.messages || [];
        if (idx >= 0 && idx < msgs.length) {
          return msgs[idx].text || '';
        }
        if (idx < 0 && Math.abs(idx) <= msgs.length) {
          return msgs[msgs.length + idx].text || '';
        }
        return '';
      }
      case 'lastmessages': {
        const count = Math.max(1, parseInt(args[0] || '3', 10) || 3);
        const msgs = ctx.messages || [];
        return msgs
          .slice(-count)
          .map(m => m.text)
          .join('\n');
      }
      case 'timediff':
      case 'time_diff': {
        const t1 = new Date(args[0] || Date.now()).getTime();
        const t2 = new Date(args[1] || Date.now()).getTime();
        const diffMins = Math.round(Math.abs(t2 - t1) / 60000);
        return `${diffMins}m`;
      }
    }
  }

  // 5. Single-colon macros (`random:a,b,c`, `pick:a,b,c`, `roll:1d20+2`)
  if (body.includes(':')) {
    const colonIdx = body.indexOf(':');
    const cmd = body.slice(0, colonIdx).trim().toLowerCase();
    const argStr = body.slice(colonIdx + 1).trim();

    if (cmd === 'random' || cmd === 'pick') {
      const items = argStr
        .split(',')
        .map(s => s.trim())
        .filter(Boolean);
      return items.length
        ? items[Math.floor(Math.random() * items.length)]
        : '';
    }
    if (cmd === 'roll') {
      return evaluateDiceRoll(argStr);
    }
    if (cmd === 'setvar') {
      const eqIdx = argStr.indexOf('=');
      if (eqIdx !== -1) {
        stRuntimeVariables[argStr.slice(0, eqIdx).trim()] = argStr
          .slice(eqIdx + 1)
          .trim();
        return '';
      }
    }
    if (cmd === 'getvar' || cmd === 'var') {
      return stRuntimeVariables[argStr] ?? '';
    }
  }

  // 6. Simple token macros (Official SillyTavern Macro Catalog)
  const now = new Date();
  const groupList =
    ctx.groupMembers && ctx.groupMembers.length > 0
      ? ctx.groupMembers
      : [ctx.charName || 'Assistant'];
  const mutedSet = new Set(ctx.groupMutedMembers || []);
  const unmutedGroupList = groupList.filter(m => !mutedSet.has(m));
  const isGroup = Boolean(ctx.isGroupChat || (ctx.groupMembers && ctx.groupMembers.length > 1));

  switch (body.toLowerCase()) {
    case 'char':
      return ctx.charName || 'Assistant';
    case 'user':
      return ctx.userName || 'User';
    case 'group':
    case 'group_members':
      return groupList.join(', ');
    case 'groupnotmuted':
    case 'group_not_muted':
      return unmutedGroupList.join(', ');
    case 'charifnotgroup':
    case 'char_if_not_group':
      return isGroup ? '' : ctx.charName || 'Assistant';
    case 'notchar':
    case 'not_char': {
      const allParticipants = [...groupList, ctx.userName || 'User'];
      return allParticipants.filter(p => p !== ctx.charName).join(', ');
    }
    case 'persona':
      return ctx.userPersona || '';
    case 'description':
      return ctx.description || '';
    case 'personality':
      return ctx.personality || '';
    case 'scenario':
      return ctx.scenario || '';
    case 'mesexamples':
    case 'mes_examples':
      return ctx.mesExamples || '';
    case 'mesexamplesraw':
    case 'mes_examples_raw':
      return ctx.mesExamplesRaw || ctx.mesExamples || '';
    case 'original':
    case 'card_prompt':
    case 'system':
    case 'systemprompt':
    case 'defaultsystemprompt':
      return ctx.original || '';
    case 'charprompt':
    case 'char_prompt':
      return ctx.charPrompt || '';
    case 'charinstruction':
    case 'char_instruction':
      return ctx.charInstruction || '';
    case 'charcreatornotes':
    case 'char_creator_notes':
      return ctx.charCreatorNotes || '';
    case 'char_version':
    case 'charversion':
      return ctx.charVersion || '1.0';
    case 'charfirstmessage':
    case 'char_first_message':
      return ctx.charFirstMessage || '';
    case 'authorsnote':
    case 'authors_note':
    case 'charauthorsnote':
    case 'defaultauthorsnote':
      return ctx.authorsNote || '';
    case 'chardepthprompt':
    case 'char_depth_prompt':
      return ctx.charDepthPrompt || '';
    case 'lastchatmessage':
    case 'lastmessage':
      return ctx.lastChatMessage || '';
    case 'lastusermessage':
      return ctx.lastUserMessage || '';
    case 'input':
      return ctx.currentInput ?? ctx.lastUserMessage ?? '';
    case 'lastcharmessage':
      return ctx.lastCharMessage || '';
    case 'model':
      return ctx.modelName || 'Local AI';
    case 'maxprompt':
    case 'max_prompt':
      return String(
        Math.max(
          512,
          (ctx.maxContextTokens ?? 4096) - (ctx.maxResponseTokens ?? 512),
        ),
      );
    case 'maxcontexttokens':
    case 'max_context_tokens':
      return String(ctx.maxContextTokens ?? 4096);
    case 'maxresponsetokens':
    case 'max_response_tokens':
      return String(ctx.maxResponseTokens ?? 512);
    case 'ismobile':
    case 'is_mobile':
      return 'true';
    case 'lastgenerationtype':
    case 'last_generation_type':
      return ctx.lastGenerationType || 'normal';
    case 'mes_count':
    case 'message_count':
      return String(ctx.messageCount ?? ctx.messages?.length ?? 0);
    case 'turn_count':
      return String(
        ctx.turnCount ?? Math.ceil((ctx.messages?.length ?? 0) / 2),
      );
    case 'lastmessageid':
      return String(
        ctx.lastMessageId ?? Math.max(0, (ctx.messages?.length ?? 1) - 1),
      );
    case 'firstincludedmessageid':
    case 'firstdisplayedmessageid':
      return String(ctx.firstIncludedMessageId ?? 0);
    case 'allchatrange':
      return `0-${ctx.lastMessageId ?? Math.max(0, (ctx.messages?.length ?? 1) - 1)}`;
    case 'lastswipeid':
    case 'currentswipeid':
      return '1';
    case 'time':
      return now.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'});
    case 'time_utc':
      return now.toISOString().slice(11, 16) + ' UTC';
    case 'date':
      return now.toLocaleDateString();
    case 'weekday':
      return now.toLocaleDateString([], {weekday: 'long'});
    case 'isotime':
      return now.toISOString().slice(11, 19);
    case 'isodate':
      return now.toISOString().slice(0, 10);
    case 'idleduration':
    case 'idle_duration':
      return '0m';
    case 'newline':
      return '\n';
    case 'space':
      return ' ';
    case 'noop':
    case 'empty':
      return '';
    case 'trim':
      return '{{trim}}';
    default: {
      if (ctx.experimentalMacroEngine !== false) {
        if (Object.prototype.hasOwnProperty.call(stRuntimeVariables, body)) {
          return stRuntimeVariables[body];
        }
        if (Object.prototype.hasOwnProperty.call(stGlobalVariables, body)) {
          return stGlobalVariables[body];
        }
      }
      return `{{${rawBody}}}`;
    }
  }
}

/**
 * Evaluates a conditional expression for `{{if ...}}` / `{{#if ...}}`
 * Supports `!` inversion, `.var` / `$var` shorthands, macro names (`description`, `personality`),
 * and nested evaluated strings.
 */
function evaluateMacroCondition(rawCond: string, ctx: STMacroContext): boolean {
  let condStr = rawCond.trim();
  let invert = false;
  while (condStr.startsWith('!')) {
    invert = !invert;
    condStr = condStr.slice(1).trim();
  }

  // Expand any inner `{{...}}` first
  if (condStr.includes('{{')) {
    condStr = expandMacrosLeftToRight(condStr, ctx, 1).trim();
  }

  let resolved = condStr;
  if (condStr.startsWith('.') || condStr.startsWith('$')) {
    const shorthand = evaluateVariableShorthand(condStr);
    if (shorthand !== null) {
      resolved = shorthand;
    }
  } else {
    const macroTry = expandSingleInnermostMacro(condStr, ctx);
    if (macroTry !== `{{${condStr}}}`) {
      resolved = macroTry;
    } else if (Object.prototype.hasOwnProperty.call(stRuntimeVariables, condStr)) {
      resolved = stRuntimeVariables[condStr];
    } else if (Object.prototype.hasOwnProperty.call(stGlobalVariables, condStr)) {
      resolved = stGlobalVariables[condStr];
    }
  }

  const truthy = isMacroTruthy(resolved);
  return invert ? !truthy : truthy;
}

function evaluateDiceRoll(formula: string): string {
  const m = formula.trim().match(/^(?:(\d+)?d)?(\d+)([+-]\d+)?$/i);
  if (!m) {
    return '1';
  }
  const count = Math.min(100, Math.max(1, parseInt(m[1] || '1', 10)));
  const sides = Math.max(1, parseInt(m[2], 10));
  const mod = m[3] ? parseInt(m[3], 10) : 0;
  let total = mod;
  for (let i = 0; i < count; i++) {
    total += Math.floor(Math.random() * sides) + 1;
  }
  return String(total);
}

/**
 * Resolves a single balanced `{{...}}` expression by recursively expanding any
 * nested `{{...}}` inside it first (left-to-right, inside-out per expression).
 */
function evaluateBalancedMacro(
  innerContent: string,
  ctx: STMacroContext,
  depth = 0,
): string {
  if (depth > 16) {
    return `{{${innerContent}}}`;
  }
  const resolvedInner =
    ctx.experimentalMacroEngine === false && depth > 0
      ? innerContent
      : expandMacrosLeftToRight(innerContent, ctx, depth + 1);

  if (resolvedInner.trim().toLowerCase() === 'trim') {
    return '{{trim}}';
  }
  return expandSingleInnermostMacro(resolvedInner, ctx);
}

/**
 * Resolves both Official SillyTavern Scoped Macros (`{{if cond}}...{{else}}...{{/if}}`,
 * `{{setvar x}}...{{/setvar}}`, `{{#setvar x}}...{{/setvar}}`, `{{reverse}}...{{/reverse}}`,
 * `{{//}}...{{///}}`) and Handlebars-style `{{#if cond}}...{{else}}...{{/if}}`.
 */
function resolveScopedBlocks(input: string, ctx: STMacroContext): string {
  let text = input;
  let guard = 0;

  // 1. Scoped multiline comments `{{ // }} ... {{ /// }}`
  text = text.replace(/\{\{\s*\/\/\s*\}\}[\s\S]*?\{\{\s*\/\/\/\s*\}\}/g, '');

  while (guard < 24) {
    guard++;
    // Match `{{ [#]? (if|unless|setvar|setglobalvar|addvar|addglobalvar|reverse|uppercase|lowercase|trim) ... }}`
    // that has a matching closing tag `{{ / macroName }}`
    const openRegex =
      /\{\{\s*(#)?\s*(if|unless|setvar|setglobalvar|addvar|addglobalvar|reverse|uppercase|lowercase|trim)(?:\s+((?:\{\{[^{}]*\}\}|[^{}])*?)|\s*::\s*((?:\{\{[^{}]*\}\}|[^{}])*?))?\s*\}\}/gi;
    let matchedAny = false;
    let match: RegExpExecArray | null;

    while ((match = openRegex.exec(text)) !== null) {
      const preserveWhitespace = Boolean(match[1]);
      const macroName = match[2].toLowerCase();
      const rawArg = (match[3] ?? match[4] ?? '').trim();

      // For setvar/getvar without scoped closing tag (e.g. `{{setvar::a::b}}`), skip if rawArg already has `::`
      if (
        (macroName === 'setvar' ||
          macroName === 'setglobalvar' ||
          macroName === 'addvar' ||
          macroName === 'addglobalvar') &&
        rawArg.includes('::')
      ) {
        continue;
      }

      const openStart = match.index;
      const openEnd = openStart + match[0].length;
      const closeRegex = new RegExp(
        `\\{\\{\\s*\\/\\s*${macroName}\\s*\\}\\}`,
        'i',
      );
      const restText = text.slice(openEnd);
      const closeMatch = closeRegex.exec(restText);
      if (!closeMatch) {
        continue;
      }

      // Ensure there isn't another nested opening of the same macroName inside `restText.slice(0, closeMatch.index)`
      // so we always resolve innermost scoped blocks first!
      const innerSlice = restText.slice(0, closeMatch.index);
      const nestedSameOpen = new RegExp(
        `\\{\\{\\s*#?\\s*${macroName}(?:\\s+|\\s*::|\\s*\\}\\})`,
        'i',
      );
      if (nestedSameOpen.test(innerSlice)) {
        continue;
      }

      const closeEnd = openEnd + closeMatch.index + closeMatch[0].length;
      const scopedBody = preserveWhitespace
        ? innerSlice
        : trimAndDedentScopedContent(innerSlice);

      let replacement = '';
      if (macroName === 'if' || macroName === 'unless') {
        const elseMatch = /\s*\{\{\s*else\s*\}\}\s*/i.exec(innerSlice);
        let thenPart = '';
        let elsePart = '';
        if (elseMatch) {
          const rawThen = innerSlice.slice(0, elseMatch.index);
          const rawElse = innerSlice.slice(
            elseMatch.index + elseMatch[0].length,
          );
          thenPart = preserveWhitespace
            ? rawThen
            : trimAndDedentScopedContent(rawThen);
          elsePart = preserveWhitespace
            ? rawElse
            : trimAndDedentScopedContent(rawElse);
        } else {
          thenPart = scopedBody;
        }
        const condResult = evaluateMacroCondition(rawArg, ctx);
        const takeThen = macroName === 'if' ? condResult : !condResult;
        replacement = takeThen ? thenPart : elsePart;
      } else {
        const expandedBody = expandMacrosLeftToRight(scopedBody, ctx, 1);
        const combined = rawArg
          ? `${macroName}::${rawArg}::${expandedBody}`
          : `${macroName}::${expandedBody}`;
        replacement = expandSingleInnermostMacro(combined, ctx);
      }

      text = text.slice(0, openStart) + replacement + text.slice(closeEnd);
      matchedAny = true;
      break;
    }

    if (!matchedAny) {
      break;
    }
  }

  return text;
}

/**
 * Scans `input` left-to-right for balanced `{{ ... }}` blocks so stateful
 * macros (`setvar`, `addvar`, `incvar`, `getvar`, `.var = ...`) execute in strict reading order
 * while still supporting arbitrarily nested inner `{{ ... }}` macros.
 */
function expandMacrosLeftToRight(
  input: string,
  ctx: STMacroContext,
  depth = 0,
): string {
  if (!input || !input.includes('{{') || depth > 16) {
    return input;
  }

  let text = input;
  if (/\{\{\s*\/\s*[a-zA-Z/]+/i.test(text)) {
    text = resolveScopedBlocks(text, ctx);
  }

  let out = '';
  let i = 0;
  const n = text.length;

  while (i < n) {
    if (text[i] === '{' && i + 1 < n && text[i + 1] === '{') {
      let braceDepth = 1;
      let j = i + 2;
      while (j < n && braceDepth > 0) {
        if (text[j] === '{' && j + 1 < n && text[j + 1] === '{') {
          braceDepth++;
          j += 2;
        } else if (text[j] === '}' && j + 1 < n && text[j + 1] === '}') {
          braceDepth--;
          j += 2;
        } else {
          j++;
        }
      }

      if (braceDepth === 0) {
        const inner = text.slice(i + 2, j - 2);
        out += evaluateBalancedMacro(inner, ctx, depth);
        i = j;
        continue;
      }
    }
    out += text[i];
    i++;
  }

  if (/\{\{\s*\/\s*[a-zA-Z/]+/i.test(out)) {
    out = resolveScopedBlocks(out, ctx);
  }
  return out;
}

const ESCAPED_OPEN_BRACE = '\uE000ST_OPEN_BRACE\uE000';
const ESCAPED_CLOSE_BRACE = '\uE000ST_CLOSE_BRACE\uE000';

/**
 * Expands all SillyTavern & Experimental Macro Engine macros in a template string.
 */
export const expandSillyTavernMacros = (
  template: string,
  ctx: STMacroContext,
): string => {
  if (!template) {
    return '';
  }

  let text = String(template);

  // 1. Protect escaped braces `\{\{` and `\}\}`
  text = text
    .replace(/\\\{\\\{/g, ESCAPED_OPEN_BRACE)
    .replace(/\\\}\\\}/g, ESCAPED_CLOSE_BRACE);

  // 2. Convert legacy angle-bracket markers (<USER>, <BOT>, <CHAR>, <GROUP>, <CHARIFNOTGROUP>)
  text = text
    .replace(/<USER>/gi, '{{user}}')
    .replace(/<BOT>/gi, '{{char}}')
    .replace(/<CHAR>/gi, '{{char}}')
    .replace(/<GROUP>/gi, '{{group}}')
    .replace(/<CHARIFNOTGROUP>/gi, '{{charIfNotGroup}}');

  // 3. Strip single-tag comments `{{// ...}}` and `{{/+ ...}}`
  text = text.replace(/\{\{\/\/(?![\s\S]*?\{\{\/\/\/\}\})[\s\S]*?\}\}/g, '');
  text = text.replace(/\{\{\/\+[\s\S]*?\}\}/g, '');

  // 4. Expand scoped blocks & balanced macros left-to-right
  text = expandMacrosLeftToRight(text, ctx, 0);

  // 5. Trim macro `{{trim}}`
  if (text.toLowerCase().includes('{{trim}}')) {
    text = text.replace(/[ \t\r\n]*\{\{trim\}\}[ \t\r\n]*/gi, '');
  }

  // 6. Restore escaped literal braces
  text = text
    .replace(new RegExp(ESCAPED_OPEN_BRACE, 'g'), '{{')
    .replace(new RegExp(ESCAPED_CLOSE_BRACE, 'g'), '}}');

  return text;
};

/**
 * Alias for Experimental Macro Engine callers
 */
export const expandExperimentalMacros = (
  template: string,
  ctx: STMacroContext,
): string =>
  expandSillyTavernMacros(template, {
    ...ctx,
    experimentalMacroEngine: true,
  });

export interface WorldInfoScanResult {
  before: string[];
  after: string[];
  anTop: string[];
  anBottom: string[];
  emTop: string[];
  emBottom: string[];
  atDepth: Array<{
    content: string;
    depth: number;
    role: 'system' | 'user' | 'assistant';
  }>;
  outlets: Record<string, string>;
}

/**
 * Scan chat context for World Info / Lorebook keyword matches.
 * Supports all 8 SillyTavern `world_info_position` enum slots (0..7),
 * both embedded `character_book` (array) and standalone lorebook (`entries` object keyed by uid),
 * regex keys (`/pattern/flags`), case sensitivity, whole words, probability, and multi-pass recursion.
 */
export const evaluateWorldInfoEntries = (
  book: CharacterBook | undefined,
  chatText: string,
  preset: SillyTavernPreset,
  ctx: STMacroContext,
): WorldInfoScanResult => {
  const emptyResult: WorldInfoScanResult = {
    before: [],
    after: [],
    anTop: [],
    anBottom: [],
    emTop: [],
    emBottom: [],
    atDepth: [],
    outlets: {},
  };

  if (!book || !book.entries) {
    return emptyResult;
  }

  const rawEntries: any[] = Array.isArray(book.entries)
    ? book.entries
    : Object.values(book.entries as Record<string, any>);

  if (rawEntries.length === 0) {
    return emptyResult;
  }

  const triggeredEntries = new Map<any, any>();
  let scanContext = chatText;

  const matchKeyAgainstText = (
    rawKey: string,
    haystack: string,
    caseSensitive: boolean,
    matchWholeWords: boolean,
  ): boolean => {
    const k = String(rawKey || '').trim();
    if (!k) {
      return false;
    }
    // Check if key is a regex literal `/pattern/flags`
    const regexMatch = k.match(/^\/(.+)\/([gimsuy]*)$/);
    if (regexMatch) {
      try {
        const flags = regexMatch[2] || (caseSensitive ? '' : 'i');
        return new RegExp(regexMatch[1], flags).test(haystack);
      } catch {
        return false;
      }
    }
    const targetHaystack = caseSensitive ? haystack : haystack.toLowerCase();
    const targetNeedle = caseSensitive ? k : k.toLowerCase();
    if (matchWholeWords) {
      const escaped = targetNeedle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      try {
        return new RegExp(`\\b${escaped}\\b`, caseSensitive ? '' : 'i').test(
          haystack,
        );
      } catch {
        return targetHaystack.includes(targetNeedle);
      }
    }
    return targetHaystack.includes(targetNeedle);
  };

  // Multi-pass recursive scanning (up to 3 passes so triggered lore can trigger further lore)
  for (let pass = 0; pass < 3; pass++) {
    let newTriggeredInPass = 0;

    for (const entry of rawEntries) {
      if (
        entry.enabled === false ||
        entry.disable === true ||
        triggeredEntries.has(entry)
      ) {
        continue;
      }

      if (pass === 0 && entry.delayUntilRecursion) {
        continue;
      }
      if (pass > 0 && entry.excludeRecursion) {
        continue;
      }

      // Probability gate
      const useProb = entry.useProbability ?? entry.use_probability ?? false;
      const prob = entry.probability ?? 100;
      if (useProb && prob < 100 && Math.random() * 100 > prob) {
        continue;
      }

      const caseSensitive = Boolean(
        entry.caseSensitive ?? entry.case_sensitive ?? false,
      );
      const matchWholeWords = Boolean(
        entry.matchWholeWords ?? entry.match_whole_words ?? false,
      );

      let isMatch = Boolean(entry.constant);
      const primaryKeys: string[] = entry.keys || entry.key || [];
      const secondaryKeys: string[] =
        entry.secondary_keys || entry.keysecondary || [];

      if (!isMatch && primaryKeys.length > 0) {
        isMatch = primaryKeys.some(k =>
          matchKeyAgainstText(k, scanContext, caseSensitive, matchWholeWords),
        );
      }

      // Secondary keys & selective logic (0=AND_ANY, 1=NOT_ALL, 2=NOT_ANY, 3=AND_ALL)
      const isSelective = entry.selective ?? secondaryKeys.length > 0;
      if (isMatch && isSelective && secondaryKeys.length > 0) {
        const secMatches = secondaryKeys.filter(k =>
          matchKeyAgainstText(k, scanContext, caseSensitive, matchWholeWords),
        );
        const logic =
          entry.selectiveLogic ?? entry.selective_logic ?? 'AND_ANY';
        if (logic === 0 || logic === 'AND_ANY') {
          isMatch = secMatches.length > 0;
        } else if (logic === 1 || logic === 'NOT_ANY') {
          isMatch = secMatches.length === 0;
        } else if (logic === 2 || logic === 'NOT_ALL') {
          isMatch = secMatches.length < secondaryKeys.length;
        } else if (logic === 3 || logic === 'AND_ALL') {
          isMatch = secMatches.length === secondaryKeys.length;
        }
      }

      if (isMatch && entry.content) {
        triggeredEntries.set(entry, entry);
        if (!entry.preventRecursion) {
          scanContext += '\n' + entry.content;
        }
        newTriggeredInPass++;
      }
    }

    if (newTriggeredInPass === 0) {
      break;
    }
  }

  // Sort by insertion order (lower order = earlier in the merged block per ST spec)
  const sorted = Array.from(triggeredEntries.values()).sort(
    (a, b) =>
      (a.insertion_order ?? a.order ?? 100) -
      (b.insertion_order ?? b.order ?? 100),
  );

  for (const entry of sorted) {
    const primaryKeys: string[] = entry.keys || entry.key || [];
    const label =
      entry.comment || entry.name || primaryKeys[0] || 'Lore';
    const expandedContent = expandSillyTavernMacros(entry.content, ctx);
    const formatted = (preset.wi_format || '{1}')
      .replace('{0}', label)
      .replace('{1}', expandedContent);

    const pos = entry.position ?? entry.extensions?.position ?? 0;
    const outletName =
      entry.outletName || entry.outlet || entry.extensions?.outlet;

    if (pos === 7 || pos === 'outlet' || outletName) {
      const targetOutlet = outletName || label;
      emptyResult.outlets[targetOutlet] = emptyResult.outlets[targetOutlet]
        ? `${emptyResult.outlets[targetOutlet]}\n${formatted}`
        : formatted;
    } else if (pos === 2 || pos === 'ANTop') {
      emptyResult.anTop.push(formatted);
    } else if (pos === 3 || pos === 'ANBottom') {
      emptyResult.anBottom.push(formatted);
    } else if (pos === 4 || pos === 'atDepth') {
      const roleMap: Record<number, 'system' | 'user' | 'assistant'> = {
        0: 'system',
        1: 'user',
        2: 'assistant',
      };
      const entryRole =
        typeof entry.role === 'string'
          ? (entry.role as 'system' | 'user' | 'assistant')
          : roleMap[entry.role ?? 0] || 'system';
      emptyResult.atDepth.push({
        content: formatted,
        depth: entry.depth ?? entry.extensions?.depth ?? 4,
        role: entryRole,
      });
    } else if (pos === 5 || pos === 'EMTop') {
      emptyResult.emTop.push(formatted);
    } else if (pos === 6 || pos === 'EMBottom') {
      emptyResult.emBottom.push(formatted);
    } else if (pos === 1 || pos === 'after_char') {
      emptyResult.after.push(formatted);
    } else {
      emptyResult.before.push(formatted);
    }
  }

  return emptyResult;
};

/**
 * Apply SillyTavern Regex Scripts to text.
 * Supports both `/pattern/flags` syntax and plain regex strings, plus macro expansion in replace_string.
 */
export interface RegexExecutionOptions extends Partial<STMacroContext> {
  placement?: number;
  depth?: number;
  isMarkdownRender?: boolean;
  isPrompt?: boolean;
}

const escapeRegexLiteral = (str: string): string =>
  str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export const applySillyTavernRegexScripts = (
  text: string,
  scripts: Array<RegexScript | any> | undefined,
  options?: RegexExecutionOptions,
): string => {
  if (!text || !scripts || !Array.isArray(scripts) || scripts.length === 0) {
    return text;
  }

  let result = text;
  const isDisplay = Boolean(options?.isMarkdownRender);
  const isPrompt = Boolean(options?.isPrompt);
  const placement = options?.placement;
  const depth = options?.depth;

  for (const s of scripts) {
    if (!s || s.disabled === true || s.enabled === false) {
      continue;
    }
    if (s.markdownOnly && isPrompt && !isDisplay) {
      continue;
    }
    if (s.promptOnly && isDisplay && !isPrompt) {
      continue;
    }
    if (
      placement !== undefined &&
      Array.isArray(s.placement) &&
      s.placement.length > 0 &&
      !s.placement.includes(placement)
    ) {
      continue;
    }
    if (depth !== undefined) {
      if (typeof s.minDepth === "number" && s.minDepth >= 0 && depth < s.minDepth) {
        continue;
      }
      if (typeof s.maxDepth === "number" && s.maxDepth >= 0 && depth > s.maxDepth) {
        continue;
      }
    }

    const rawFind = String(s.findRegex ?? s.find_regex ?? "");
    if (!rawFind) {
      continue;
    }

    try {
      let pattern = rawFind;
      let flags = "gms";
      const slashMatch = pattern.match(/^\/([\s\S]+)\/([gimsuy]*)$/);
      if (slashMatch) {
        pattern = slashMatch[1];
        flags = slashMatch[2] || "g";
        if (!flags.includes("g")) {
          flags += "g";
        }
      }

      if (pattern.includes("{{") && options) {
        const subMode = s.substituteRegex ?? 1;
        if (subMode === 2) {
          pattern = pattern.replace(/\{\{([^{}]+)\}\}/g, (_m, inner) => {
            const expanded = expandSillyTavernMacros("{{" + inner + "}}", options as STMacroContext);
            return escapeRegexLiteral(expanded);
          });
        } else if (subMode === 1) {
          pattern = expandSillyTavernMacros(pattern, options as STMacroContext);
        }
      }

      const regex = new RegExp(pattern, flags);
      const rawReplace =
        s.action === "exclude"
          ? ""
          : String(s.replaceString ?? s.replace_string ?? "");

      const trimList: string[] = Array.isArray(s.trimStrings)
        ? s.trimStrings
        : Array.isArray(s.trim_strings)
        ? s.trim_strings
        : typeof s.trimStrings === "string" && s.trimStrings.trim()
        ? s.trimStrings.split("\n").filter(Boolean)
        : [];

      const applyTrimStrings = (val: string): string => {
        if (!val || trimList.length === 0) {
          return val;
        }
        let out = val;
        for (const tStr of trimList) {
          if (tStr) {
            out = out.split(tStr).join("");
          }
        }
        return out;
      };

      result = result.replace(regex, (...args: any[]) => {
        const fullMatch = applyTrimStrings(String(args[0] ?? ""));
        const lastArg = args[args.length - 1];
        const namedGroups =
          lastArg && typeof lastArg === "object" && !Array.isArray(lastArg)
            ? (lastArg as Record<string, any>)
            : undefined;
        const offsetIndex = namedGroups ? args.length - 3 : args.length - 2;
        const capGroups: string[] = [];
        for (let i = 1; i < offsetIndex; i++) {
          capGroups.push(
            args[i] !== undefined && args[i] !== null
              ? applyTrimStrings(String(args[i]))
              : "",
          );
        }

        let rep = rawReplace
          .replace(/\\n/g, "\n")
          .replace(/\\t/g, "\t")
          .replace(/\{\{\s*match\s*\}\}/gi, fullMatch)
          .replace(/\$&/g, fullMatch);

        if (namedGroups) {
          rep = rep.replace(/\$<([a-zA-Z0-9_]+)>/g, (_m, gName) =>
            namedGroups[gName] !== undefined && namedGroups[gName] !== null
              ? applyTrimStrings(String(namedGroups[gName]))
              : "",
          );
        }

        rep = rep.replace(/\$(\d{1,2})/g, (_m, digits) => {
          const idx = parseInt(digits, 10) - 1;
          return idx >= 0 && idx < capGroups.length ? capGroups[idx] : "";
        });

        if (rep.includes("{{") && options) {
          rep = expandSillyTavernMacros(rep, options as STMacroContext);
        }

        return rep;
      });
    } catch {
      // ignore invalid regex
    }
  }
  return result;
};

/**
 * Selects the best prompt_order array from a SillyTavern preset.
 * Exported ST presets often have `character_id: 100000` (empty) and `character_id: 100001` (populated).
 */
export function resolvePresetPromptOrder(preset: SillyTavernPreset) {
  if (Array.isArray(preset.prompt_order) && preset.prompt_order.length > 0) {
    // Prefer character_id 100001 or the group with the highest number of entries
    const by100001 = preset.prompt_order.find(
      g => Number(g.character_id) === 100001 && g.order && g.order.length > 0,
    );
    if (by100001) {
      return by100001.order;
    }
    const sortedGroups = [...preset.prompt_order]
      .filter(g => Array.isArray(g.order) && g.order.length > 0)
      .sort((a, b) => b.order.length - a.order.length);
    if (sortedGroups.length > 0) {
      return sortedGroups[0].order;
    }
  }
  return (preset.prompts || []).map(p => ({
    identifier: p.identifier,
    enabled: p.enabled ?? true,
  }));
}

/**
 * Prompt Manager: Assembles final prompt messages from SillyTavern preset blocks,
 * card override contract (`{{original}}` / `forbid_overrides`), World Info positions 0..7,
 * in-chat depth injections, Author's Note, Group Chat prompts, and message history.
 */
export const buildSillyTavernMessages = (params: {
  preset: SillyTavernPreset;
  rawMessages: Array<{
    role: 'system' | 'user' | 'assistant';
    text: string;
    name?: string;
  }>;
  charName: string;
  userName?: string;
  userPersona?: string;
  description?: string;
  personality?: string;
  scenario?: string;
  mesExamples?: string;
  originalSystemPrompt?: string;
  charPrompt?: string;
  charInstruction?: string;
  charCreatorNotes?: string;
  charVersion?: string;
  charFirstMessage?: string;
  alternateGreetings?: string[];
  groupMembers?: string[];
  groupMutedMembers?: string[];
  isGroupChat?: boolean;
  characterBook?: CharacterBook;
  depthPrompt?: {prompt: string; depth: number; role?: string};
  experimentalMacroEngine?: boolean;
}): Array<{role: 'system' | 'user' | 'assistant'; content: string}> => {
  const {
    preset,
    rawMessages,
    charName,
    userName = 'User',
    userPersona = '',
    description = '',
    personality = '',
    scenario = '',
    mesExamples = '',
    originalSystemPrompt = '',
    charPrompt = '',
    charInstruction = '',
    charCreatorNotes = '',
    charVersion = '1.0',
    charFirstMessage = '',
    alternateGreetings = [],
    groupMembers = [],
    groupMutedMembers = [],
    isGroupChat = false,
    characterBook,
    depthPrompt,
    experimentalMacroEngine = true,
  } = params;

  const userMsgs = rawMessages.filter(m => m.role === 'user');
  const charMsgs = rawMessages.filter(m => m.role === 'assistant');

  const mCtx: STMacroContext = {
    charName,
    userName,
    userPersona,
    description,
    personality,
    scenario,
    mesExamples,
    mesExamplesRaw: mesExamples,
    original: originalSystemPrompt,
    charPrompt: charPrompt || originalSystemPrompt,
    charInstruction,
    charCreatorNotes,
    charVersion,
    charFirstMessage,
    alternateGreetings,
    groupMembers,
    groupMutedMembers,
    isGroupChat,
    authorsNote: preset.authors_note || '',
    charDepthPrompt: depthPrompt?.prompt || '',
    lastChatMessage: rawMessages[rawMessages.length - 1]?.text || '',
    lastUserMessage: userMsgs[userMsgs.length - 1]?.text || '',
    lastCharMessage: charMsgs[charMsgs.length - 1]?.text || '',
    messageCount: rawMessages.length,
    turnCount: Math.ceil(rawMessages.length / 2),
    lastMessageId: Math.max(0, rawMessages.length - 1),
    firstIncludedMessageId: 0,
    messages: rawMessages,
    experimentalMacroEngine,
  };

  const chatText = [
    description,
    personality,
    scenario,
    ...rawMessages.slice(-10).map(m => m.text),
  ]
    .filter(Boolean)
    .join('\n');
  const wi = evaluateWorldInfoEntries(characterBook, chatText, preset, mCtx);
  mCtx.outlets = wi.outlets;

  const beforeHistory: Array<{
    role: 'system' | 'user' | 'assistant';
    content: string;
  }> = [];
  const afterHistory: Array<{
    role: 'system' | 'user' | 'assistant';
    content: string;
  }> = [];
  const depthInjections: Array<{
    role: 'system' | 'user' | 'assistant';
    content: string;
    depth: number;
  }> = [];

  let seenHistoryMarker = false;
  const promptOrder = resolvePresetPromptOrder(preset);

  promptOrder.forEach(orderItem => {
    if (!orderItem.enabled) {
      return;
    }
    const item = preset.prompts.find(
      p => p.identifier === orderItem.identifier,
    );
    if (!item) {
      return;
    }

    if (item.identifier === 'chatHistory') {
      seenHistoryMarker = true;
      return;
    }

    let content = '';
    const role: 'system' | 'user' | 'assistant' = item.role || 'system';

    if (item.marker) {
      switch (item.identifier) {
        case 'worldInfoBefore':
          content = wi.before.join('\n');
          break;
        case 'worldInfoAfter':
          content = wi.after.join('\n');
          break;
        case 'personaDescription':
          if (userPersona) {
            content = `[${userName}'s Persona: ${expandSillyTavernMacros(
              userPersona,
              mCtx,
            )}]`;
          }
          break;
        case 'charDescription':
          if (description) {
            content = expandSillyTavernMacros(description, mCtx);
          }
          break;
        case 'charPersonality':
          if (personality) {
            content = expandSillyTavernMacros(
              preset.personality_format || '{{personality}}',
              mCtx,
            );
          }
          break;
        case 'scenario':
          if (scenario) {
            content = expandSillyTavernMacros(
              preset.scenario_format || '{{scenario}}',
              mCtx,
            );
          }
          break;
        case 'dialogueExamples': {
          const exParts = [
            ...wi.emTop,
            mesExamples ? expandSillyTavernMacros(mesExamples, mCtx) : '',
            ...wi.emBottom,
          ].filter(Boolean);
          content = exParts.join('\n');
          break;
        }
      }
    } else {
      // Official SillyTavern Card Override Contract (`{{original}}` and `forbid_overrides`)
      const allowOverrides = !item.forbid_overrides;
      if (
        item.identifier === 'main' &&
        allowOverrides &&
        preset.prefer_character_prompt !== false &&
        (charPrompt || originalSystemPrompt)
      ) {
        const cardMain = charPrompt || originalSystemPrompt;
        const presetMain = expandSillyTavernMacros(item.content, mCtx);
        if (cardMain.includes('{{original}}')) {
          content = expandSillyTavernMacros(cardMain, {
            ...mCtx,
            original: presetMain,
          });
        } else {
          content = `${presetMain}\n\n${expandSillyTavernMacros(cardMain, mCtx)}`;
        }
      } else if (
        item.identifier === 'jailbreak' &&
        allowOverrides &&
        preset.prefer_character_instructions !== false &&
        charInstruction
      ) {
        const presetPhi = expandSillyTavernMacros(item.content, mCtx);
        if (charInstruction.includes('{{original}}')) {
          content = expandSillyTavernMacros(charInstruction, {
            ...mCtx,
            original: presetPhi,
          });
        } else {
          content = expandSillyTavernMacros(charInstruction, {
            ...mCtx,
            original: presetPhi,
          });
        }
      } else {
        content = expandSillyTavernMacros(item.content, mCtx);
      }
    }

    if (!content || !content.trim()) {
      return;
    }

    if (item.injection_position === 1) {
      depthInjections.push({
        role,
        content: content.trim(),
        depth: item.injection_depth ?? 4,
      });
    } else if (!seenHistoryMarker) {
      beforeHistory.push({role, content: content.trim()});
    } else {
      afterHistory.push({role, content: content.trim()});
    }
  });

  // World Info position 4 (atDepth) injections
  wi.atDepth.forEach(inj => {
    depthInjections.push(inj);
  });

  // Author's Note depth injection (with ANTop & ANBottom World Info slots)
  if (preset.authors_note && preset.authors_note.trim()) {
    const anParts = [
      ...wi.anTop,
      expandSillyTavernMacros(preset.authors_note.trim(), mCtx),
      ...wi.anBottom,
    ].filter(Boolean);
    depthInjections.push({
      role: preset.authors_note_role || 'system',
      content: anParts.join('\n'),
      depth: preset.authors_note_depth ?? 4,
    });
  }

  // Character Card Depth Prompt (`data.extensions.depth_prompt`)
  if (depthPrompt && depthPrompt.prompt && depthPrompt.prompt.trim()) {
    depthInjections.push({
      role: (depthPrompt.role as any) || 'system',
      content: expandSillyTavernMacros(depthPrompt.prompt.trim(), mCtx),
      depth: depthPrompt.depth ?? 4,
    });
  }

  // Build message history (applying regex scripts if present)
  const history: Array<{
    role: 'system' | 'user' | 'assistant';
    content: string;
  }> = rawMessages.map(m => {
    let msgText = expandSillyTavernMacros(m.text, mCtx);
    if (preset.regex_scripts && preset.regex_scripts.length > 0) {
      msgText = applySillyTavernRegexScripts(msgText, preset.regex_scripts, mCtx);
    }
    if (isGroupChat && m.name && m.role === 'assistant') {
      msgText = `${m.name}: ${msgText}`;
    }
    return {
      role: m.role,
      content: msgText,
    };
  });

  // Splice in depth injections from bottom of history
  depthInjections.forEach(inj => {
    const insertIdx = Math.max(0, history.length - inj.depth);
    history.splice(insertIdx, 0, {
      role: inj.role,
      content: inj.content,
    });
  });

  const finalMessages: Array<{
    role: 'system' | 'user' | 'assistant';
    content: string;
  }> = [];

  beforeHistory.forEach(m => finalMessages.push(m));
  const startChatPrompt = isGroupChat
    ? preset.new_group_chat_prompt || preset.new_chat_prompt
    : preset.new_chat_prompt;
  if (startChatPrompt && history.length > 0) {
    finalMessages.push({
      role: 'system',
      content: expandSillyTavernMacros(startChatPrompt, mCtx),
    });
  }
  history.forEach(m => finalMessages.push(m));
  afterHistory.forEach(m => finalMessages.push(m));

  // Group nudge prompt at the end for group chats
  if (isGroupChat && preset.group_nudge_prompt) {
    finalMessages.push({
      role: 'system',
      content: expandSillyTavernMacros(preset.group_nudge_prompt, mCtx),
    });
  }

  return finalMessages;
};

/**
 * Maps SillyTavern sampler settings to CompletionParams for local llama.rn or remote API
 */
export const applySillyTavernSamplersToCompletionParams = (
  preset: SillyTavernPreset,
  baseParams: CompletionParams,
): CompletionParams => {
  return {
    ...baseParams,
    temperature: preset.temperature ?? baseParams.temperature,
    top_p: preset.top_p ?? baseParams.top_p,
    top_k: preset.top_k ?? baseParams.top_k,
    min_p: preset.min_p ?? baseParams.min_p,
    tfs: preset.tfs ?? baseParams.tfs,
    typical_p: preset.typical_p ?? baseParams.typical_p,
    penalty_repeat: preset.repetition_penalty ?? baseParams.penalty_repeat,
    penalty_freq: preset.frequency_penalty ?? baseParams.penalty_freq,
    penalty_present: preset.presence_penalty ?? baseParams.penalty_present,
    n_predict: preset.max_tokens ?? baseParams.n_predict,
    stop: preset.custom_stopping_strings || baseParams.stop,
    logit_bias: preset.logit_bias || baseParams.logit_bias,
  };
};
