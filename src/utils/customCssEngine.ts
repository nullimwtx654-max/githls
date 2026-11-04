/**
 * Custom CSS Parser & Live Style Engine for PocketPal AI
 * Parses standard SillyTavern / Tavo / Web CSS rules into:
 * 1. React Native ViewStyle & TextStyle overrides for `.mes`, `.user_mes`, `.char_mes`,
 *    `.greeting_mes`, `.mes_text`, `.chat_header`, `.chat_input`, `.chat_container`
 * 2. `react-native-render-html` `tagsStyles` overrides for `body`, `p`, `em`, `i`,
 *    `strong`, `b`, `q`, `blockquote`, `code`, `pre`, `a`, `h1`, `h2`, `h3`
 * 3. Supports `:root` CSS variables (`var(--SmartThemeEmColor)`), `px`/`rem`/`em` units,
 *    shorthand `padding`, `margin`, `border`, `border-radius`, `box-shadow`, and `rgba()`.
 */

import {ViewStyle, TextStyle} from 'react-native';

export interface ParsedCustomCssStyles {
  variables: Record<string, string>;
  bubbleCommon: ViewStyle;
  userBubble: ViewStyle;
  aiBubble: ViewStyle;
  greetingBubble: ViewStyle;
  messageText: TextStyle;
  userText: TextStyle;
  aiText: TextStyle;
  chatHeader: ViewStyle;
  chatInput: ViewStyle;
  chatContainer: ViewStyle;
  tagsStyles: Record<string, Record<string, any>>;
}

export const BUILT_IN_CUSTOM_CSS_PRESETS: Array<{
  id: string;
  name: string;
  description: string;
  css: string;
}> = [
  {
    id: 'st-roleplay-accents',
    name: 'SillyTavern Dialogue & Action Tint',
    description:
      'Colors italicized actions (*...*) in soft lavender and bold dialogue in crisp high-contrast tones.',
    css: `:root {
  --SmartThemeEmColor: #A78BFA;
  --SmartThemeQuoteColor: #38BDF8;
}
.mes {
  border-radius: 18px;
}
em, i {
  color: var(--SmartThemeEmColor);
  font-style: italic;
}
strong, b {
  color: var(--SmartThemeQuoteColor);
  font-weight: 700;
}
blockquote {
  border-left: 3px solid var(--SmartThemeEmColor);
  padding-left: 10px;
}`,
  },
  {
    id: 'minimal-editorial',
    name: 'Editorial Monochrome Serif',
    description:
      'Refined spacing, subtle hairline borders, and warm editorial typography.',
    css: `.mes {
  border-radius: 14px;
  border: 1px solid rgba(161, 161, 170, 0.22);
}
.mes_text {
  font-size: 15px;
  line-height: 23px;
  letter-spacing: 0.2px;
}
em, i {
  color: #D4D4D8;
}`,
  },
  {
    id: 'cyber-frost',
    name: 'Cyber Frost Glass',
    description:
      'Translucent obsidian bubbles with cyan edge highlights and glowing code blocks.',
    css: `:root {
  --accent-cyan: #22D3EE;
}
.char_mes {
  background-color: rgba(15, 23, 42, 0.72);
  border: 1px solid rgba(34, 211, 238, 0.35);
  border-radius: 16px;
}
.user_mes {
  background-color: rgba(30, 41, 59, 0.82);
  border: 1px solid rgba(148, 163, 184, 0.28);
  border-radius: 16px;
}
em, i {
  color: var(--accent-cyan);
}`,
  },
];

function parseNumericPx(rawVal: string, baseFontSize = 15): number | undefined {
  const v = rawVal.trim().toLowerCase();
  if (!v) {
    return undefined;
  }
  if (v.endsWith('rem')) {
    const n = parseFloat(v);
    return Number.isFinite(n) ? Math.round(n * 16) : undefined;
  }
  if (v.endsWith('em')) {
    const n = parseFloat(v);
    return Number.isFinite(n) ? Math.round(n * baseFontSize) : undefined;
  }
  if (v.endsWith('px')) {
    const n = parseFloat(v);
    return Number.isFinite(n) ? n : undefined;
  }
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : undefined;
}

function resolveCssVariables(
  val: string,
  vars: Record<string, string>,
): string {
  return val
    .replace(/!important/gi, '')
    .replace(/var\(\s*(--[a-zA-Z0-9_-]+)\s*(?:,\s*([^)]+))?\)/g, (_, name, fallback) => {
      return vars[name.trim()] ?? (fallback ? fallback.trim() : '');
    })
    .trim();
}

