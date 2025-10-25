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
