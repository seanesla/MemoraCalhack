import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@clerk/nextjs/server';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Verify authentication
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const patientId = (await params).id;

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
