/**
 * Conversation API
 *
 * POST /api/conversation
 * Sends message to patient's Letta agent and stores conversation history
 *
 * NO MOCKS - Real Letta API integration
 */

import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { letta } from '@/lib/letta';
import { z } from 'zod';

// Request validation schema
const conversationRequestSchema = z.object({
  message: z.string().min(1, 'Message cannot be empty'),
  conversationId: z.string().optional(),
  patientId: z.string().optional(), // For caregivers sending on behalf of patient
});

export async function POST(request: Request) {
  try {
    // 1. Authenticate user
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized - must be logged in' },
        { status: 401 }
      );
    }

    // 2. Parse and validate request body
    const body = await request.json();
    const validation = conversationRequestSchema.safeParse(body);

    if (!validation.success) {
      const errorMessage = validation.error.issues?.[0]?.message || 'Invalid request body';
      return NextResponse.json(
        { error: errorMessage },
        { status: 400 }
      );
    }

    const { message, conversationId, patientId } = validation.data;

    // 3. Determine if user is patient or caregiver
    let targetPatientId: string;
    let caregiverId: string | null = null;

    // Check if user is a patient
    const patient = await prisma.patient.findUnique({
      where: { clerkId: userId },
    });

    if (patient) {
      // User is patient - conversation is for themselves
      targetPatientId = patient.id;
    } else {
      // Check if user is a caregiver
      const caregiver = await prisma.caregiver.findUnique({
        where: { clerkId: userId },
      });

      if (!caregiver) {
        return NextResponse.json(
          { error: 'User not found - must complete onboarding' },
          { status: 404 }
        );
      }

      // User is caregiver - need patientId
      if (!patientId) {
        return NextResponse.json(
          { error: 'patientId required for caregiver conversations' },
          { status: 400 }
        );
      }

      targetPatientId = patientId;
      caregiverId = caregiver.id;
    }

    // 4. Get or create conversation
    let conversation;

    if (conversationId) {
      // Verify conversation exists and belongs to this patient
      conversation = await prisma.conversation.findUnique({
        where: { id: conversationId },
      });

      if (!conversation) {
        return NextResponse.json(
          { error: 'Conversation not found' },
          { status: 404 }
        );
      }

      if (conversation.patientId !== targetPatientId) {
        return NextResponse.json(
          { error: 'Conversation does not belong to this patient' },
          { status: 403 }
        );
      }
    } else {
      // Create new conversation
      conversation = await prisma.conversation.create({
        data: {
          patientId: targetPatientId,
          caregiverId,
          startedAt: new Date(),
          lastMessageAt: new Date(),
        },
      });
    }

    // 5. Get patient's Letta agent
    const targetPatient = await prisma.patient.findUnique({
      where: { id: targetPatientId },
    });

    if (!targetPatient?.lettaAgentId) {
      return NextResponse.json(
        { error: 'Patient does not have a Letta agent configured' },
        { status: 500 }
      );
    }

    // 6. Store user message in database FIRST
    const userMessage = await prisma.message.create({
      data: {
        conversationId: conversation.id,
        role: 'USER',
        content: message,
        timestamp: new Date(),
      },
    });

    // 7. Get Letta Core Memory for Claude's system prompt
    let coreMemory;
    try {
      const { getAgentCoreMemory } = await import('@/lib/letta');
      coreMemory = await getAgentCoreMemory(targetPatient.lettaAgentId);
    } catch (lettaError) {
      console.error('Letta: Failed to retrieve core memory:', lettaError);
      return NextResponse.json(
        { error: 'Failed to access patient memory' },
        { status: 500 }
      );
    }

    // 8. Search archival memory for relevant past conversations
    let relevantHistory: Array<{ role: string; content: string }> = [];
    try {
      const { searchArchival } = await import('@/lib/letta');
      const searchResults = await searchArchival(
        targetPatient.lettaAgentId,
        message,
        3  // Retrieve top 3 most relevant passages
      );

      // Convert Letta passages to conversation format for system prompt
      relevantHistory = searchResults.map(passage => ({
        role: 'memory',
        content: passage.text  // Contains "User: ... Assistant: ..." format
      }));

      console.log(
        `Retrieved ${relevantHistory.length} relevant passages from archival memory for context`
      );
    } catch (archivalError) {
      // Log but don't fail - archival search is optimization, not critical
      console.warn('Warning: Failed to retrieve archival context:', archivalError);
      // Continue with empty relevantHistory
    }

    // 9. Generate response using Claude Haiku 4.5 with enriched context
    let responseText: string;
    try {
      const { generateResponse, buildSystemPrompt } = await import('@/lib/claude');

      // Build system prompt with Core Memory + relevant past conversations
      const systemPrompt = buildSystemPrompt(coreMemory, relevantHistory);
      responseText = await generateResponse(systemPrompt, message);
    } catch (claudeError) {
      console.error('Claude API error:', claudeError);
      return NextResponse.json(
        { error: 'Failed to generate response' },
        { status: 500 }
      );
    }

    // Note: Letta message ID will be updated when we integrate
    // Letta archival memory storage in Phase 11.2
    const lettaMessageId = undefined;

    // 9. Store assistant response in database
    await prisma.message.create({
      data: {
        conversationId: conversation.id,
        role: 'ASSISTANT',
        content: responseText,
        timestamp: new Date(),
        lettaMessageId,
      },
    });

    // 10. Store conversation in Letta's archival memory (ChromaDB via passages)
    // This enables semantic search over past conversations for future responses
    try {
      const { insertArchival } = await import('@/lib/letta');
      await insertArchival(
        targetPatient.lettaAgentId,
        message,
        responseText
      );
    } catch (archivalError) {
      // Log archival errors but don't block response - patient gets their response
      console.warn('Warning: Failed to store in archival memory:', archivalError);
      // Continue - archival is optimization for future responses, not critical to current response
    }

    // 11. Update conversation lastMessageAt
    await prisma.conversation.update({
      where: { id: conversation.id },
      data: { lastMessageAt: new Date() },
    });

    // 12. Return response
    return NextResponse.json({
      conversationId: conversation.id,
      response: responseText,
    });
  } catch (error) {
    console.error('Conversation API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
