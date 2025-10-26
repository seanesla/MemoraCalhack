/**
 * Groq Kimi K2 Client Singleton
 *
 * Provides a single instance of the Groq client for deep behavioral
 * analysis of patient conversation history.
 *
 * Model: moonshotai/kimi-k2-instruct
 * Use: Deep conversation analysis for behavioral insights
 * Context Window: 280k tokens (~70,000 words of conversation history)
 *
 * Architecture:
 * - Claude Haiku 4.5: Real-time conversation responses (fast, 200k context)
 * - Letta: Memory management (3-tier system + ChromaDB)
 * - Groq Kimi K2: Behavioral insights analysis (this client, 280k context)
 *
 * Flow:
 * 1. Fetch patient's conversation history from Supabase
 * 2. Send full context (up to 280k tokens) to Kimi K2
 * 3. Parse structured insights (mood, concerns, patterns, recommendations)
 * 4. Store in PatientInsights table for dashboard display
 */

import Groq from 'groq-sdk';

const globalForGroq = globalThis as unknown as {
  groq: Groq | undefined;
};

/**
 * Initialize Groq client with API credentials
 */
export const groq =
  globalForGroq.groq ??
  new Groq({
    apiKey: process.env.GROQ_API_KEY,
  });

if (process.env.NODE_ENV !== 'production') {
  globalForGroq.groq = groq;
}

/**
 * Groq model to use for behavioral analysis
 * Kimi K2: 280k context window, optimized for deep reasoning
 */
export const GROQ_MODEL = process.env.GROQ_MODEL || 'moonshotai/kimi-k2-instruct';

/**
 * Conversation message format for analysis
 */
export interface ConversationMessage {
  role: 'USER' | 'ASSISTANT' | 'SYSTEM';
  content: string;
  timestamp: Date;
}

/**
 * Structured insights output from Groq analysis
 */
export interface BehavioralInsights {
  mood: 'positive' | 'neutral' | 'concerned' | 'unknown';
  streakDays: number;
  concerns: string[];
  positiveMoments: string[];
  memoryTopicsToReinforce: string[];
  frequentQuestions: Array<{
    question: string;
    count: number;
  }>;
  behavioralTrends: string[];
  recommendations: string[];
}

/**
 * Analyze patient conversation history using Groq Kimi K2
 *
 * Takes full conversation history and generates structured behavioral insights
 * including mood analysis, pattern detection, and caregiver recommendations.
 *
 * @param messages - Array of conversation messages with roles and timestamps
 * @param patientName - Patient's preferred name for personalized analysis
 * @param analysisContext - Optional additional context (age, diagnosis stage, etc.)
 * @returns Structured behavioral insights object
 */
