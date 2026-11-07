/**
 * Tavo & SillyTavern Unified Export Importer (`tavoImportParser.ts`)
 * Supports importing from:
 * - Real Tavo `.tbk` / `.zip` binary backup archives (ZIP container + `objectbox/data.mdb` FlatBuffers + `CharacterCards/*.png` + `themes/*` + `shared_preferences.json`)
 * - Tavo AI JSON/JSONL exports (`.json`, `.tavo`, `.jsonl`) and unified backups:
 *   1. Characters / Character Cards (`characters`, `cards`, `char`, V1-V4 specs, embedded lorebooks, and `.tbk` `CharacterCards/*.png` avatars)
 *   2. Chat Histories (`chats`, `conversations`, `threads`, `messages`, ObjectBox `Message`/`Conversation` entities, or SillyTavern `.jsonl` lines)
 *   3. API Providers, Endpoints & Keys (`apis`, `api_configs`, `connections`, `profiles`, `apiProviders`, or ObjectBox `Endpoint` entities)
 *   4. Presets & Prompt Manager configs (`presets`, `prompt_presets`, or ObjectBox `Preset` entities with `dbEntries` & `dbBasicPrompts`)
 *   5. Theme & Custom CSS (`theme`, `customCss`, `custom_css`, or ObjectBox `ChatTheme` CSS rules)
 */

import * as RNFS from '@dr.pogodin/react-native-fs';
import {v4 as uuidv4} from 'uuid';
import {chatSessionRepository} from '../repositories/ChatSessionRepository';
import {defaultCompletionSettings} from '../store/ChatSessionStore';
import {base64ToUint8Array, uint8ArrayToBase64} from './characterCardParser';
import {MessageType} from './types';

export interface TavoImportSummary {
  chatsImported: number;
  charactersImported: number;
  apiProvidersImported: number;
  presetsImported: number;
  customCssImported: boolean;
  extractedDetails?: {
    characterNames: string[];
    apiNames: string[];
    presetNames: string[];
    chatTitles: string[];
  };
}

/**
 * Pure-JS UTF-8 decoder (Hermes-safe)
 */
export const decodeUtf8Bytes = (bytes: Uint8Array): string => {
  if (typeof TextDecoder !== 'undefined') {
    try {
      return new TextDecoder('utf-8').decode(bytes);
    } catch {
      // fallback below
    }
  }
  let out = '';
  let i = 0;
  const len = bytes.length;
  while (i < len) {
    const c = bytes[i++];
    if (c < 128) {
      out += String.fromCharCode(c);
    } else if (c > 191 && c < 224 && i < len) {
      const c2 = bytes[i++];
      out += String.fromCharCode(((c & 31) << 6) | (c2 & 63));
    } else if (c > 223 && c < 240 && i + 1 < len) {
      const c2 = bytes[i++];
      const c3 = bytes[i++];
      out += String.fromCharCode(
        ((c & 15) << 12) | ((c2 & 63) << 6) | (c3 & 63),
      );
    } else if (i + 2 < len) {
      const c2 = bytes[i++];
      const c3 = bytes[i++];
      const c4 = bytes[i++];
      const u =
        (((c & 7) << 18) |
          ((c2 & 63) << 12) |
          ((c3 & 63) << 6) |
          (c4 & 63)) -
        0x10000;
      out += String.fromCharCode(0xd800 + (u >> 10), 0xdc00 + (u & 1023));
    }
  }
  return out;
};

/**
 * Pure-JS RFC 1951 Raw DEFLATE Decompressor for `.tbk` / `.zip` archives
 */