function applyDeclarationToTarget(
  prop: string,
  val: string,
  target: Record<string, any>,
) {
  const p = prop.trim().toLowerCase();
  const v = val.trim();
  if (!v) {
    return;
  }

  switch (p) {
    case 'background-color':
    case 'background': {
      // If it's a solid/rgba/hex/hsl color (not a complex url()), apply as backgroundColor
      if (!v.includes('url(') && !v.includes('gradient(')) {
        target.backgroundColor = v;
      } else {
        const rgbaMatch = v.match(/rgba?\([^)]+\)|#[0-9a-fA-F]{3,8}/);
        if (rgbaMatch) {
          target.backgroundColor = rgbaMatch[0];
        }
      }
      break;
    }
    case 'color':
      target.color = v;
      break;
    case 'font-size': {
      const n = parseNumericPx(v);
      if (n !== undefined) {
        target.fontSize = Math.max(9, Math.min(36, n));
      }
      break;
    }
    case 'line-height': {
      const n = parseNumericPx(v);
      if (n !== undefined) {
        target.lineHeight = n < 4 ? Math.round(n * (target.fontSize || 15)) : n;
      }
      break;
    }
    case 'letter-spacing': {
      const n = parseNumericPx(v);
      if (n !== undefined) {
        target.letterSpacing = n;
      }
      break;
    }
    case 'font-weight':
      target.fontWeight = v as any;
      break;
    case 'font-style':
      if (v === 'italic' || v === 'normal') {
        target.fontStyle = v;
      }
      break;
    case 'text-align':
      if (['left', 'right', 'center', 'justify'].includes(v)) {
        target.textAlign = v;
      }
      break;
    case 'text-decoration':
    case 'text-decoration-line':
      if (['none', 'underline', 'line-through'].includes(v)) {
        target.textDecorationLine = v;
      }
      break;
    case 'border-radius': {
      const n = parseNumericPx(v);
      if (n !== undefined) {
        target.borderRadius = Math.max(0, Math.min(40, n));
      }
      break;
    }
    case 'border-width': {
      const n = parseNumericPx(v);
      if (n !== undefined) {
        target.borderWidth = n;
      }
      break;
    }
    case 'border-color':
      target.borderColor = v;
      break;
    case 'border': {
      // e.g. `1px solid rgba(255,255,255,0.2)`
      if (v === 'none' || v === '0') {
        target.borderWidth = 0;
      } else {
        const widthMatch = v.match(/(\d+(?:\.\d+)?)px/);
        const colorMatch = v.match(/rgba?\([^)]+\)|hsla?\([^)]+\)|#[0-9a-fA-F]{3,8}|[a-zA-Z]+$/);
        target.borderWidth = widthMatch ? parseFloat(widthMatch[1]) : 1;
        if (colorMatch && !['solid', 'dashed', 'dotted'].includes(colorMatch[0])) {
          target.borderColor = colorMatch[0];
        }
      }
      break;
    }
    case 'border-left': {
      const widthMatch = v.match(/(\d+(?:\.\d+)?)px/);
      const colorMatch = v.match(/rgba?\([^)]+\)|hsla?\([^)]+\)|#[0-9a-fA-F]{3,8}/);
      target.borderLeftWidth = widthMatch ? parseFloat(widthMatch[1]) : 2;
      if (colorMatch) {
        target.borderLeftColor = colorMatch[0];
      }
      break;
    }
    case 'padding': {
      const parts = v.split(/\s+/).map(s => parseNumericPx(s));
      if (parts.length === 1 && parts[0] !== undefined) {
        target.padding = parts[0];
      } else if (parts.length === 2 && parts[0] !== undefined && parts[1] !== undefined) {
        target.paddingVertical = parts[0];
        target.paddingHorizontal = parts[1];
      }
      break;
    }
    case 'padding-left': {
      const n = parseNumericPx(v);
      if (n !== undefined) {
        target.paddingLeft = n;
      }
      break;
    }
    case 'padding-right': {
      const n = parseNumericPx(v);
      if (n !== undefined) {
        target.paddingRight = n;
      }
      break;
    }
    case 'padding-top': {
      const n = parseNumericPx(v);
      if (n !== undefined) {
        target.paddingTop = n;
      }
      break;
    }
    case 'padding-bottom': {
      const n = parseNumericPx(v);
      if (n !== undefined) {
        target.paddingBottom = n;
      }
      break;
    }
    case 'opacity': {
      const n = parseFloat(v);
      if (Number.isFinite(n)) {
        target.opacity = Math.max(0.05, Math.min(1, n));
      }
      break;
    }
  }
}

let cachedCssInput = '';
let cachedParsedResult: ParsedCustomCssStyles | null = null;

/**
 * Parses a Custom CSS string into cached React Native & RenderHTML style maps.
 */
