/**
 * Patient Insights Analysis API - Groq Kimi K2 Integration
 *
 * POST /api/patients/[id]/insights/analyze
 *
 * Analyzes patient conversation history using Groq Kimi K2 (280k context)
 * and generates structured behavioral insights for caregivers.
 *
 * Flow:
 * 1. Fetch patient's conversation history (configurable lookback period)
 * 2. Send full context to Groq Kimi K2 for deep analysis
 * 3. Parse structured insights (mood, patterns, recommendations)
 * 4. Upsert PatientInsights record in Supabase
 * 5. Return insights JSON to caller
 */

import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { verifyPatientAccess } from '@/lib/auth-helpers';
import { analyzeConversationHistory, type ConversationMessage } from '@/lib/groq';
import { z } from 'zod';

// Request validation schema
const analyzeRequestSchema = z.object({
  lookbackDays: z.number().min(1).max(90).optional().default(30),
  forceRefresh: z.boolean().optional().default(false),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
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

    const patientId = (await params).id;

    // 2. Verify patient access (user must be caregiver for this patient)
    const access = await verifyPatientAccess(userId, patientId);
    if (!access.authorized) {
      return NextResponse.json(
        { error: access.reason || 'Access denied' },
        { status: access.patient ? 403 : 404 }
      );
    }

    // 3. Parse and validate request body
    const body = await request.json().catch(() => ({}));
    const validation = analyzeRequestSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0]?.message || 'Invalid request' },
        { status: 400 }
      );
    }

    const { lookbackDays, forceRefresh } = validation.data;

    // 4. Check if recent analysis exists (skip if forceRefresh)
    if (!forceRefresh) {
      const existingInsights = await prisma.patientInsights.findUnique({
        where: { patientId },
        select: { analysisTimestamp: true },
      });

      if (existingInsights?.analysisTimestamp) {
        const hoursSinceAnalysis =
          (Date.now() - new Date(existingInsights.analysisTimestamp).getTime()) /
          (1000 * 60 * 60);

        // Return cached insights if analyzed within last 6 hours
        if (hoursSinceAnalysis < 6) {
          return NextResponse.json({
            message: 'Using recent analysis (less than 6 hours old)',
            analysisTimestamp: existingInsights.analysisTimestamp,
            cached: true,
          });
        }
      }
    }

    // 5. Fetch patient details
    const patient = await prisma.patient.findUnique({
      where: { id: patientId },
      select: {
        name: true,
        preferredName: true,
        age: true,
        diagnosisStage: true,
        currentRoutineFocus: true,
      },
    });

    if (!patient) {
      return NextResponse.json(
        { error: 'Patient not found' },
        { status: 404 }
      );
    }

    // 6. Fetch conversation history within lookback period
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - lookbackDays);

    const conversations = await prisma.conversation.findMany({
      where: {
        patientId,
        startedAt: {
          gte: cutoffDate,
        },
      },
      include: {
        messages: {
          orderBy: { timestamp: 'asc' },
          select: {
            role: true,
            content: true,
            timestamp: true,
          },
        },
      },
      orderBy: { startedAt: 'asc' },
    });

    // 7. Flatten all messages into single array
    const allMessages: ConversationMessage[] = conversations.flatMap((conv) =>
      conv.messages.map((msg) => ({
        role: msg.role,
        content: msg.content,
        timestamp: msg.timestamp,
      }))
    );

    if (allMessages.length === 0) {
      return NextResponse.json(
        {
          error: 'No conversation history found',
          message: `No conversations in the last ${lookbackDays} days`,
        },
        { status: 404 }
      );
    }

    console.log(
      `Analyzing ${allMessages.length} messages from ${conversations.length} conversations (${lookbackDays} day lookback)`
    );

    // 8. Call Groq Kimi K2 for deep analysis
    let insights;
    try {
      insights = await analyzeConversationHistory(
        allMessages,
        patient.preferredName || patient.name,
        {
          age: patient.age || undefined,
          diagnosisStage: patient.diagnosisStage || undefined,
          currentRoutineFocus: patient.currentRoutineFocus || undefined,
        }
      );
    } catch (groqError) {
      console.error('Groq analysis failed:', groqError);
      return NextResponse.json(
        {
          error: 'AI analysis failed',
          details: groqError instanceof Error ? groqError.message : 'Unknown error',
        },
        { status: 500 }
      );
    }

    // 9. Convert frequentQuestions to JSONB format for Postgres
    const frequentQuestionsJson = insights.frequentQuestions.map((q) => ({
      question: q.question,
      count: q.count,
    }));

    // 10. Upsert insights in database
    const updatedInsights = await prisma.patientInsights.upsert({
      where: { patientId },
      create: {
        patientId,
        mood: insights.mood,
        streakDays: insights.streakDays,
        concerns: insights.concerns,
        positiveMoments: insights.positiveMoments,
        memoryTopicsToReinforce: insights.memoryTopicsToReinforce,
        frequentQuestions: frequentQuestionsJson as any,
        behavioralTrends: insights.behavioralTrends,
        recommendations: insights.recommendations,
        analysisTimestamp: new Date(),
        conversationsAnalyzed: conversations.length,
        lastUpdated: new Date(),
      },
      update: {
        mood: insights.mood,
        streakDays: insights.streakDays,
        concerns: insights.concerns,
        positiveMoments: insights.positiveMoments,
        memoryTopicsToReinforce: insights.memoryTopicsToReinforce,
        frequentQuestions: frequentQuestionsJson as any,
        behavioralTrends: insights.behavioralTrends,
        recommendations: insights.recommendations,
        analysisTimestamp: new Date(),
        conversationsAnalyzed: conversations.length,
        lastUpdated: new Date(),
      },
    });

    // 11. Return success response
    return NextResponse.json({
      insights: {
        mood: updatedInsights.mood,
        streakDays: updatedInsights.streakDays,
        concerns: updatedInsights.concerns,
        positiveMoments: updatedInsights.positiveMoments,
        memoryTopicsToReinforce: updatedInsights.memoryTopicsToReinforce,
        frequentQuestions: insights.frequentQuestions,
        behavioralTrends: updatedInsights.behavioralTrends,
        recommendations: updatedInsights.recommendations,
      },
      conversationsAnalyzed: conversations.length,
      messagesAnalyzed: allMessages.length,
      analysisTimestamp: updatedInsights.analysisTimestamp?.toISOString(),
      lookbackDays,
    });
  } catch (error) {
    console.error('Insights analysis API error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