export const inflateRawDeflate = (input: Uint8Array): Uint8Array => {
  let pos = 0;
  let bitBuf = 0;
  let bitCnt = 0;
  const out: number[] = [];

  const bits = (n: number): number => {
    while (bitCnt < n) {
      if (pos >= input.length) {
        throw new Error('Unexpected EOF in DEFLATE stream');
      }
      bitBuf |= input[pos++] << bitCnt;
      bitCnt += 8;
    }
    const val = bitBuf & ((1 << n) - 1);
    bitBuf >>>= n;
    bitCnt -= n;
    return val;
  };

  const buildHuffman = (lengths: number[]) => {
    const maxBits = Math.max(...lengths, 1);
    const blCount = new Int32Array(maxBits + 1);
    for (const l of lengths) {
      if (l > 0) {
        blCount[l]++;
      }
    }
    const nextCode = new Int32Array(maxBits + 1);
    let code = 0;
    for (let b = 1; b <= maxBits; b++) {
      code = (code + blCount[b - 1]) << 1;
      nextCode[b] = code;
    }
    const map = new Map<number, number>();
    for (let sym = 0; sym < lengths.length; sym++) {
      const len = lengths[sym];
      if (len > 0) {
        const c = nextCode[len]++;
        map.set((len << 16) | c, sym);
      }
    }
    return {map, maxBits};
  };

  const decodeSym = (tree: {map: Map<number, number>; maxBits: number}): number => {
    let code = 0;
    for (let len = 1; len <= tree.maxBits; len++) {
      code = (code << 1) | bits(1);
      const sym = tree.map.get((len << 16) | code);
      if (sym !== undefined) {
        return sym;
      }
    }
    throw new Error('Invalid Huffman code');
  };

  const fixedLitLengths: number[] = [];
  for (let i = 0; i <= 287; i++) {
    fixedLitLengths.push(i <= 143 ? 8 : i <= 255 ? 9 : i <= 279 ? 7 : 8);
  }
  const fixedDistLengths = new Array(32).fill(5);
  const fixedLitTree = buildHuffman(fixedLitLengths);
  const fixedDistTree = buildHuffman(fixedDistLengths);

  const lenBase = [
    3, 4, 5, 6, 7, 8, 9, 10, 11, 13, 15, 17, 19, 23, 27, 31, 35, 43, 51, 59,
    67, 83, 99, 115, 131, 163, 195, 227, 258,
  ];
  const lenExtra = [
    0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4, 5,
    5, 5, 5, 0,
  ];
  const distBase = [
    1, 2, 3, 4, 5, 7, 9, 13, 17, 25, 33, 49, 65, 97, 129, 193, 257, 385, 513,
    769, 1025, 1537, 2049, 3073, 4097, 6145, 8193, 12289, 16385, 24577,
  ];
  const distExtra = [
    0, 0, 0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 10, 10,
    11, 11, 12, 12, 13, 13,
  ];
  const clOrder = [
    16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15,
  ];

  let bfinal = 0;
  while (!bfinal) {
    bfinal = bits(1);
    const btype = bits(2);
    if (btype === 0) {
      bitBuf = 0;
      bitCnt = 0;
      if (pos + 4 > input.length) {
        throw new Error('EOF in stored block');
      }
      const len = input[pos] | (input[pos + 1] << 8);
      pos += 4;
      for (let i = 0; i < len; i++) {
        out.push(input[pos++]);
      }
    } else if (btype === 1 || btype === 2) {
      let litTree = fixedLitTree;
      let distTree = fixedDistTree;
      if (btype === 2) {
        const hlit = bits(5) + 257;
        const hdist = bits(5) + 1;
        const hclen = bits(4) + 4;
        const clLengths = new Array(19).fill(0);
        for (let i = 0; i < hclen; i++) {
          clLengths[clOrder[i]] = bits(3);
        }
        const clTree = buildHuffman(clLengths);
        const allLengths: number[] = [];
        while (allLengths.length < hlit + hdist) {
          const sym = decodeSym(clTree);
          if (sym < 16) {
            allLengths.push(sym);
          } else if (sym === 16) {
            const prev = allLengths[allLengths.length - 1] || 0;
            const rep = bits(2) + 3;
            for (let r = 0; r < rep; r++) {
              allLengths.push(prev);
            }
          } else if (sym === 17) {
            const rep = bits(3) + 3;
            for (let r = 0; r < rep; r++) {
              allLengths.push(0);
            }
          } else {
            const rep = bits(7) + 11;
            for (let r = 0; r < rep; r++) {
              allLengths.push(0);
            }
          }
        }
        litTree = buildHuffman(allLengths.slice(0, hlit));
        distTree = buildHuffman(allLengths.slice(hlit, hlit + hdist));
      }

      while (true) {
        const sym = decodeSym(litTree);
        if (sym < 256) {
          out.push(sym);
        } else if (sym === 256) {
          break;
        } else {
          const lIdx = sym - 257;
          const length = lenBase[lIdx] + bits(lenExtra[lIdx]);
          const dSym = decodeSym(distTree);
          const dist = distBase[dSym] + bits(distExtra[dSym]);
          const start = out.length - dist;
          for (let i = 0; i < length; i++) {
            out.push(out[start + i]);
          }
        }
      }
    } else {
      throw new Error('Invalid DEFLATE block type');
    }
  }

  return new Uint8Array(out);
};

const readU16LE = (b: Uint8Array, o: number): number => b[o] | (b[o + 1] << 8);
const readI32LE = (b: Uint8Array, o: number): number =>
  b[o] | (b[o + 1] << 8) | (b[o + 2] << 16) | (b[o + 3] << 24);
const readU32LE = (b: Uint8Array, o: number): number => readI32LE(b, o) >>> 0;

export interface ParsedTavoTbkData {
  characters: Array<{
    name: string;
    description: string;
    personality: string;
    scenario: string;
    firstMes: string;
    mesExample: string;
    avatarKey: string;
    avatarPngBytes?: Uint8Array;
    creatorNotes: string;
    systemPrompt: string;
    postHistoryInstructions: string;
    alternateGreetings: string[];
    tags: string[];
    creator: string;
    characterVersion: string;
  }>;
  apis: Array<{
    name: string;
    secret: string;
    model: string;
    platform: string;
    apiUrl: string;
  }>;
  presets: Array<{
    name: string;
    entries: any[];
    basicPrompts: Record<string, any>;
  }>;
  messages: Array<{
    speakerName: string;
    speakerAvatar: string;
    content: string;
  }>;
  customCssList: string[];
  regexEntries: any[];
}

/**
 * Pure-JS parser for Tavo `.tbk` / `.zip` backup archives (`PK\x03\x04` + `objectbox/data.mdb` FlatBuffers)
 */
