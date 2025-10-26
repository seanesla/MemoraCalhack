/**
 * Claude Haiku 4.5 Client Singleton
 *
 * Provides a single instance of the Anthropic Claude client
 * for real-time patient conversations.
 *
 * Model: claude-haiku-4-5-20251001
 * Use: Ultra-fast inference for voice interactions
 * Context Window: 200k tokens
 *
 * Architecture:
 * - Letta: Memory management (3-tier system + ChromaDB)
 * - Claude Haiku 4.5: Response generation (this client)
 *
 * Flow:
 * 1. Get Letta's Core Memory + relevant archival context
 * 2. Send to Claude with memory as system prompt
 * 3. Store response in Letta's archival memory
 */

import Anthropic from '@anthropic-ai/sdk';

const globalForClaude = globalThis as unknown as {
  claude: Anthropic | undefined;
};

/**
 * Initialize Claude client with Anthropic API credentials
 */
export const claude =
  globalForClaude.claude ??
  new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });

if (process.env.NODE_ENV !== 'production') {
  globalForClaude.claude = claude;
}

/**
 * Claude model to use for all conversations
 * Haiku 4.5: Ultra-fast, optimized for real-time voice
 */
export const CLAUDE_MODEL = 'claude-haiku-4-5-20251001';

/**
 * Generate a response using Claude Haiku 4.5
 *
 * @param systemPrompt - Letta's memory context (Core Memory + archival search)
 * @param userMessage - Patient's question/statement
 * @returns AI response text
 */
export async function generateResponse(
  systemPrompt: string,
  userMessage: string
): Promise<string> {
  try {
    const response = await claude.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 1024,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: userMessage,
        },
      ],
    });

    // Extract text from response
    const textContent = response.content.find((block) => block.type === 'text');
    if (!textContent || textContent.type !== 'text') {
      throw new Error('No text content in Claude response');
    }

    return textContent.text;
  } catch (error) {
    console.error('Claude API error:', error);
    throw error;
  }
}

/**
 * Build system prompt using Letta's memory context
 *
 * @param coreMemory - Letta's Core Memory (human, persona, patient_context)
 * @param relevantHistory - Recent/relevant conversations from archival memory
 * @returns System prompt for Claude
 */
export function buildSystemPrompt(
  coreMemory: {
    human: string;
    persona: string;
    patient_context: string;
  },
  relevantHistory: Array<{ role: string; content: string }> = []
): string {
  const historySection =
    relevantHistory.length > 0
      ? `\n\nRecent conversation context:\n${relevantHistory
          .map((msg) => `${msg.role}: ${msg.content}`)
          .join('\n')}`
      : '';

  return `${coreMemory.persona}

Patient Information:
${coreMemory.human}

${coreMemory.patient_context}${historySection}`;
}
