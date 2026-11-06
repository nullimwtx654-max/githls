import {makeAutoObservable, runInAction} from 'mobx';
import {makePersistable} from 'mobx-persist-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {v4 as uuidv4} from 'uuid';
import 'react-native-get-random-values';

export interface MemoryEntry {
  id: string;
  content: string;
  source: 'user' | 'assistant';
  createdAt: number;
  embedding?: number[];
  tags?: string[];
}

/**
 * 256-dimensional normalized hash embedding for semantic similarity search
 * Computes term frequencies and character n-grams projected into a unit vector
 */
export function generateLocalEmbedding(text: string, dimensions = 256): number[] {
  const vec = new Float32Array(dimensions);
  const normalized = text.toLowerCase().trim();
  const words = normalized.split(/\s+/).filter(Boolean);

  // 1. Word hash projection
  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    let hash = 5381;
    for (let j = 0; j < word.length; j++) {
      hash = (hash * 33) ^ word.charCodeAt(j);
    }
    const idx = Math.abs(hash) % dimensions;
    vec[idx] += 1.0;
  }

  // 2. Character trigram projection for subword semantic similarity
  for (let i = 0; i <= normalized.length - 3; i++) {
    const gram = normalized.substring(i, i + 3);
    let hash = 2166136261;
    for (let j = 0; j < gram.length; j++) {
      hash = (hash ^ gram.charCodeAt(j)) * 16777619;
    }
    const idx = Math.abs(hash) % dimensions;
    vec[idx] += 0.5;
  }

  // 3. L2 Normalization to unit length
  let norm = 0;
  for (let i = 0; i < dimensions; i++) {
    norm += vec[i] * vec[i];
  }
  norm = Math.sqrt(norm);
  if (norm > 0) {
    for (let i = 0; i < dimensions; i++) {
      vec[i] /= norm;
    }
  }

  return Array.from(vec);
}

/**
 * Computes cosine similarity between two unit vectors
 */
export function computeCosineSimilarity(vecA: number[], vecB: number[]): number {
  if (!vecA || !vecB || vecA.length !== vecB.length) {
    return 0;
  }
  let dotProduct = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
  }
  return Math.max(0, Math.min(1, dotProduct));
}

export class ChatMemoryStore {
  memories: MemoryEntry[] = [];
  isAutoMemoryEnabled = true;

  constructor() {
    makeAutoObservable(this);
    makePersistable(this, {
      name: 'ChatMemoryStore',
      properties: ['memories', 'isAutoMemoryEnabled'],
      storage: AsyncStorage,
    });
  }

  setAutoMemoryEnabled(val: boolean) {
    this.isAutoMemoryEnabled = val;
  }

  /**
   * Add a new memory entry with embedding vector
   */
  addMemory(content: string, source: 'user' | 'assistant' = 'user'): MemoryEntry {
    const trimmed = content.trim();
    if (!trimmed) {
      throw new Error('Memory content cannot be empty');
    }

    // Check for duplicate
    const existing = this.memories.find(
      m => m.content.toLowerCase() === trimmed.toLowerCase(),
    );
    if (existing) {
      return existing;
    }

    const embedding = generateLocalEmbedding(trimmed);
    const newEntry: MemoryEntry = {
      id: uuidv4(),
      content: trimmed,
      source,
      createdAt: Date.now(),
      embedding,
    };

    runInAction(() => {
      this.memories.unshift(newEntry);
    });

    return newEntry;
  }

  updateMemory(id: string, newContent: string) {
    const trimmed = newContent.trim();
    if (!trimmed) {
      return;
    }

    const item = this.memories.find(m => m.id === id);
    if (item) {
      runInAction(() => {
        item.content = trimmed;
        item.embedding = generateLocalEmbedding(trimmed);
      });
    }
  }

  deleteMemory(id: string) {
    runInAction(() => {
      this.memories = this.memories.filter(m => m.id !== id);
    });
  }

  clearMemories() {
    runInAction(() => {
      this.memories = [];
    });
  }

  /**
   * Find memories most relevant to the user query using cosine similarity
   */
  searchMemories(query: string, limit = 5, minSimilarity = 0.15): MemoryEntry[] {
    if (!query || !query.trim() || this.memories.length === 0) {
      // If no query, return the most recent memories up to limit
      return this.memories.slice(0, limit);
    }

    const queryEmbedding = generateLocalEmbedding(query);

    const scored = this.memories.map(entry => {
      let similarity = 0;
      if (entry.embedding && entry.embedding.length === queryEmbedding.length) {
        similarity = computeCosineSimilarity(queryEmbedding, entry.embedding);
      } else {
        const entryEmb = generateLocalEmbedding(entry.content);
        similarity = computeCosineSimilarity(queryEmbedding, entryEmb);
      }
      return {entry, similarity};
    });

    // Sort descending by similarity
    scored.sort((a, b) => b.similarity - a.similarity);

    const results = scored
      .filter(item => item.similarity >= minSimilarity)
      .slice(0, limit)
      .map(item => item.entry);

    // Fallback: if similarity filter is too strict, return recent ones
    if (results.length === 0 && this.memories.length > 0) {
      return this.memories.slice(0, Math.min(limit, 3));
    }

    return results;
  }

  /**
   * Parse AI response for memory write tags like [MEMORY: user likes python]
   * Automatically adds them to memory if auto-memory is enabled
   */
  parseAndExtractMemoriesFromText(text: string): {
    cleanedText: string;
    extractedMemories: string[];
  } {
    if (!text) {
      return {cleanedText: text, extractedMemories: []};
    }

    const extracted: string[] = [];
    const memoryRegex = /\[(?:MEMORY|REMEMBER):\s*([^\]]+)\]/gi;

    let match: RegExpExecArray | null;
    while ((match = memoryRegex.exec(text)) !== null) {
      const fact = match[1].trim();
      if (fact.length > 3) {
        extracted.push(fact);
        if (this.isAutoMemoryEnabled) {
          try {
            this.addMemory(fact, 'assistant');
          } catch (e) {
            console.warn('Failed to auto-add memory:', e);
          }
        }
      }
    }

    // Clean out the memory tags from the visible text
    const cleaned = text.replace(memoryRegex, '').trim();

    return {
      cleanedText: cleaned,
      extractedMemories: extracted,
    };
  }

  /**
   * Builds the formatted memory context string to inject into normal chat
   */
  buildMemoryContext(currentQuery?: string): string {
    if (this.memories.length === 0) {
      return '';
    }

    const relevant = currentQuery
      ? this.searchMemories(currentQuery, 6)
      : this.memories.slice(0, 6);

    if (relevant.length === 0) {
      return '';
    }

    const facts = relevant.map(m => `- ${m.content}`).join('\n');
    return `<pocketpal_memories>\nRelevant past facts and preferences from previous chats:\n${facts}\n</pocketpal_memories>`;
  }
}

export const chatMemoryStore = new ChatMemoryStore();