export function parseTavoTbkArchive(tbkBytes: Uint8Array): ParsedTavoTbkData {
  const result: ParsedTavoTbkData = {
    characters: [],
    apis: [],
    presets: [],
    messages: [],
    customCssList: [],
    regexEntries: [],
  };

  if (
    tbkBytes.length < 22 ||
    tbkBytes[0] !== 0x50 ||
    tbkBytes[1] !== 0x4b
  ) {
    return result;
  }

  // Locate End of Central Directory (EOCD: 0x06054b50)
  let eocdPos = -1;
  const minSearch = Math.max(0, tbkBytes.length - 65557);
  for (let i = tbkBytes.length - 22; i >= minSearch; i--) {
    if (readU32LE(tbkBytes, i) === 0x06054b50) {
      eocdPos = i;
      break;
    }
  }
  if (eocdPos < 0) {
    return result;
  }

  const cdCount = readU16LE(tbkBytes, eocdPos + 10);
  let pos = readU32LE(tbkBytes, eocdPos + 16);

  const entries: Record<string, Uint8Array> = {};
  for (let i = 0; i < cdCount; i++) {
    if (pos + 46 > tbkBytes.length || readU32LE(tbkBytes, pos) !== 0x02014b50) {
      break;
    }
    const method = readU16LE(tbkBytes, pos + 10);
    const compSize = readU32LE(tbkBytes, pos + 20);
    const nameLen = readU16LE(tbkBytes, pos + 28);
    const extraLen = readU16LE(tbkBytes, pos + 30);
    const commentLen = readU16LE(tbkBytes, pos + 32);
    const localHdrOffset = readU32LE(tbkBytes, pos + 42);
    const name = decodeUtf8Bytes(tbkBytes.subarray(pos + 46, pos + 46 + nameLen));
    pos += 46 + nameLen + extraLen + commentLen;

    // Decompress only essential Tavo backup files (skipping large bundled plugins/vendor JS)
    const shouldExtract =
      name === 'objectbox/data.mdb' ||
      name.startsWith('CharacterCards/') ||
      name === 'shared_preferences.json' ||
      name === 'backup_info.txt' ||
      name.endsWith('.json') ||
      name.endsWith('.jsonl');

    if (shouldExtract && localHdrOffset + 30 <= tbkBytes.length) {
      const lNameLen = readU16LE(tbkBytes, localHdrOffset + 26);
      const lExtraLen = readU16LE(tbkBytes, localHdrOffset + 28);
      const dataStart = localHdrOffset + 30 + lNameLen + lExtraLen;
      if (dataStart + compSize <= tbkBytes.length) {
        const rawSlice = tbkBytes.subarray(dataStart, dataStart + compSize);
        try {
          entries[name] =
            method === 0 ? rawSlice : inflateRawDeflate(rawSlice);
        } catch (e) {
          console.warn(`Failed to inflate .tbk entry ${name}:`, e);
        }
      }
    }
  }

  const mdb = entries['objectbox/data.mdb'];
  if (!mdb || mdb.length < 8192) {
    return result;
  }

  // Step 1: Index all valid length-prefixed UTF-8 FlatBuffer strings in `objectbox/data.mdb`
  const strMap = new Map<number, string>();
  for (let o = 8192; o < mdb.length - 8; o += 4) {
    const len = readU32LE(mdb, o);
    if (
      len >= 1 &&
      len <= 50000 &&
      o + 4 + len <= mdb.length &&
      mdb[o + 4 + len] === 0
    ) {
      const slice = mdb.subarray(o + 4, o + 4 + len);
      let ok = true;
      for (let k = 0; k < slice.length; k++) {
        const b = slice[k];
        if (b === 0 || (b < 32 && b !== 9 && b !== 10 && b !== 13)) {
          ok = false;
          break;
        }
      }
      if (ok) {
        const s = decodeUtf8Bytes(slice);
        if (!s.includes('\ufffd')) {
          strMap.set(o, s);
          // Also scan standalone JSON arrays or CSS strings directly
          if (
            (s.includes('.tavo-bubble') || s.includes('.tav-bubble')) &&
            !result.customCssList.includes(s)
          ) {
            result.customCssList.push(s);
          }
        }
      }
    }
  }

  // Step 2: Scan all FlatBuffer tables (`v = t - readI32LE(mdb, t)`)
  const seenCharKeys = new Set<string>();
  const seenApiKeys = new Set<string>();
  const seenPresetNames = new Set<string>();
  const seenMsgKeys = new Set<string>();

  for (let t = 8192; t < mdb.length - 16; t += 4) {
    const vOff = readI32LE(mdb, t);
    const v = t - vOff;
    if (v >= 8192 && v < t && t - v <= 512 && v % 2 === 0) {
      const vLen = readU16LE(mdb, v);
      const tLen = readU16LE(mdb, v + 2);
      if (
        vLen >= 6 &&
        vLen <= 128 &&
        vLen % 2 === 0 &&
        tLen >= 4 &&
        tLen <= 512 &&
        v + vLen <= mdb.length &&
        t + tLen <= mdb.length
      ) {
        const numFields = (vLen - 4) / 2;
        const fields: Record<number, string> = {};
        let strCount = 0;
        for (let f = 0; f < numFields; f++) {
          const fOff = readU16LE(mdb, v + 4 + f * 2);
          if (fOff >= 4 && fOff + 4 <= tLen) {
            const addr = t + fOff;
            const target = addr + readU32LE(mdb, addr);
            const val = strMap.get(target);
            if (val !== undefined) {
              fields[f] = val;
              strCount++;
            }
          }
        }
        if (strCount === 0) {
          continue;
        }

        // A. Detect Tavo Character table (`numFields === 37`, field 1 = name, field 13 = avatar or field 5 = firstMes)
        if (
          numFields >= 34 &&
          fields[1] &&
          !fields[1].startsWith("{") &&
          !fields[1].startsWith("[") &&
          (fields[5] || fields[14] || (fields[13] && fields[13].includes('charaCard/')))
        ) {
          const name = fields[1].trim();
          const avatarKey = fields[13] || '';
          const firstMes = fields[5] || '';
          const description = fields[14] || '';
          if (name && (firstMes || description || avatarKey)) {
            const dedupKey = `${name}::${avatarKey}`;
            if (!seenCharKeys.has(dedupKey)) {
              seenCharKeys.add(dedupKey);
              const pngFileName = avatarKey.split('/').pop() || '';
              const pngEntryKey = pngFileName
                ? `CharacterCards/${pngFileName}`
                : '';
              const avatarPngBytes = pngEntryKey
                ? entries[pngEntryKey]
                : undefined;

              let tags: string[] = ['Tavo Import'];
              if (fields[20]) {
                try {
                  const parsedTags = JSON.parse(fields[20]);
                  if (Array.isArray(parsedTags) && parsedTags.length > 0) {
                    tags = parsedTags;
                  }
                } catch {
                  tags = fields[20]
                    .split(',')
                    .map(s => s.trim())
                    .filter(Boolean);
                }
              }

              let altGreetings: string[] = [];
              if (fields[19]) {
                try {
                  const parsedAlt = JSON.parse(fields[19]);
                  if (Array.isArray(parsedAlt)) {
                    altGreetings = parsedAlt;
                  }
                } catch {
                  // ignore
                }
              }

              result.characters.push({
                name,
                personality: fields[2] || '',
                scenario: fields[3] || '',
                firstMes,
                mesExample: fields[7] || '',
                avatarKey,
                avatarPngBytes,
                description,
                creatorNotes: fields[15] || '',
                systemPrompt: fields[17] || '',
                postHistoryInstructions: fields[18] || '',
                alternateGreetings: altGreetings,
                tags,
                creator: fields[21] || 'Tavo Backup',
                characterVersion: fields[22] || '1.8',
              });
            }
          }
        }

        // B. Detect Tavo Endpoint (API) table (`numFields === 18`, field 1 = name, field 2 = secret, field 3 = model, field 4 = platform)
        if (
          numFields >= 14 &&
          numFields <= 22 &&
          fields[1] &&
          fields[3] &&
          fields[4] &&
          !fields[1].startsWith('{') &&
          !fields[3].startsWith('{')
        ) {
          const name = fields[1].trim();
          const secret = (fields[2] || '').trim();
          const model = fields[3].trim();
          const platform = fields[4].trim();
          const apiUrl = (fields[5] || '').trim();
          const dedupKey = `${name}::${model}::${secret}::${platform}`;
          if (!seenApiKeys.has(dedupKey)) {
            seenApiKeys.add(dedupKey);
            result.apis.push({
              name,
              secret,
              model,
              platform,
              apiUrl,
            });
          }
        }

        // C. Detect Tavo Preset table (`numFields === 10` or `16`, field 1 = preset name, field 4 = dbBasicPrompts JSON, field 5 = dbEntries JSON)
        if (
          numFields >= 8 &&
          numFields <= 18 &&
          fields[1] &&
          fields[4] &&
          fields[4].startsWith('{') &&
          fields[4].includes('"persona"')
        ) {
          const presetName = fields[1].trim();
          if (presetName && !seenPresetNames.has(presetName)) {
            let entriesJsonStr = fields[5] || '';
            // If field 5 was not directly caught by vtable (e.g. inner table), look for the nearest JSON array string `[{"identifier":` right after `t`
            if (!entriesJsonStr.startsWith('[')) {
              for (let scan = t; scan < Math.min(mdb.length - 8, t + 512); scan += 4) {
                const candidate = strMap.get(scan);
                if (candidate && candidate.startsWith('[{"identifier":')) {
                  entriesJsonStr = candidate;
                  break;
                }
              }
            }
            if (entriesJsonStr.startsWith('[')) {
              try {
                const parsedEntries = JSON.parse(entriesJsonStr);
                const parsedBasic = JSON.parse(fields[4]);
                if (Array.isArray(parsedEntries) && parsedEntries.length > 0) {
                  seenPresetNames.add(presetName);
                  result.presets.push({
                    name: presetName,
                    entries: parsedEntries,
                    basicPrompts: parsedBasic || {},
                  });
                }
              } catch {
                // ignore malformed preset JSON
              }
            }
          }
        }

        // D. Detect Tavo Message / MessageVariant table (`numFields === 17`, field 2 = content, field 5 = speakerName)
        if (
          numFields >= 14 &&
          numFields <= 21 &&
          fields[2] &&
          fields[5] &&
          !fields[2].startsWith('[{"identifier":') &&
          fields[5].length <= 80
        ) {
          const content = fields[2].trim();
          const speakerName = fields[5].trim();
          const speakerAvatar = fields[6] || '';
          const dedupKey = `${speakerName}::${content}`;
          if (content && speakerName && !seenMsgKeys.has(dedupKey)) {
            seenMsgKeys.add(dedupKey);
            result.messages.push({
              speakerName,
              speakerAvatar,
              content,
            });
          }
        }

        // E. Detect Tavo Regex table (`field 11` JSON array with `findRegex`)
        for (const fKey of Object.keys(fields)) {
          const val = fields[Number(fKey)];
          if (val && val.startsWith('[{') && val.includes('"findRegex"')) {
            try {
              const parsedRx = JSON.parse(val);
              if (Array.isArray(parsedRx) && result.regexEntries.length === 0) {
                result.regexEntries = parsedRx;
              }
            } catch {
              // ignore
            }
          }
        }
      }
    }
  }

  return result;
}

