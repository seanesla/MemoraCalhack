import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { LettaClient } from '@letta-ai/letta-client';

/**
 * Letta Agent Integration Tests (REAL API)
 *
 * These tests use the REAL Letta API - no mocks!
 * We create actual agents and verify the integration works.
 *
 * IMPORTANT: Tests create real agents on Letta's servers.
 * Cleanup happens in afterAll to avoid leaving orphaned agents.
 */

describe('Letta Agent Integration Tests', () => {
  let client: LettaClient;
  const createdAgentIds: string[] = [];

  beforeAll(() => {
    // Initialize Letta client with real API credentials
    const token = process.env.LETTA_API_KEY;
    const baseUrl = process.env.LETTA_BASE_URL || 'https://api.letta.com';

    if (!token) {
      throw new Error('LETTA_API_KEY environment variable is required for integration tests');
    }

    client = new LettaClient({
      baseUrl,
      token,  // Correct parameter name for TypeScript SDK
    });
  });

  afterAll(async () => {
    // Cleanup: Delete all agents created during tests
    console.log(`Cleaning up ${createdAgentIds.length} test agents...`);

    for (const agentId of createdAgentIds) {
      try {
        await client.agents.delete(agentId);
        console.log(`✓ Deleted agent: ${agentId}`);
      } catch (error) {
        console.warn(`Failed to delete agent ${agentId}:`, error);
      }
    }
  });

  describe('Agent Creation', () => {
    it('should create a Letta agent with basic memory blocks', async () => {
      // Arrange: Prepare memory blocks for a patient
      const agentName = `test-patient-${Date.now()}`;

      // Act: Create agent with Letta API
      const agent = await client.agents.create({
        name: agentName,
        memoryBlocks: [
          {
            label: 'human',
            value: 'Name: John Smith\nAge: 72\nDiagnosis: Early-stage Alzheimer\'s\nLocation: Palo Alto, CA',
          },
          {
            label: 'persona',
            value: 'You are a warm, patient, and reassuring AI companion for John. ' +
                   'Your role is to provide supportive conversation, help with memory recall, ' +
                   'and offer gentle orientation cues. Always be respectful and encouraging.',
          },
        ],
        model: 'letta/letta-free', // Use Letta's free model for testing
        embedding: 'letta/letta-free',
      });

      // Track for cleanup
      createdAgentIds.push(agent.id);

      // Assert: Verify agent was created successfully
      expect(agent).toBeDefined();
      expect(agent.id).toBeDefined();
      expect(agent.name).toBe(agentName);
    });

    it('should create agent with custom patient_context memory block', async () => {
      // Arrange: Create agent with 3 memory blocks
      const agentName = `test-patient-custom-${Date.now()}`;

      // Act: Create agent with custom context block
      const agent = await client.agents.create({
        name: agentName,
        memoryBlocks: [
          {
            label: 'human',
            value: 'Name: Jane Doe\nAge: 68',
          },
          {
            label: 'persona',
            value: 'You are a supportive AI companion.',
          },
          {
            label: 'patient_context',
            value: 'Current routine focus: Morning medication reminders\nLast check-in: 2025-10-25',
            description: 'Stores current care routine, focus areas, and recent activity for personalized support',
          },
        ],
        model: 'letta/letta-free',
        embedding: 'letta/letta-free',
      });

      createdAgentIds.push(agent.id);

      // Assert: Agent created with custom blocks
      expect(agent).toBeDefined();
      expect(agent.id).toBeDefined();
      expect(agent.name).toBe(agentName);
    });

    it('should retrieve agent by ID after creation', async () => {
      // Arrange: Create an agent
      const agentName = `test-retrieve-${Date.now()}`;
      const createdAgent = await client.agents.create({
        name: agentName,
        memoryBlocks: [
          { label: 'human', value: 'Test user' },
          { label: 'persona', value: 'Test persona' },
        ],
        model: 'letta/letta-free',
        embedding: 'letta/letta-free',
      });

      createdAgentIds.push(createdAgent.id);

      // Act: Retrieve agent by ID
      const retrievedAgent = await client.agents.retrieve(createdAgent.id);

      // Assert: Verify retrieved agent matches created agent
      expect(retrievedAgent).toBeDefined();
      expect(retrievedAgent.id).toBe(createdAgent.id);
      expect(retrievedAgent.name).toBe(agentName);
    });

    it('should create agent with only required fields', async () => {
      // Act: Create agent with minimal configuration
      const agent = await client.agents.create({
        memoryBlocks: [
          { label: 'human', value: 'Minimal user info' },
          { label: 'persona', value: 'Minimal persona' },
        ],
        model: 'letta/letta-free',
        embedding: 'letta/letta-free',
      });

      createdAgentIds.push(agent.id);

      // Assert: Agent created without name
      expect(agent).toBeDefined();
      expect(agent.id).toBeDefined();
    });

    it('should delete an agent', async () => {
      // Arrange: Create an agent
      const agent = await client.agents.create({
        name: `test-delete-${Date.now()}`,
        memoryBlocks: [
          { label: 'human', value: 'Delete test' },
          { label: 'persona', value: 'Delete test persona' },
        ],
        model: 'letta/letta-free',
        embedding: 'letta/letta-free',
      });

      // Act: Delete the agent
      await client.agents.delete(agent.id);

      // Assert: Agent should not be retrievable
      await expect(
        client.agents.retrieve(agent.id)
      ).rejects.toThrow();

      // Note: Don't add to cleanup list since we already deleted it
    });
  });

  describe('Core Memory Operations', () => {
    let testAgentId: string;

    beforeAll(async () => {
      // Create a test agent for memory operations
      const agent = await client.agents.create({
        name: `test-memory-ops-${Date.now()}`,
        memoryBlocks: [
          { label: 'human', value: 'Name: Test Patient' },
          { label: 'persona', value: 'Test persona' },
        ],
        model: 'letta/letta-free',
        embedding: 'letta/letta-free',
      });

      testAgentId = agent.id;
      createdAgentIds.push(agent.id);
    });

    it('should retrieve core memory', async () => {
      // Act: Retrieve core memory
      const memory = await client.agents.coreMemory.retrieve(testAgentId);

      // Assert: Memory exists with blocks
      expect(memory).toBeDefined();
      expect(memory.blocks).toBeDefined();
      expect(memory.blocks.length).toBeGreaterThan(0);
    });
  });

  describe('Error Handling', () => {
    it('should throw error when retrieving non-existent agent', async () => {
      // Act & Assert: Attempt to retrieve non-existent agent
      await expect(
        client.agents.retrieve('non_existent_agent_id_12345')
      ).rejects.toThrow();
    });
  });
});
