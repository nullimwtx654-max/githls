import * as RNFS from '@dr.pogodin/react-native-fs';
import {Platform} from 'react-native';
import {pick, types} from '@react-native-documents/picker';
import {v4 as uuidv4} from 'uuid';

import type {
  AnyCharacterCard,
  CharacterCardV4,
  CharacterCardV4Data,
} from '../types/characterCard';
import type {Pal} from '../types/pal';

/**
 * Base64 string to Uint8Array helper
 */
export const base64ToUint8Array = (base64: string): Uint8Array => {
  const binaryString = atob(base64.replace(/\s+/g, ''));
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
};

/**
 * Uint8Array to Base64 string helper
 */
export const uint8ArrayToBase64 = (bytes: Uint8Array): string => {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
};

/**
 * Pure-JS UTF-8 decoder (Hermes-safe, no global TextDecoder required)
 */
const decodeUtf8 = (bytes: Uint8Array): string => {
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
      let u =
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
 * Pure-JS RFC 1951 DEFLATE & RFC 1950 Zlib Decompressor (zero external dependencies)
 */
const pureInflate = (input: Uint8Array, isZlibWrapped = true): Uint8Array => {
  let pos = 0;
  if (isZlibWrapped && input.length >= 2) {
    const cmf = input[0];
    const flg = input[1];
    if ((cmf & 0x0f) === 8 && ((cmf << 8) + flg) % 31 === 0) {
      pos = 2;
      if (flg & 0x20) {
        pos += 4;
      }
    }
  }

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

/**
 * Pure-JS PNG chunk parser for Character Card metadata.
 * Reads tEXt, iTXt, and zTXt chunks for ccv4, ccv3, and chara keys.
 */
export const extractCharacterCardFromPngBytes = (
  bytes: Uint8Array,
): AnyCharacterCard => {
  const pngSignature = [137, 80, 78, 71, 13, 10, 26, 10];
  for (let i = 0; i < 8; i++) {
    if (bytes[i] !== pngSignature[i]) {
      throw new Error('Selected file is not a valid PNG image.');
    }
  }

  const chunks: Record<string, string> = {};
  let offset = 8;

  while (offset + 8 <= bytes.length) {
    const length =
      ((bytes[offset] << 24) |
        (bytes[offset + 1] << 16) |
        (bytes[offset + 2] << 8) |
        bytes[offset + 3]) >>>
      0;
    const type = String.fromCharCode(
      bytes[offset + 4],
      bytes[offset + 5],
      bytes[offset + 6],
      bytes[offset + 7],
    );

    const dataStart = offset + 8;
    const dataEnd = dataStart + length;

    if (dataEnd > bytes.length) {
      break;
    }

    const chunkData = bytes.subarray(dataStart, dataEnd);

    if (type === 'tEXt') {
      const nullIdx = chunkData.indexOf(0);
      if (nullIdx > 0) {
        const keyword = decodeUtf8(chunkData.subarray(0, nullIdx)).toLowerCase();
        const textVal = decodeUtf8(chunkData.subarray(nullIdx + 1)).trim();
        if (
          keyword === 'ccv4' ||
          keyword === 'ccv3' ||
          keyword === 'chara'
        ) {
          chunks[keyword] = textVal;
        }
      }
    } else if (type === 'iTXt') {
      const nullIdx = chunkData.indexOf(0);
      if (nullIdx > 0) {
        const keyword = decodeUtf8(chunkData.subarray(0, nullIdx)).toLowerCase();
        const compressionFlag = chunkData[nullIdx + 1];
        let pos = nullIdx + 3;
        while (pos < chunkData.length && chunkData[pos] !== 0) {
          pos++;
        }
        pos++; // Skip language tag null
        while (pos < chunkData.length && chunkData[pos] !== 0) {
          pos++;
        }
        pos++; // Skip translated keyword null

        if (pos < chunkData.length) {
          let textVal = '';
          const rawTextData = chunkData.subarray(pos);
          if (compressionFlag === 1) {
            try {
              const decompressed = pureInflate(rawTextData, true);
              textVal = decodeUtf8(decompressed).trim();
            } catch {
              try {
                const decompressed = pureInflate(rawTextData, false);
                textVal = decodeUtf8(decompressed).trim();
              } catch {
                textVal = '';
              }
            }
          } else {
            textVal = decodeUtf8(rawTextData).trim();
          }

          if (
            keyword === 'ccv4' ||
            keyword === 'ccv3' ||
            keyword === 'chara'
          ) {
            chunks[keyword] = textVal;
          }
        }
      }
    } else if (type === 'zTXt') {
      const nullIdx = chunkData.indexOf(0);
      if (nullIdx > 0) {
        const keyword = decodeUtf8(chunkData.subarray(0, nullIdx)).toLowerCase();
        const rawCompressed = chunkData.subarray(nullIdx + 2);
        try {
          const decompressed = pureInflate(rawCompressed, true);
          const textVal = decodeUtf8(decompressed).trim();
          if (
            keyword === 'ccv4' ||
            keyword === 'ccv3' ||
            keyword === 'chara'
          ) {
            chunks[keyword] = textVal;
          }
        } catch {
          // ignore decompression error
        }
      }
    }

    offset = dataEnd + 4; // Skip CRC
    if (type === 'IEND') {
      break;
    }
  }

  const payload = chunks.ccv4 || chunks.ccv3 || chunks.chara;
  if (!payload) {
    throw new Error(
      'No character card metadata chunk (ccv4, ccv3, or chara) found in PNG.',
    );
  }

  return parseCharacterCardJson(payload);
};

/**
 * Parse JSON or Base64-encoded Character Card data
 */
export const parseCharacterCardJson = (rawInput: string): AnyCharacterCard => {
  let jsonString = rawInput.trim();

  if (!jsonString.startsWith('{')) {
    try {
      jsonString = decodeURIComponent(escape(atob(jsonString.replace(/\s+/g, ''))));
    } catch {
      jsonString = atob(jsonString.replace(/\s+/g, ''));
    }
  }

  const parsed = JSON.parse(jsonString);
  return normalizeCharacterCard(parsed);
};

/**
 * Normalize any character card version (V1/V2/V3/V4) into unified CharacterCardV4
 */
export const normalizeCharacterCard = (card: any): CharacterCardV4 => {
  if (!card || typeof card !== 'object') {
    throw new Error('Invalid character card: not an object.');
  }

  // CCv4 or CCv3 or CCv2 structure
  const rawData: any = card.data || card;

  const name =
    rawData.name ||
    rawData.char_name ||
    card.name ||
    'Unnamed Character';

  const firstMes =
    rawData.first_mes ||
    rawData.first_message ||
    rawData.greeting ||
    card.first_mes ||
    '';

  const alternateGreetings = Array.isArray(rawData.alternate_greetings)
    ? rawData.alternate_greetings
    : [];

  const groupOnlyGreetings = Array.isArray(rawData.group_only_greetings)
    ? rawData.group_only_greetings
    : [];

  const v4Data: CharacterCardV4Data = {
    name,
    description: rawData.description || card.description || '',
    personality: rawData.personality || rawData.char_persona || '',
    scenario: rawData.scenario || '',
    first_mes: firstMes,
    mes_example: rawData.mes_example || rawData.example_dialogue || '',
    creator_notes: rawData.creator_notes || rawData.creatorcomment || '',
    system_prompt: rawData.system_prompt || '',
    post_history_instructions: rawData.post_history_instructions || '',
    alternate_greetings: alternateGreetings,
    group_only_greetings: groupOnlyGreetings,
    tags: Array.isArray(rawData.tags) ? rawData.tags : [],
    creator: rawData.creator || card.creator || 'Community',
    character_version: rawData.character_version || card.character_version || '4.0',
    nickname: rawData.nickname || '',
    character_book: rawData.character_book || undefined,
    assets: rawData.assets || undefined,
    extensions: rawData.extensions || {},
  };

  return {
    spec: 'chara_card_v4',
    spec_version: '4.0',
    data: v4Data,
  };
};

/**
 * Save an extracted PNG avatar to the app's local pal-images directory
 */
export const saveAvatarToPalImages = async (
  pngBytes: Uint8Array,
  palId: string,
): Promise<string> => {
  const dir = `${RNFS.DocumentDirectoryPath}/pal-images`;
  const exists = await RNFS.exists(dir);
  if (!exists) {
    await RNFS.mkdir(dir);
  }
  const fileName = `${palId}_thumbnail.png`;
  const filePath = `${dir}/${fileName}`;
  const base64Data = uint8ArrayToBase64(pngBytes);
  await RNFS.writeFile(filePath, base64Data, 'base64');
  return fileName;
};

/**
 * Convert a CharacterCardV4 into a PocketPal Pal object ready for persistence
 */
export const characterCardToPal = async (
  card: CharacterCardV4,
  options?: {
    pngBase64?: string;
    source?: 'local' | 'palshub';
  },
): Promise<Omit<Pal, 'id' | 'created_at' | 'updated_at'>> => {
  const palId = uuidv4();
  let thumbnailUrl: string | undefined;

  if (options?.pngBase64) {
    try {
      const bytes = base64ToUint8Array(options.pngBase64);
      thumbnailUrl = await saveAvatarToPalImages(bytes, palId);
    } catch (e) {
      console.warn('Failed to save avatar image from character card:', e);
    }
  }

  const d = card.data;

  const alternateGreetings = Array.isArray(d.alternate_greetings)
    ? d.alternate_greetings
    : [];

  const greeting = {
    text: d.first_mes || '',
    suggestedPrompts: [] as string[],
    alternateGreetings,
    groupOnlyGreetings: d.group_only_greetings || [],
    selectedGreetingIndex: 0,
    characterCard: card,
  };

  return {
    type: 'local',
    name: d.name,
    description: d.description || '',
    thumbnail_url: thumbnailUrl,
    avatarPath: thumbnailUrl,
    alternateGreetings,
    systemPrompt: d.system_prompt || '',
    isSystemPromptChanged: false,
    useAIPrompt: false,
    color: ['#1E4DF6', '#7880FF'],
    parameters: {},
    parameterSchema: [],
    source: options?.source || 'palshub',
    capabilities: {},
    pact: {talents: []},
    greeting,
    characterCard: card,
    sillyTavernPresetId: undefined,
  };
};

/**
 * Export a Pal as Character Card V4 JSON
 */
export const palToCharacterCardV4 = (pal: Pal): CharacterCardV4 => {
  if (pal.characterCard) {
    return pal.characterCard;
  }

  const alternateGreetings = pal.greeting?.alternateGreetings || [];
  const groupOnlyGreetings = pal.greeting?.groupOnlyGreetings || [];

  return {
    spec: 'chara_card_v4',
    spec_version: '4.0',
    data: {
      name: pal.name,
      description: pal.description || '',
      personality: '',
      scenario: '',
      first_mes: pal.greeting?.text || '',
      alternate_greetings: alternateGreetings,
      group_only_greetings: groupOnlyGreetings,
      system_prompt: pal.systemPrompt || '',
      creator: 'PocketPal AI',
      character_version: '4.0',
      tags: ['pocketpal', 'v4'],
    },
  };
};

/**
 * Document picker for character cards (.png and .json)
 */
export const pickAndParseCharacterCard = async (): Promise<
  Omit<Pal, 'id' | 'created_at' | 'updated_at'> | null
> => {
  try {
    const res = await pick({
      type:
        Platform.OS === 'ios'
          ? ['public.json', 'public.png']
          : [types.images, types.allFiles],
    });

    if (!res || res.length === 0) {
      return null;
    }

    const file = res[0];
    const isPng =
      file.name?.toLowerCase().endsWith('.png') ||
      file.type?.toLowerCase().includes('png');

    if (isPng) {
      const base64Data = await RNFS.readFile(file.uri, 'base64');
      const bytes = base64ToUint8Array(base64Data);
      const card = normalizeCharacterCard(extractCharacterCardFromPngBytes(bytes));
      return await characterCardToPal(card, {pngBase64: base64Data});
    } else {
      const content = await RNFS.readFile(file.uri, 'utf8');
      const card = normalizeCharacterCard(parseCharacterCardJson(content));
      return await characterCardToPal(card);
    }
  } catch (err: any) {
    if (err?.code === 'OPERATION_CANCELED') {
      return null;
    }
    throw err;
  }
};