/**
 * Imports a parsed binary Tavo `.tbk` / `.zip` archive into PocketPal stores:
 * - Saves character PNG avatars to `RNFS.DocumentDirectoryPath/pal-images/`
 * - Creates Pals with full V4 Character Card metadata
 * - Creates unlimited named API profiles in `AIProviderStore`
 * - Converts Tavo `Preset` (`Default`, `Whisper`, etc.) into `SillyTavernPresetStore`
 * - Creates Chat Sessions linked to imported Pals
 * - Applies Tavo Custom CSS (`Gilded Tales`, etc.) to `UIStore`
 */
export async function importTavoTbkArchive(
  tbkBytes: Uint8Array,
  _fileName?: string,
): Promise<TavoImportSummary> {
  const summary: TavoImportSummary = {
    chatsImported: 0,
    charactersImported: 0,
    apiProvidersImported: 0,
    presetsImported: 0,
    customCssImported: false,
    extractedDetails: {
      characterNames: [],
      apiNames: [],
      presetNames: [],
      chatTitles: [],
    },
  };

  const parsed = parseTavoTbkArchive(tbkBytes);
  const {
    palStore,
    aiProviderStore,
    sillyTavernPresetStore,
    chatSessionStore,
    uiStore,
  } = await import('../store');

  // 1. Import API Endpoints (Unlimited Saved APIs support)
  if (parsed.apis.length > 0 && aiProviderStore) {
    for (const api of parsed.apis) {
      let baseUrl = api.apiUrl;
      if (!baseUrl) {
        const plat = api.platform.toLowerCase();
        if (plat.includes('deepseek') || api.model.toLowerCase().includes('deepseek')) {
          baseUrl = 'https://api.deepseek.com';
        } else if (plat.includes('openrouter')) {
          baseUrl = 'https://openrouter.ai/api';
        } else if (plat.includes('gemini') || plat.includes('google')) {
          baseUrl = 'https://generativelanguage.googleapis.com/v1beta/openai';
        } else if (plat.includes('groq')) {
          baseUrl = 'https://api.groq.com/openai';
        } else {
          baseUrl = 'https://api.openai.com';
        }
      }

      if (typeof (aiProviderStore as any).addCustomProvider === 'function') {
        await (aiProviderStore as any).addCustomProvider({
          name: `${api.name} (${api.model})`,
          baseUrl,
          apiKey: api.secret,
          defaultModel: api.model,
          platform: api.platform,
        });
      } else {
        await aiProviderStore.setProviderConfigAndKey('custom', {
          apiKey: api.secret,
          baseUrl,
          defaultModel: api.model,
          activateNow: true,
        });
      }
      summary.apiProvidersImported++;
      summary.extractedDetails?.apiNames.push(`${api.name} [${api.model}]`);
    }
  }

  // 2. Import Characters + Extract & Save PNG Avatars from `CharacterCards/*.png`
  const charNameToPalId = new Map<string, string>();
  if (parsed.characters.length > 0 && palStore) {
    const palImagesDir = `${RNFS.DocumentDirectoryPath}/pal-images`;
    try {
      const dirExists = await RNFS.exists(palImagesDir);
      if (!dirExists) {
        await RNFS.mkdir(palImagesDir);
      }
    } catch {
      // ignore in headless test environments
    }

    for (const ch of parsed.characters) {
      let savedThumbnailName: string | undefined;
      if (ch.avatarPngBytes && ch.avatarPngBytes.length > 0) {
        try {
          const fileId = uuidv4();
          const fileName = `tavo_${fileId}.png`;
          const fullPath = `${palImagesDir}/${fileName}`;
          const b64 = uint8ArrayToBase64(ch.avatarPngBytes);
          await RNFS.writeFile(fullPath, b64, 'base64');
          savedThumbnailName = fileName;
        } catch (e) {
          console.warn('Could not write Tavo PNG avatar to disk:', e);
        }
      }

      const sysPrompt =
        ch.systemPrompt ||
        [
          ch.description ? `Description: ${ch.description}` : '',
          ch.personality ? `Personality: ${ch.personality}` : '',
          ch.scenario ? `Scenario: ${ch.scenario}` : '',
        ]
          .filter(Boolean)
          .join('\n\n') ||
        `You are ${ch.name}.`;

      const cardV4 = {
        spec: 'chara_card_v4' as const,
        spec_version: '4.0',
        data: {
          name: ch.name,
          description: ch.description,
          personality: ch.personality,
          scenario: ch.scenario,
          first_mes: ch.firstMes,
          mes_example: ch.mesExample,
          creator_notes: ch.creatorNotes,
          system_prompt: ch.systemPrompt,
          post_history_instructions: ch.postHistoryInstructions,
          alternate_greetings: ch.alternateGreetings,
          tags: ch.tags,
          creator: ch.creator,
          character_version: ch.characterVersion,
          extensions: {},
        },
      };

      const {saveToMyPals} = await import('../screens/PalsScreen/myPals');
      const createdPal = await saveToMyPals({
        type: 'local',
        name: ch.name,
        description: ch.description || `${ch.name} (Imported from Tavo .tbk)`,
        systemPrompt: sysPrompt,
        originalSystemPrompt: sysPrompt,
        isSystemPromptChanged: false,
        useAIPrompt: false,
        parameters: {},
        parameterSchema: [],
        source: 'local',
        thumbnail_url: savedThumbnailName,
        tags: ch.tags,
        greeting: {
          text: ch.firstMes,
          alternateGreetings: ch.alternateGreetings,
          selectedGreetingIndex: 0,
          characterCard: cardV4,
        },
        alternateGreetings: ch.alternateGreetings,
        characterCard: cardV4,
      });

      if (createdPal && createdPal.id) {
        charNameToPalId.set(ch.name, createdPal.id);
      }
      summary.charactersImported++;
      summary.extractedDetails?.characterNames.push(ch.name);
    }
  }

  // 3. Import Tavo Presets (`Default`, `Whisper`, etc.) into `SillyTavernPresetStore`
  if (parsed.presets.length > 0 && sillyTavernPresetStore) {
    for (const pr of parsed.presets) {
      const prompts = pr.entries.map((e: any) => ({
        identifier: String(e.identifier || uuidv4()),
        name: String(e.name || e.identifier || 'Prompt'),
        role: (e.role === 'user' || e.role === 'assistant'
          ? e.role
          : 'system') as 'system' | 'user' | 'assistant',
        content: String(e.content || ''),
        system_prompt: e.type === 'builtin',
        marker: e.type === 'marker',
        enabled: Boolean(e.enabled ?? true),
        injection_position: e.injectionPosition === 'absolute' ? 1 : 0,
        injection_depth:
          typeof e.injectionDepth === 'number' ? e.injectionDepth : 4,
        forbid_overrides: Boolean(e.forbidOverrides ?? false),
      }));

      const orderEntries = pr.entries.map((e: any) => ({
        identifier: String(e.identifier),
        enabled: Boolean(e.enabled ?? true),
      }));

      const basic = pr.basicPrompts || {};
      const stPresetObj = {
        name: `Tavo: ${pr.name}`,
        description: `Imported from Tavo backup (.tbk) — ${prompts.length} prompt blocks`,
        temperature: 1.0,
        top_p: 0.95,
        top_k: 40,
        min_p: 0.05,
        rep_pen: 1.1,
        openai_max_context: 65536,
        openai_max_tokens: 1024,
        wi_format: basic.lorebook || '{0}',
        scenario_format: basic.scenario || '{{scenario}}',
        personality_format: basic.personality || '{{personality}}',
        new_chat_prompt: basic.chatStart || '[Start a new Chat]',
        new_group_chat_prompt:
          basic.groupChatStart ||
          '[Start a new group chat. Group members: {{group}}]',
        new_example_chat_prompt: basic.exampleMessageStart || '[Example Chat]',
        continue_nudge_prompt:
          basic.continueNudge ||
          '[Continue your last message without repeating its original content.]',
        group_nudge_prompt:
          basic.groupNudge || '[Write the next reply only as {{char}}.]',
        impersonation_prompt:
          basic.impersonation ||
          "[Write your next reply from the point of view of {{user}}, using the chat history so far as a guideline for the writing style of {{user}}. Don't write as {{char}} or system.]",
        prompts,
        prompt_order: [
          {
            character_id: 100000,
            order: orderEntries,
          },
        ],
        regex_scripts: parsed.regexEntries
          .filter((r: any) => r && r.findRegex && !r.builtIn)
          .map((r: any) => ({
            id: r.identifier || uuidv4(),
            scriptName: r.name || 'Tavo Regex',
            findRegex: r.findRegex,
            replaceString: r.replaceString || '',
            placement: [1, 2],
            disabled: !r.enabled,
          })),
      };

      await sillyTavernPresetStore.importPreset(stPresetObj);
      summary.presetsImported++;
      summary.extractedDetails?.presetNames.push(pr.name);
    }
  }

  // 4. Import Custom CSS from Tavo Theme (`Official05` Gilded Tales, etc.)
  if (parsed.customCssList.length > 0 && uiStore) {
    uiStore.setCustomCss(parsed.customCssList[0]);
    uiStore.setCustomCssEnabled(true);
    summary.customCssImported = true;
  }

  // 5. Import Conversations / Messages linked to the imported Character
  if (parsed.messages.length > 0) {
    const primaryCharName =
      parsed.characters[0]?.name ||
      parsed.messages.find(m => m.speakerName.toLowerCase() !== 'user')
        ?.speakerName ||
      'Imported Tavo Chat';
    const linkedPalId = charNameToPalId.get(primaryCharName);

    const convertedMessages: MessageType.Any[] = parsed.messages.map(
      (m, idx) => {
        const isUser = m.speakerName.toLowerCase() === 'user';
        return {
          id: uuidv4(),
          type: 'text',
          text: m.content,
          createdAt: Date.now() - (parsed.messages.length - idx) * 1000,
          author: {
            id: isUser ? 'user' : 'assistant',
            firstName: m.speakerName,
          },
        } as MessageType.Text;
      },
    );

    await chatSessionRepository.createSession(
      primaryCharName,
      convertedMessages,
      defaultCompletionSettings,
      linkedPalId,
    );
    summary.chatsImported++;
    summary.extractedDetails?.chatTitles.push(primaryCharName);
    if (chatSessionStore) {
      await chatSessionStore.loadSessionList();
    }
  }

  return summary;
}

