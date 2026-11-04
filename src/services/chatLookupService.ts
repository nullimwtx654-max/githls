import {chatSessionRepository} from '../repositories/ChatSessionRepository';
import {derivedText} from '../utils/chat';

export interface ChatSummaryItem {
  id: string;
  title: string;
  date: string;
  summary: string;
  messageCount: number;
}

// In-memory summary cache keyed by sessionId + updatedAt
const summaryCache = new Map<string, {updatedAt: number; summary: string}>();

/**
 * Generates a 1-paragraph summary from a list of session messages
 */
function summarizeSessionMessages(
  title: string,
  messages: Array<{author: {id: string}; text?: string; type: string}>,
): string {
  if (!messages || messages.length === 0) {
    return `Chat titled "${title}" with no recorded messages.`;
  }

  const userMessages = messages
    .filter(m => m.author.id === 'user' || m.author.id === '0' || m.type === 'text')
    .map(m => (m.text || '').trim())
    .filter(Boolean);

  const assistantMessages = messages
    .filter(m => m.author.id !== 'user' && m.author.id !== '0')
    .map(m => (m.text || '').trim())
    .filter(Boolean);

  const firstUserAsk = userMessages[0]
    ? userMessages[0].substring(0, 150).replace(/\s+/g, ' ')
    : title;

  const keyAssistantHighlights = assistantMessages[0]
    ? assistantMessages[0].substring(0, 150).replace(/\s+/g, ' ')
    : '';

  let summary = `In "${title}", the user inquired about: "${firstUserAsk}".`;
  if (keyAssistantHighlights) {
    summary += ` The discussion covered: "${keyAssistantHighlights}".`;
  }
  if (messages.length > 2) {
    summary += ` Follow-up exchanges expanded on these topics across ${messages.length} messages.`;
  }

  return summary;
}

/**
 * Lookup the last N normal chat sessions (default 35) and compile
 * a 1-paragraph summary for each. Strictly excludes PalsHub sessions.
 */
export async function getRecentChatsSummaries(
  count = 35,
): Promise<ChatSummaryItem[]> {
  try {
    const allSessions = await chatSessionRepository.getAllSessions();

    // Filter ONLY normal chat sessions (no activePalId)
    const normalSessions = allSessions.filter(s => !s.activePalId);

    // Sort newest first
    normalSessions.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));

    const selectedSessions = normalSessions.slice(0, count);

    const summaries: ChatSummaryItem[] = [];

    for (const session of selectedSessions) {
      const cached = summaryCache.get(session.id);
      if (cached && cached.updatedAt === session.updatedAt) {
        summaries.push({
          id: session.id,
          title: session.title,
          date: session.date,
          summary: cached.summary,
          messageCount: 0,
        });
        continue;
      }

      const full = await chatSessionRepository.getSessionById(session.id);
      if (!full) {
        continue;
      }

      const projectedMessages = full.messages.map(m => {
        const obj = m.toMessageObject();
        return {
          author: obj.author,
          text: derivedText(obj),
          type: obj.type,
        };
      });

      const summaryText = summarizeSessionMessages(session.title, projectedMessages);

      summaryCache.set(session.id, {
        updatedAt: session.updatedAt || Date.now(),
        summary: summaryText,
      });

      summaries.push({
        id: session.id,
        title: session.title,
        date: session.date,
        summary: summaryText,
        messageCount: projectedMessages.length,
      });
    }

    return summaries;
  } catch (error) {
    console.error('Error fetching recent chat summaries:', error);
    return [];
  }
}

/**
 * Builds the prompt injection block containing the last 35 chats summaries.
 * Strictly for normal chat only.
 */
export async function buildChatLookupPromptContext(
  count = 35,
): Promise<string> {
  const summaries = await getRecentChatsSummaries(count);
  if (summaries.length === 0) {
    return '';
  }

  const items = summaries
    .map((item, idx) => `${idx + 1}. [${item.date ? item.date.substring(0, 10) : 'Recent'}] ${item.summary}`)
    .join('\n');

  return `<past_chats_summary>\nHere is a 1-paragraph summary of the user's last ${summaries.length} chat sessions for cross-conversation context:\n${items}\n</past_chats_summary>`;
}
