/**
 * Conversation API Tests
 *
 * Tests the POST /api/conversation endpoint that:
 * 1. Sends message to patient's Letta agent
 * 2. Stores conversation and messages in database
 * 3. Returns agent response
 *
 * NO MOCKS - Uses real Letta API and database
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { POST } from '@/app/api/conversation/route';
import { prisma } from '@/lib/prisma';
import { letta } from '@/lib/letta';
import { auth } from '@clerk/nextjs/server';

// Mock auth to return test clerk ID
vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn(() => Promise.resolve({ userId: 'clerk_conversation_test' })),
}));

describe('Conversation API Tests', () => {
  let testPatientId: string;
  let testLettaAgentId: string;

  beforeEach(async () => {
    // Clean up any existing test data
    await prisma.message.deleteMany({
      where: {
        conversation: {
          patient: { clerkId: 'clerk_conversation_test' },
        },
      },
    });
    await prisma.conversation.deleteMany({
      where: { patient: { clerkId: 'clerk_conversation_test' } },
    });
    await prisma.patient.deleteMany({
      where: { clerkId: 'clerk_conversation_test' },
    });
    await prisma.caregiver.deleteMany({
      where: {
        clerkId: {
          in: ['clerk_conversation_test', 'clerk_caregiver_test']
        }
      },
    });

    // Create test patient with Letta agent
    const agent = await letta.agents.create({
      name: 'Test Conversation Patient',
      memory_blocks: [
        { label: 'human', value: 'Test patient for conversation API', limit: 2000 },
        { label: 'persona', value: 'Supportive AI companion', limit: 2000 },
      ],
    });

    testLettaAgentId = agent.id;

    const patient = await prisma.patient.create({
      data: {
        clerkId: 'clerk_conversation_test',
        name: 'Test Conversation Patient',
        age: 70,
        lettaAgentId: agent.id,
      },
    });

    testPatientId = patient.id;
  });

  describe('POST /api/conversation - Message Sending', () => {
    it('should create conversation on first message', async () => {
      const request = new Request('http://localhost:3000/api/conversation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'Hello, how are you today?',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('conversationId');
      expect(data).toHaveProperty('response');
      expect(data.response).toBeTruthy();

      // Verify conversation created in database
      const conversation = await prisma.conversation.findUnique({
        where: { id: data.conversationId },
      });
      expect(conversation).toBeTruthy();
      expect(conversation?.patientId).toBe(testPatientId);

      // Verify user message stored
      const userMessage = await prisma.message.findFirst({
        where: {
          conversationId: data.conversationId,
          role: 'USER',
        },
      });
      expect(userMessage).toBeTruthy();
      expect(userMessage?.content).toBe('Hello, how are you today?');

      // Verify assistant message stored
      const assistantMessage = await prisma.message.findFirst({
        where: {
          conversationId: data.conversationId,
          role: 'ASSISTANT',
        },
      });
      expect(assistantMessage).toBeTruthy();
      expect(assistantMessage?.content).toBe(data.response);
      expect(assistantMessage?.lettaMessageId).toBeTruthy();
    });

    it('should add message to existing conversation', async () => {
      // Create initial conversation
      const conversation = await prisma.conversation.create({
        data: {
          patientId: testPatientId,
          startedAt: new Date(),
          lastMessageAt: new Date(),
        },
      });

      const request = new Request('http://localhost:3000/api/conversation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId: conversation.id,
          message: 'What day is it today?',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.conversationId).toBe(conversation.id);
      expect(data.response).toBeTruthy();

      // Verify messages added to same conversation
      const messages = await prisma.message.findMany({
        where: { conversationId: conversation.id },
        orderBy: { timestamp: 'asc' },
      });

      expect(messages.length).toBe(2); // User + assistant
      expect(messages[0].role).toBe('USER');
      expect(messages[0].content).toBe('What day is it today?');
      expect(messages[1].role).toBe('ASSISTANT');
    });

    it('should send message to Letta agent and get response', async () => {
      const request = new Request('http://localhost:3000/api/conversation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'Tell me a short fact about elephants.',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.response).toBeTruthy();
      expect(typeof data.response).toBe('string');
      expect(data.response.length).toBeGreaterThan(0);

      // Verify Letta message ID stored
      const assistantMessage = await prisma.message.findFirst({
        where: {
          conversationId: data.conversationId,
          role: 'ASSISTANT',
        },
      });
      expect(assistantMessage?.lettaMessageId).toBeTruthy();
      expect(assistantMessage?.lettaMessageId?.startsWith('message-')).toBe(true);
    });

    it('should update conversation lastMessageAt timestamp', async () => {
      const conversation = await prisma.conversation.create({
        data: {
          patientId: testPatientId,
          startedAt: new Date('2024-10-24'),
          lastMessageAt: new Date('2024-10-24'),
        },
      });

      const beforeTime = new Date();

      const request = new Request('http://localhost:3000/api/conversation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId: conversation.id,
          message: 'Hi there!',
        }),
      });

      await POST(request);

      const updatedConversation = await prisma.conversation.findUnique({
        where: { id: conversation.id },
      });

      expect(updatedConversation?.lastMessageAt.getTime()).toBeGreaterThanOrEqual(beforeTime.getTime());
    });
  });

  describe('POST /api/conversation - Validation & Error Handling', () => {
    it('should reject empty message', async () => {
      const request = new Request('http://localhost:3000/api/conversation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: '',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBeTruthy();
    });

    it('should reject missing message field', async () => {
      const request = new Request('http://localhost:3000/api/conversation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBeTruthy();
    });

    it('should reject invalid conversationId', async () => {
      const request = new Request('http://localhost:3000/api/conversation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId: 'nonexistent_conversation_id',
          message: 'Hello',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toContain('Conversation not found');
    });

    it('should handle patient without Letta agent', async () => {
      // Create patient without Letta agent
      await prisma.patient.update({
        where: { id: testPatientId },
        data: { lettaAgentId: null },
      });

      const request = new Request('http://localhost:3000/api/conversation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'Hello',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toContain('Letta agent');
    });
  });

  describe('POST /api/conversation - Caregiver Support', () => {
    it('should allow caregiver to send message on behalf of patient', async () => {
      // Override auth mock for this test to use caregiver clerkId
      vi.mocked(auth).mockResolvedValueOnce({ userId: 'clerk_caregiver_test' } as any);

      // Create caregiver with different clerkId
      const caregiver = await prisma.caregiver.create({
        data: {
          clerkId: 'clerk_caregiver_test',
          name: 'Test Caregiver',
        },
      });

      const request = new Request('http://localhost:3000/api/conversation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId: testPatientId,
          message: 'How is the patient feeling?',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.response).toBeTruthy();

      // Verify conversation linked to both patient and caregiver
      const conversation = await prisma.conversation.findUnique({
        where: { id: data.conversationId },
      });
      expect(conversation?.patientId).toBe(testPatientId);
      expect(conversation?.caregiverId).toBe(caregiver.id);
    });
  });
});