/**
 * Detects whether a raw file string is a `.tbk` base64 archive, a SillyTavern / Tavo `.jsonl` chat file,
 * or a JSON object/array, and imports all discovered entities.
 */
export async function importTavoOrUnifiedData(
  rawText: string,
  fileName?: string,
): Promise<TavoImportSummary> {
  const summary: TavoImportSummary = {
    chatsImported: 0,
    charactersImported: 0,
    apiProvidersImported: 0,
    presetsImported: 0,
    customCssImported: false,
  };

  const trimmed = rawText.trim();
  if (!trimmed) {
    return summary;
  }

  // 0. Check if it is a binary `.tbk` or `.zip` file passed as base64 (`UEsDB...` = `PK\x03\x04`) or raw `PK` bytes
  if (
    trimmed.startsWith('UEsDB') ||
    trimmed.startsWith('PK\x03\x04') ||
    (fileName &&
      (fileName.toLowerCase().endsWith('.tbk') ||
        fileName.toLowerCase().endsWith('.zip')))
  ) {
    try {
      const bytes = trimmed.startsWith('UEsDB')
        ? base64ToUint8Array(trimmed)
        : new Uint8Array(
            Array.from(trimmed).map(ch => ch.charCodeAt(0) & 0xff),
          );
      return await importTavoTbkArchive(bytes, fileName);
    } catch (e) {
      console.warn('Error parsing .tbk archive in importTavoOrUnifiedData:', e);
    }
  }

  const {
    palStore,
    aiProviderStore,
    sillyTavernPresetStore,
    chatSessionStore,
    uiStore,
  } = await import('../store');

  // 1. Check if it is a `.jsonl` chat log (multiple JSON objects separated by newlines)
  if (
    (fileName && fileName.toLowerCase().endsWith('.jsonl')) ||
    (trimmed.includes('\n{') && !trimmed.startsWith('['))
  ) {
    try {
      JSON.parse(trimmed);
    } catch {
      const lines = trimmed
        .split(/\r?\n/)
        .map(l => l.trim())
        .filter(Boolean);
      const parsedLines: any[] = [];
      for (const line of lines) {
        try {
          parsedLines.push(JSON.parse(line));
        } catch {
          // ignore malformed line
        }
      }
      if (parsedLines.length > 0) {
        const count = await importJsonlChatSession(parsedLines, fileName);
        summary.chatsImported += count;
        await chatSessionStore.loadSessionList();
        return summary;
      }
    }
  }

  const data = JSON.parse(trimmed);

  // 2. Import API Providers / Connection Profiles (Tavo & PocketPal formats)
  const rawApis: any[] =
    data.apis ||
    data.api_configs ||
    data.apiConfigs ||
    data.connections ||
    data.connection_profiles ||
    data.profiles ||
    data.apiProviders ||
    (data.api && typeof data.api === 'object' ? [data.api] : []);

  if (Array.isArray(rawApis) && rawApis.length > 0 && aiProviderStore) {
    for (const apiEntry of rawApis) {
      if (!apiEntry || typeof apiEntry !== 'object') {
        continue;
      }
      const rawName = String(
        apiEntry.name ||
          apiEntry.label ||
          apiEntry.provider ||
          apiEntry.id ||
          'Imported API',
      );
      const rawType = String(
        apiEntry.id ||
          apiEntry.provider ||
          apiEntry.type ||
          apiEntry.api_type ||
          apiEntry.source ||
          apiEntry.name ||
          '',
      ).toLowerCase();
      const key =
        apiEntry.apiKey ||
        apiEntry.api_key ||
        apiEntry.key ||
        apiEntry.token ||
        apiEntry.secret ||
        '';
      const url =
        apiEntry.baseUrl ||
        apiEntry.base_url ||
        apiEntry.endpoint ||
        apiEntry.custom_url ||
        apiEntry.reverse_proxy ||
        apiEntry.url ||
        '';
      const model =
        apiEntry.activeModel ||
        apiEntry.model ||
        apiEntry.model_name ||
        apiEntry.selected_model ||
        '';

      let targetProviderId = 'custom';
      if (rawType.includes('openrouter')) {
        targetProviderId = 'openrouter';
      } else if (rawType.includes('gemini') || rawType.includes('google')) {
        targetProviderId = 'gemini';
      } else if (rawType.includes('groq')) {
        targetProviderId = 'groq';
      } else if (rawType.includes('deepseek')) {
        targetProviderId = 'deepseek';
      } else if (rawType.includes('mistral')) {
        targetProviderId = 'mistral';
      } else if (rawType.includes('together')) {
        targetProviderId = 'together';
      } else if (rawType.includes('openai') || rawType.includes('gpt')) {
        targetProviderId = 'openai';
      }

      if (
        targetProviderId === 'custom' &&
        typeof (aiProviderStore as any).addCustomProvider === 'function'
      ) {
        await (aiProviderStore as any).addCustomProvider({
          name: rawName,
          baseUrl: url || 'https://api.openai.com',
          apiKey: key,
          defaultModel: model || 'gpt-4o-mini',
        });
      } else {
        if (key && typeof key === 'string' && key.trim()) {
          await aiProviderStore.setApiKey(targetProviderId, key.trim());
        }
        if (url && typeof url === 'string' && url.trim()) {
          aiProviderStore.setBaseUrl(targetProviderId, url.trim());
        }
        if (model && typeof model === 'string' && model.trim()) {
          aiProviderStore.setActiveModel(targetProviderId, model.trim());
        }
      }
      summary.apiProvidersImported++;
    }
  }

  // Also check top-level Tavo / SillyTavern key dictionary (`secrets` or `api_keys`)
  const keyMap = data.api_keys || data.apiKeys || data.secrets;
  if (
    keyMap &&
    typeof keyMap === 'object' &&
    !Array.isArray(keyMap) &&
    aiProviderStore
  ) {
    const mapping: Array<[string[], string]> = [
      [['openai', 'api_key_openai', 'openai_key'], 'openai'],
      [['openrouter', 'api_key_openrouter', 'openrouter_key'], 'openrouter'],
      [['gemini', 'makersuite', 'google', 'api_key_makersuite'], 'gemini'],
      [['groq', 'api_key_groq'], 'groq'],
      [['deepseek', 'api_key_deepseek'], 'deepseek'],
      [['mistral', 'api_key_mistral'], 'mistral'],
      [['together', 'togetherai', 'api_key_together'], 'together'],
      [['custom', 'api_key_custom'], 'custom'],
    ];
    for (const [keys, provId] of mapping) {
      for (const k of keys) {
        if (typeof keyMap[k] === 'string' && keyMap[k].trim()) {
          await aiProviderStore.setApiKey(provId, keyMap[k].trim());
          summary.apiProvidersImported++;
          break;
        }
      }
    }
  }

  // 3. Import Characters / Pals (Tavo `characters`, `cards`, `pals`, or single character card)
  const rawChars: any[] =
    data.characters ||
    data.cards ||
    data.pals ||
    (data.spec && data.data ? [data] : []) ||
    (data.name && (data.first_mes || data.description || data.personality)
      ? [data]
      : []);

  if (Array.isArray(rawChars) && rawChars.length > 0 && palStore) {
    for (const ch of rawChars) {
      if (!ch || typeof ch !== 'object') {
        continue;
      }
      const {saveToMyPals} = await import('../screens/PalsScreen/myPals');
      if (ch.systemPrompt !== undefined && ch.type === 'local') {
        const exists = palStore.getLocalPals().some((p: any) => p.id === ch.id || p.name === ch.name);
        if (!exists) {
          await saveToMyPals({
            ...ch,
            type: 'local',
            source: 'local',
            palshub_id: undefined,
          });
          summary.charactersImported++;
        }
        continue;
      }

      const cData = ch.data && typeof ch.data === 'object' ? ch.data : ch;
      const name = cData.name || ch.name || 'Imported Character';
      const description = cData.description || ch.description || '';
      const personality = cData.personality || ch.personality || '';
      const scenario = cData.scenario || ch.scenario || '';
      const firstMes =
        cData.first_mes ||
        cData.greeting ||
        ch.first_mes ||
        ch.greeting ||
        '';
      const altGreetings: string[] = Array.isArray(cData.alternate_greetings)
        ? cData.alternate_greetings
        : Array.isArray(ch.alternate_greetings)
        ? ch.alternate_greetings
        : [];
      const tags: string[] = Array.isArray(cData.tags)
        ? cData.tags
        : Array.isArray(ch.tags)
        ? ch.tags
        : [];
      const sysPrompt =
        cData.system_prompt ||
        ch.system_prompt ||
        [
          description ? `Description: ${description}` : '',
          personality ? `Personality: ${personality}` : '',
          scenario ? `Scenario: ${scenario}` : '',
        ]
          .filter(Boolean)
          .join('\n\n') ||
        `You are ${name}.`;

      const cardV4 = {
        spec: 'chara_card_v4' as const,
        spec_version: '4.0',
        data: {
          name,
          description,
          personality,
          scenario,
          first_mes: firstMes,
          mes_example: cData.mes_example || ch.mes_example || '',
          creator_notes: cData.creator_notes || ch.creator_notes || '',
          system_prompt: cData.system_prompt || ch.system_prompt || '',
          post_history_instructions:
            cData.post_history_instructions ||
            ch.post_history_instructions ||
            '',
          alternate_greetings: altGreetings,
          character_book:
            cData.character_book ||
            cData.lorebook ||
            ch.character_book ||
            ch.lorebook,
          tags,
          creator: cData.creator || 'Tavo Import',
          character_version: cData.character_version || '1.0',
          extensions: cData.extensions || {},
        },
      };

      await saveToMyPals({
        type: 'local',
        name,
        description: description || `${name} (Imported from Tavo)`,
        systemPrompt: sysPrompt,
        originalSystemPrompt: sysPrompt,
        isSystemPromptChanged: false,
        useAIPrompt: false,
        parameters: {},
        parameterSchema: [],
        source: 'local',
        thumbnail_url: cData.avatar || ch.avatar || ch.thumbnail_url,
        tags,
        greeting: {
          text: firstMes,
          alternateGreetings: altGreetings,
          selectedGreetingIndex: 0,
          characterCard: cardV4,
        },
        alternateGreetings: altGreetings,
        characterCard: cardV4,
      });
      summary.charactersImported++;
    }
  }

  // 4. Import Presets (Tavo / SillyTavern presets)
  const rawPresets: any[] =
    data.presets ||
    data.prompt_presets ||
    data.sillyTavernPresets ||
    (Array.isArray(data.prompts) && data.prompt_order ? [data] : []);

  if (
    Array.isArray(rawPresets) &&
    rawPresets.length > 0 &&
    sillyTavernPresetStore
  ) {
    for (const pr of rawPresets) {
      if (pr && typeof pr === 'object') {
        await sillyTavernPresetStore.importPreset(pr);
        summary.presetsImported++;
      }
    }
  }

  // 5. Import Theme & Custom CSS (Tavo theme / customCss)
  const cssCandidate =
    data.customCss ||
    data.custom_css ||
    data.theme?.customCss ||
    data.theme?.custom_css ||
    data.uiSettings?.customCss;
  if (typeof cssCandidate === 'string' && cssCandidate.trim() && uiStore) {
    uiStore.setCustomCss(cssCandidate);
    uiStore.setCustomCssEnabled(true);
    summary.customCssImported = true;
  }

  // 6. Import Chats / Conversations (Tavo `chats`, `conversations`, `threads`, `sessions`, or single chat)
  const rawChats: any[] =
    data.chats ||
    data.conversations ||
    data.threads ||
    data.sessions ||
    (Array.isArray(data) ? data : []) ||
    (Array.isArray(data.messages) && !data.prompts ? [data] : []);

  if (Array.isArray(rawChats) && rawChats.length > 0) {
    for (const chatObj of rawChats) {
      if (!chatObj || typeof chatObj !== 'object') {
        continue;
      }
      const imported = await importSingleTavoOrPocketPalChat(chatObj);
      if (imported) {
        summary.chatsImported++;
      }
    }
    if (summary.chatsImported > 0 && chatSessionStore) {
      await chatSessionStore.loadSessionList();
    }
  }

  return summary;
}

