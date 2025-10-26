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

    // Get the patientId from query params or find patient/caregiver
    const { searchParams } = new URL(request.url);
    const patientId = searchParams.get('patientId');

    if (!patientId) {
      return NextResponse.json(
        { error: 'patientId query parameter is required' },
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

    // For demo mode, allow access to demo patient
    // Otherwise verify user is the patient or a caregiver
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

    // Get recent conversations with messages
    const conversations = await prisma.conversation.findMany({
      where: {
        patientId,
      },
      include: {
        messages: {
          orderBy: { timestamp: 'desc' },
          take: 1, // Only get the most recent message for memory moments
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
        messages: conv.messages.map((msg) => ({
          id: msg.id,
          role: msg.role,
          content: msg.content,
          timestamp: msg.timestamp.toISOString(),
        })),
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
