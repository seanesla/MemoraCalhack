import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@clerk/nextjs/server';
import { verifyPatientAccess } from '@/lib/auth-helpers';

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

    // Verify patient access
    const access = await verifyPatientAccess(userId, patientId);

    if (!access.authorized) {
      return NextResponse.json(
        { error: access.reason || 'Access denied' },
        { status: access.patient ? 403 : 404 }
      );
    }

    // Get patient insights
    const insights = await prisma.patientInsights.findUnique({
      where: { patientId },
    });

    if (!insights) {
      return NextResponse.json({
        insights: null,
      });
    }

    return NextResponse.json({
      insights: {
        id: insights.id,
        mood: insights.mood,
        streakDays: insights.streakDays,
        concerns: insights.concerns || [],
        positiveMoments: insights.positiveMoments || [],
        memoryTopicsToReinforce: insights.memoryTopicsToReinforce || [],
        lastUpdated: insights.lastUpdated.toISOString(),
      },
    });
  } catch (error) {
    console.error('Error fetching insights:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
