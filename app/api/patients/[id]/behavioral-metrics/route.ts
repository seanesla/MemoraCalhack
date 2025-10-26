import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@clerk/nextjs/server';
import { verifyPatientAccess } from '@/lib/auth-helpers';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const patientId = (await params).id;

    const { userId } = await auth();

    // Verify patient access
    const access = await verifyPatientAccess(userId, patientId);

    if (!access.authorized) {
      return NextResponse.json(
        { error: access.reason || 'Access denied' },
        { status: access.patient ? 403 : 404 }
      );
    }

    // Get today's behavioral metrics
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const metrics = await prisma.behavioralMetrics.findFirst({
      where: {
        patientId,
        date: {
          gte: today,
        },
      },
    });

    if (!metrics) {
      return NextResponse.json({
        metrics: null,
      });
    }

    return NextResponse.json({
      metrics: {
        id: metrics.id,
        date: new Date(metrics.date).toISOString().split('T')[0],
        responseTime: {
          current: metrics.avgResponseTimeMs,
          baseline: metrics.responseTimeBaseline,
        },
        unpromptedRecall: {
          count: metrics.unpromptedRecallCount,
          examples: metrics.unpromptedRecallExamples,
        },
        temporalOrientation: {
          dateChecks: metrics.dateChecksCount,
          timeChecks: metrics.timeChecksCount,
        },
        questionRepetition: {
          repeated: metrics.repeatedQuestions,
          baseline: metrics.repetitionBaseline,
        },
        mood: metrics.moodScore,
        engagement: metrics.engagementScore,
        calculatedAt: metrics.calculatedAt.toISOString(),
      },
    });
  } catch (error) {
    console.error('Error fetching behavioral metrics:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