export function parseCustomCss(cssText: string): ParsedCustomCssStyles {
  if (cssText === cachedCssInput && cachedParsedResult) {
    return cachedParsedResult;
  }

  const result: ParsedCustomCssStyles = {
    variables: {},
    bubbleCommon: {},
    userBubble: {},
    aiBubble: {},
    greetingBubble: {},
    messageText: {},
    userText: {},
    aiText: {},
    chatHeader: {},
    chatInput: {},
    chatContainer: {},
    tagsStyles: {},
  };

  if (!cssText || !cssText.trim()) {
    cachedCssInput = cssText;
    cachedParsedResult = result;
    return result;
  }

  // Strip comments `/* ... */`
  const cleaned = cssText.replace(/\/\*[\s\S]*?\*\//g, '');

  // Extract rule blocks `selector { declarations }`
  const ruleRegex = /([^{}]+)\{([^{}]*)\}/g;
  let match: RegExpExecArray | null;

  const rawRules: Array<{selectors: string[]; body: string}> = [];
  while ((match = ruleRegex.exec(cleaned)) !== null) {
    const selectorGroup = match[1].trim();
    const body = match[2].trim();
    const selectors = selectorGroup
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);
    rawRules.push({selectors, body});

    // First pass: collect `:root` / `*` custom properties `--var: val`
    if (
      selectors.some(
        s => s === ':root' || s === '*' || s === 'html' || s === 'body',
      )
    ) {
      const decls = body.split(';');
      for (const decl of decls) {
        const colonIdx = decl.indexOf(':');
        if (colonIdx === -1) {
          continue;
        }
        const prop = decl.slice(0, colonIdx).trim();
        const val = decl.slice(colonIdx + 1).trim().replace(/!important/gi, '').trim();
        if (prop.startsWith('--') && val) {
          result.variables[prop] = val;
        }
      }
    }
  }

  // Second pass: resolve rules into targets
  const htmlTagNames = new Set([
    'body',
    'p',
    'em',
    'i',
    'strong',
    'b',
    'q',
    'blockquote',
    'code',
    'pre',
    'a',
    'h1',
    'h2',
    'h3',
    'h4',
    'u',
    'del',
    's',
  ]);

  for (const rule of rawRules) {
    const parsedProps: Record<string, any> = {};
    const decls = rule.body.split(';');
    for (const decl of decls) {
      const colonIdx = decl.indexOf(':');
      if (colonIdx === -1) {
        continue;
      }
      const prop = decl.slice(0, colonIdx).trim();
      if (prop.startsWith('--')) {
        continue;
      }
      const rawVal = decl.slice(colonIdx + 1).trim();
      const resolvedVal = resolveCssVariables(rawVal, result.variables);
      applyDeclarationToTarget(prop, resolvedVal, parsedProps);
    }

    if (Object.keys(parsedProps).length === 0) {
      continue;
    }

    for (const rawSel of rule.selectors) {
      const sel = rawSel.toLowerCase().trim();

      if (sel === '.mes' || sel === '.message' || sel === '.bubble') {
        Object.assign(result.bubbleCommon, parsedProps);
      } else if (
        sel === '.user_mes' ||
        sel === '.user-message' ||
        sel.includes('is_user="true"')
      ) {
        Object.assign(result.userBubble, parsedProps);
        if (parsedProps.color || parsedProps.fontSize) {
          Object.assign(result.userText, parsedProps);
        }
      } else if (
        sel === '.char_mes' ||
        sel === '.assistant_mes' ||
        sel === '.ai-message' ||
        sel.includes('is_user="false"')
      ) {
        Object.assign(result.aiBubble, parsedProps);
        if (parsedProps.color || parsedProps.fontSize) {
          Object.assign(result.aiText, parsedProps);
        }
      } else if (sel === '.greeting_mes' || sel === '.greeting-bubble') {
        Object.assign(result.greetingBubble, parsedProps);
      } else if (sel === '.mes_text' || sel === '.mes_block') {
        Object.assign(result.messageText, parsedProps);
        result.tagsStyles.body = {
          ...(result.tagsStyles.body || {}),
          ...parsedProps,
        };
      } else if (
        sel === '.chat_header' ||
        sel === '#top-bar' ||
        sel === '.header'
      ) {
        Object.assign(result.chatHeader, parsedProps);
      } else if (
        sel === '.chat_input' ||
        sel === '#send_form' ||
        sel === '.composer'
      ) {
        Object.assign(result.chatInput, parsedProps);
      } else if (
        sel === '.chat_container' ||
        sel === '#chat' ||
        sel === '.chat'
      ) {
        Object.assign(result.chatContainer, parsedProps);
      } else if (htmlTagNames.has(sel)) {
        result.tagsStyles[sel] = {
          ...(result.tagsStyles[sel] || {}),
          ...parsedProps,
        };
      }
    }
  }

  cachedCssInput = cssText;
  cachedParsedResult = result;
  return result;
}
