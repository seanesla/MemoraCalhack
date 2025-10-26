/**
 * Get Messages for a Specific Conversation
 *
 * GET /api/conversations/[conversationId]/messages
 * Returns all messages in a conversation, ordered by timestamp
 *
 * Requires authentication - user must be the patient or a caregiver
 */

import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  try {
    // 1. Authenticate user
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized - must be logged in' },
        { status: 401 }
      );
    }

    const { conversationId } = await params;

    // 2. Get conversation and verify access
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        patient: true,
      },
    });

    if (!conversation) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      );
    }

    // 3. Verify user has access to this conversation
    // User must be the patient or a caregiver
    const isDemoPatient = conversation.patient.clerkId === 'clerk_demo_patient_global';
    const isPatient = userId === conversation.patient.clerkId;

    if (!isDemoPatient && !isPatient) {
      // Check if user is a caregiver
      const caregiver = await prisma.caregiver.findUnique({
        where: { clerkId: userId },
      });

      if (!caregiver) {
        return NextResponse.json(
          { error: 'Access denied - you do not have permission to view this conversation' },
          { status: 403 }
        );
      }
    }

    // 4. Fetch all messages for this conversation, ordered by timestamp
    const messages = await prisma.message.findMany({
      where: {
        conversationId,
      },
      orderBy: {
        timestamp: 'asc',
      },
    });

    // 5. Return conversation metadata and messages
    return NextResponse.json({
      conversation: {
        id: conversation.id,
        title: conversation.title || 'Untitled Conversation',
        startedAt: conversation.startedAt.toISOString(),
        lastMessageAt: conversation.lastMessageAt.toISOString(),
        endedAt: conversation.endedAt?.toISOString() || null,
        messageCount: messages.length,
      },
      messages: messages.map((msg) => ({
        id: msg.id,
        role: msg.role,
        content: msg.content,
        timestamp: msg.timestamp.toISOString(),
        edited: msg.edited,
        editedAt: msg.editedAt?.toISOString() || null,
      })),
    });
  } catch (error) {
    console.error('Error fetching conversation messages:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
