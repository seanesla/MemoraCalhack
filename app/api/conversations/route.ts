import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@clerk/nextjs/server';

export async function GET(request: Request) {
  try {
    // Verify authentication
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // 1. Determine if user is a patient or caregiver
    let targetPatientId: string | null = null;

    // Check if user is a patient
    const patient = await prisma.patient.findUnique({
      where: { clerkId: userId },
    });

    if (patient) {
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

      // If caregiver, get patientId from query params
      const { searchParams } = new URL(request.url);
      const queryPatientId = searchParams.get('patientId');

      if (!queryPatientId) {
        return NextResponse.json(
          { error: 'patientId query parameter required for caregivers' },
          { status: 400 }
        );
      }

      targetPatientId = queryPatientId;
    }

    // 2. Get recent conversations with message counts
    const conversations = await prisma.conversation.findMany({
      where: {
        patientId: targetPatientId,
      },
      include: {
        _count: {
          select: { messages: true },
        },
      },
      orderBy: { lastMessageAt: 'desc' },
      take: 10, // Get last 10 conversations
    });

    return NextResponse.json({
      conversations: conversations.map((conv) => ({
        id: conv.id,
        title: conv.title || 'Untitled Conversation',
        startedAt: conv.startedAt.toISOString(),
        lastMessageAt: conv.lastMessageAt.toISOString(),
        messageCount: conv._count.messages,
      })),
    });
  } catch (error) {
    console.error('Error fetching conversations:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    // Verify authentication
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { patientId, message } = body;

    if (!patientId || !message) {
      return NextResponse.json(
        { error: 'patientId and message are required' },
        { status: 400 }
      );
    }

    // Verify patient exists and user has access
    const patient = await prisma.patient.findUnique({
      where: { id: patientId },
    });

    if (!patient) {
      return NextResponse.json(
        { error: 'Patient not found' },
        { status: 404 }
      );
    }

    // Allow patient to send messages to themselves, or caregiver
    const isDemoPatient = patient.clerkId === 'clerk_demo_patient_global';
    if (!isDemoPatient && userId !== patient.clerkId) {
      // Check if user is a caregiver
      const caregiver = await prisma.caregiver.findUnique({
        where: { clerkId: userId },
      });
      if (!caregiver) {
        return NextResponse.json(
          { error: 'Access denied' },
          { status: 403 }
        );
      }
    }

    // Create or get conversation
    let conversation = await prisma.conversation.findFirst({
      where: { patientId },
      orderBy: { lastMessageAt: 'desc' },
    });

    if (!conversation) {
      conversation = await prisma.conversation.create({
        data: {
          patientId,
          title: 'Voice Chat',
          startedAt: new Date(),
          lastMessageAt: new Date(),
        },
      });
    }

    // Create message
    const newMessage = await prisma.message.create({
      data: {
        conversationId: conversation.id,
        role: 'USER',
        content: message,
        timestamp: new Date(),
      },
    });

    // Update conversation's lastMessageAt
    await prisma.conversation.update({
      where: { id: conversation.id },
      data: { lastMessageAt: new Date() },
    });

    return NextResponse.json({
      message: {
        id: newMessage.id,
        conversationId: newMessage.conversationId,
        role: newMessage.role,
        content: newMessage.content,
        timestamp: newMessage.timestamp.toISOString(),
      },
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating message:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
