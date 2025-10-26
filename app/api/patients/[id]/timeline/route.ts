/**
 * Timeline Events API
 *
 * GET /api/patients/[id]/timeline
 * Returns all timeline events for a patient, ordered by most recent
 */

import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
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

    // Get timeline events, ordered by most recent
    const events = await prisma.timelineEvent.findMany({
      where: {
        patientId,
      },
      orderBy: { timestamp: 'desc' },
      take: 50, // Last 50 events
    });

    return NextResponse.json({
      events: events.map((event) => ({
        id: event.id,
        timestamp: event.timestamp.toISOString(),
        type: event.type,
        severity: event.severity,
        summary: event.summary,
        details: event.details,
      })),
    });
  } catch (error) {
    console.error('Error fetching timeline events:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
