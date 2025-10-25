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
      const errorMessage = validation.error.errors?.[0]?.message || 'Invalid request body';
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

    // 7. Send message to Letta agent
    let lettaResponse;
    try {
      lettaResponse = await letta.agents.messages.create(
        targetPatient.lettaAgentId,
        {
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: message,
                },
              ],
            },
          ],
        }
      );
    } catch (lettaError) {
      console.error('Letta API error:', lettaError);
      return NextResponse.json(
        { error: 'Failed to communicate with AI agent' },
        { status: 500 }
      );
    }

    // 8. Extract assistant response from Letta
    // Letta returns a LettaResponse with messages array
    const allMessages = lettaResponse.messages || [];
    const assistantMessages = allMessages.filter(
      (msg: any) => msg.messageType === 'assistant_message'
    );

    if (assistantMessages.length === 0) {
      console.error('No assistant message in Letta response:', lettaResponse);
      return NextResponse.json(
        { error: 'AI agent did not provide a response' },
        { status: 500 }
      );
    }

    // Get the last assistant message (most recent response)
    const lastAssistantMessage = assistantMessages[assistantMessages.length - 1];

    // Letta returns content as a string, not an array
    const responseText = lastAssistantMessage.content || '';
    const lettaMessageId = lastAssistantMessage.id;

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

    // 10. Update conversation lastMessageAt
    await prisma.conversation.update({
      where: { id: conversation.id },
      data: { lastMessageAt: new Date() },
    });

    // 11. Return response
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