export async function analyzeConversationHistory(
  messages: ConversationMessage[],
  patientName: string,
  analysisContext?: {
    age?: number;
    diagnosisStage?: string;
    currentRoutineFocus?: string;
  }
): Promise<BehavioralInsights> {
  try {
    // Build conversation context for Kimi K2
    const conversationText = messages
      .map((msg) => {
        const timestamp = msg.timestamp.toISOString().split('T')[0]; // YYYY-MM-DD
        const role = msg.role === 'USER' ? `${patientName}` : 'Assistant';
        return `[${timestamp}] ${role}: ${msg.content}`;
      })
      .join('\n\n');

    // Build context section
    const contextSection = analysisContext
      ? `
Patient Context:
- Name: ${patientName}
${analysisContext.age ? `- Age: ${analysisContext.age}` : ''}
${analysisContext.diagnosisStage ? `- Diagnosis Stage: ${analysisContext.diagnosisStage}` : ''}
${analysisContext.currentRoutineFocus ? `- Current Focus: ${analysisContext.currentRoutineFocus}` : ''}
`
      : `Patient Name: ${patientName}`;

    // System prompt for structured analysis
    const systemPrompt = `You are an expert behavioral analyst specializing in dementia care. Analyze the following conversation history and provide structured insights for the caregiver.

${contextSection}

Your analysis MUST be returned as valid JSON with the following exact structure:

{
  "mood": "positive" | "neutral" | "concerned" | "unknown",
  "streakDays": <number of consecutive days patient engaged positively>,
  "concerns": [<array of concerning patterns or behaviors as strings>],
  "positiveMoments": [<array of positive observations as strings>],
  "memoryTopicsToReinforce": [<array of topics patient shows interest in as strings>],
  "frequentQuestions": [{"question": "<string>", "count": <number>}],
  "behavioralTrends": [<array of long-form analysis paragraphs as strings>],
  "recommendations": [<array of actionable caregiver guidance as strings>]
}

Guidelines:
- Be compassionate and strength-based in your analysis
- Focus on patterns, not isolated incidents
- Provide actionable, specific recommendations
- Note both challenges AND positive moments
- If data is limited, use "unknown" for mood and provide fewer insights
- Use the patient's preferred name (${patientName}) in observations

IMPORTANT: Return ONLY valid JSON. No explanatory text before or after.`;

    // Call Groq Kimi K2 with full conversation context
    const response = await groq.chat.completions.create({
      model: GROQ_MODEL,
      messages: [
        {
          role: 'system',
          content: systemPrompt,
        },
        {
          role: 'user',
          content: `Analyze these conversations:\n\n${conversationText}`,
        },
      ],
      temperature: 0.3, // Lower temperature for more consistent structured output
      max_tokens: 4000, // Allow comprehensive analysis
    });

    // Extract response text
    const responseText = response.choices[0]?.message?.content;
    if (!responseText) {
      throw new Error('Empty response from Groq Kimi K2');
    }

    // Parse JSON response
    let insights: BehavioralInsights;
    try {
      // Handle potential code block wrapping (```json ... ```)
      const jsonMatch = responseText.match(/```json\s*([\s\S]*?)\s*```/);
      const jsonText = jsonMatch ? jsonMatch[1] : responseText;
      insights = JSON.parse(jsonText.trim());
    } catch (parseError) {
      console.error('Groq JSON parse error:', parseError);
      console.error('Response text:', responseText);
      throw new Error('Failed to parse Groq response as JSON');
    }

    // Validate structure
    if (!insights.mood || !Array.isArray(insights.concerns)) {
      console.warn('Groq returned incomplete insights structure:', insights);
    }

    return insights;
  } catch (error) {
    console.error('Groq Kimi K2 analysis error:', error);
    throw error;
  }
}

/**
 * Generate a summary of behavioral patterns for dashboard display
 *
 * Alternative to full analysis - generates human-readable summary
 * without strict JSON structure requirements.
 *
 * @param messages - Array of conversation messages
 * @param patientName - Patient's preferred name
 * @returns Free-form text summary
 */
export async function generateBehavioralSummary(
  messages: ConversationMessage[],
  patientName: string
): Promise<string> {
  try {
    const conversationText = messages
      .map((msg) => {
        const timestamp = msg.timestamp.toISOString().split('T')[0];
        const role = msg.role === 'USER' ? `${patientName}` : 'Assistant';
        return `[${timestamp}] ${role}: ${msg.content}`;
      })
      .join('\n\n');

    const response = await groq.chat.completions.create({
      model: GROQ_MODEL,
      messages: [
        {
          role: 'system',
          content: `You are a compassionate behavioral analyst for dementia care. Provide a brief, caring summary of ${patientName}'s conversation patterns, noting both strengths and areas where support may help. Keep it under 200 words.`,
        },
        {
          role: 'user',
          content: `Summarize these conversations:\n\n${conversationText}`,
        },
      ],
      temperature: 0.5,
      max_tokens: 500,
    });

    return response.choices[0]?.message?.content || 'No summary available.';
  } catch (error) {
    console.error('Groq summary generation error:', error);
    throw error;
  }
}
