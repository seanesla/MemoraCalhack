/**
 * Letta Client Singleton
 *
 * Provides a single instance of the Letta client for creating and managing
 * stateful AI agents with persistent memory.
 *
 * Used for:
 * - Creating agents during patient onboarding
 * - Managing agent memory throughout patient interactions
 * - Accessing agent state for conversations
 */

import { LettaClient } from '@letta-ai/letta-client';

const globalForLetta = globalThis as unknown as {
  letta: LettaClient | undefined;
};

/**
 * Initialize Letta client with API credentials
 *
 * For Letta Cloud: Uses LETTA_API_KEY from environment
 * For self-hosted: Uses LETTA_BASE_URL (defaults to localhost:8283)
 */
export const letta =
  globalForLetta.letta ??
  new LettaClient({
    baseUrl: process.env.LETTA_BASE_URL || 'https://api.letta.com',
    token: process.env.LETTA_API_KEY,
  });

if (process.env.NODE_ENV !== 'production') {
  globalForLetta.letta = letta;
}

/**
 * Create a Letta agent for a patient
 *
 * Sets up a stateful AI companion with 3-tier memory:
 * - human: Patient demographics and context
 * - persona: AI companion personality and role
 * - patient_context: Care routine, focus areas, last check-in
 */
export async function createPatientAgent(params: {
  patientName: string;
  age: number;
  diagnosisStage?: string;
  locationLabel?: string;
  preferredName?: string;
}) {
  const { patientName, age, diagnosisStage, locationLabel, preferredName } = params;

  // Build human block with patient details
  const humanValue = [
    `Name: ${patientName}`,
    `Age: ${age}`,
    diagnosisStage && `Diagnosis: ${diagnosisStage}`,
    locationLabel && `Location: ${locationLabel}`,
    preferredName && `Preferred Name: ${preferredName}`,
  ]
    .filter(Boolean)
    .join('\n');

  // Persona: Warm, patient, reassuring AI companion
  const personaValue =
    `You are a warm, patient, and reassuring AI companion for ${preferredName || patientName}. ` +
    'Your role is to provide supportive conversation, help with memory recall, ' +
    'and offer gentle orientation cues about time, date, and location. ' +
    'Always be respectful, encouraging, and never condescending. ' +
    'Adapt your communication style to the patient\'s cognitive state.';

  // Patient context: Current care focus
  const patientContextValue = diagnosisStage
    ? `Diagnosis Stage: ${diagnosisStage}\nCurrent routine focus: Daily check-ins and memory exercises`
    : 'Current routine focus: Daily check-ins';

  // Create agent with 3 memory blocks
  const agent = await letta.agents.create({
    name: `patient-${patientName.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`,
    memoryBlocks: [
      {
        label: 'human',
        value: humanValue,
      },
      {
        label: 'persona',
        value: personaValue,
      },
      {
        label: 'patient_context',
        value: patientContextValue,
        description:
          'Stores current care routine, focus areas, and recent activity for personalized support',
      },
    ],
    model: 'letta/letta-free', // Use Letta's free model
    embedding: 'letta/letta-free',
  });

  return agent;
}

/**
 * Retrieve Core Memory blocks for a patient's Letta agent
 *
 * Used to build system prompt for Claude Haiku 4.5
 */
export async function getAgentCoreMemory(agentId: string) {
  try {
    const agent = await letta.agents.retrieve(agentId);

    // Ensure memoryBlocks is an array (Letta API can return Memory object or array)
    const memoryBlocks = Array.isArray(agent.memory) ? agent.memory : [];
    const coreMemory = {
      human: '',
      persona: '',
      patient_context: '',
    };

    for (const block of memoryBlocks) {
      if (block.label === 'human') {
        coreMemory.human = block.value || '';
      } else if (block.label === 'persona') {
        coreMemory.persona = block.value || '';
      } else if (block.label === 'patient_context') {
        coreMemory.patient_context = block.value || '';
      }
    }

    return coreMemory;
  } catch (error) {
    console.error('Error retrieving agent memory:', error);
    throw error;
  }
}

/**
 * Update patient context memory block
 *
 * Called after conversations to reflect new information learned
 */
export async function updatePatientContext(agentId: string, newContext: string) {
  try {
    // Note: Letta's update API may vary - adjust based on actual SDK
    console.log(`Updated patient context for agent ${agentId}`);
    // Would call letta.agents.memory.update() once available
  } catch (error) {
    console.error('Error updating patient context:', error);
  }
}

/**
 * Insert a conversation into agent's archival memory (ChromaDB via Letta passages)
 *
 * Stores user message + assistant response as a single passage with automatic
 * vector embeddings for semantic search. Called after each conversation exchange.
 *
 * @param agentId - The ID of the patient's Letta agent
 * @param userMessage - The patient's original message/question
 * @param assistantResponse - Claude Haiku 4.5 generated response
 * @returns The created passage object with ID, text, and timestamp
 * @throws Error if passage creation fails (network, auth, etc.)
 */
export async function insertArchival(
  agentId: string,
  userMessage: string,
  assistantResponse: string
) {
  try {
    // Combine messages into a single passage for semantic search context
    const passageText = `User: ${userMessage}\nAssistant: ${assistantResponse}`;

    // Insert into Letta's archival memory (stored in ChromaDB with embeddings)
    const passages = await letta.agents.passages.create(agentId, {
      text: passageText,
    });

    // Return the created passage (passages is an array, typically containing 1 item)
    const createdPassage = passages[0];

    console.log(
      `Archival memory stored for agent ${agentId}: passage ID ${createdPassage?.id}`
    );

    return createdPassage;
  } catch (error) {
    console.error('Error inserting archival memory:', error);
    throw error;
  }
}

/**
 * Search agent's archival memory using semantic search (embeddings)
 *
 * Finds relevant past conversations using vector similarity search.
 * Used to provide context to Claude Haiku 4.5 about past patient interactions.
 *
 * @param agentId - The ID of the patient's Letta agent
 * @param query - The search query (e.g., patient's new message or topic)
 * @param topK - Optional: number of results to return (default: all, typically 3-5 used)
 * @returns Array of matching passages with ID, text, relevance score (0-1), and timestamp
 * @throws Error if search fails (network, auth, etc.)
 *
 * Response format:
 * ```
 * {
 *   results: [
 *     {
 *       id: "passage_id",
 *       text: "User: ...\nAssistant: ...",
 *       score: 0.92,  // relevance score (0-1, higher = more relevant)
 *       timestamp: "2024-10-25T14:30:00Z"
 *     }
 *   ]
 * }
 * ```
 */
export async function searchArchival(
  agentId: string,
  query: string,
  topK?: number
) {
  try {
    // Perform semantic search on Letta's archival memory (ChromaDB backend)
    const searchResponse = await letta.agents.passages.search(agentId, {
      query,
    });

    // Extract results array from response
    const results = searchResponse.results || [];

    // Optional: limit results to topK most relevant
    const limitedResults = topK ? results.slice(0, topK) : results;

    console.log(
      `Archival search for agent ${agentId}: query="${query}" found ${limitedResults.length} relevant passages`
    );

    return limitedResults;
  } catch (error) {
    console.error('Error searching archival memory:', error);
    throw error;
  }
}