async function importSingleTavoOrPocketPalChat(chatObj: any): Promise<boolean> {
  const rawMsgs: any[] =
    chatObj.messages || chatObj.history || chatObj.chat || chatObj.log || [];
  if (!Array.isArray(rawMsgs) || rawMsgs.length === 0) {
    return false;
  }

  const title =
    chatObj.title ||
    chatObj.name ||
    chatObj.chat_name ||
    chatObj.character_name ||
    'Imported Chat';

  const isPocketPalFormat =
    rawMsgs[0] &&
    typeof rawMsgs[0].author === 'object' &&
    typeof rawMsgs[0].type === 'string';

  let convertedMessages: MessageType.Any[] = [];
  if (isPocketPalFormat) {
    convertedMessages = rawMsgs.map(m => ({
      ...m,
      id: m.id || uuidv4(),
    }));
  } else {
    convertedMessages = rawMsgs
      .filter(m => m && (m.mes || m.content || m.text))
      .map((m, idx) => {
        const isUser =
          m.is_user === true ||
          m.role === 'user' ||
          String(m.sender || '').toLowerCase() === 'user';
        const text = String(m.mes ?? m.content ?? m.text ?? '');
        const createdAt = m.send_date
          ? new Date(m.send_date).getTime() || Date.now() + idx
          : m.createdAt || Date.now() + idx;
        return {
          id: m.id || uuidv4(),
          type: 'text',
          text,
          createdAt,
          author: {
            id: isUser ? 'user' : 'assistant',
            firstName:
              m.name ||
              m.sender ||
              (isUser ? 'User' : chatObj.character_name || 'Assistant'),
          },
        } as MessageType.Text;
      });
  }

  if (convertedMessages.length === 0) {
    return false;
  }

  const completionSettings =
    chatObj.completionSettings || defaultCompletionSettings;
  await chatSessionRepository.createSession(
    title,
    convertedMessages,
    completionSettings,
    chatObj.activePalId,
  );
  return true;
}

async function importJsonlChatSession(
  lines: any[],
  fileName?: string,
): Promise<number> {
  const meta =
    lines[0] && !lines[0].mes && !lines[0].text && !lines[0].content
      ? lines[0]
      : {};
  const msgLines = meta === lines[0] ? lines.slice(1) : lines;

  const charName =
    meta.character_name ||
    meta.name ||
    (fileName ? fileName.replace(/\.jsonl$/i, '') : 'Imported Tavern Chat');

  const ok = await importSingleTavoOrPocketPalChat({
    title: `${charName} (Chat Import)`,
    character_name: charName,
    messages: msgLines,
  });
  return ok ? 1 : 0;
}
