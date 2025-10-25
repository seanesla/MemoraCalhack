/**
 * Today's Sleep Log API
 *
 * GET /api/patients/[id]/sleep-logs/today
 *
 * Returns today's sleep log if it exists, otherwise null.
 */

import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/patients/[id]/sleep-logs/today
 *
 * Returns today's sleep log or null if not logged yet.
 */
export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
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

    const { id: patientId } = await context.params;

    // Verify patient exists
    const patient = await prisma.patient.findUnique({
      where: { id: patientId },
    });

    if (!patient) {
      return NextResponse.json(
        { error: 'Patient not found' },
        { status: 404 }
      );
    }

    // Get start and end of today
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    // Get today's sleep log
    const sleepLog = await prisma.sleepLog.findFirst({
      where: {
        patientId,
        date: {
          gte: todayStart,
          lte: todayEnd,
        },
      },
    });

    return NextResponse.json({ sleepLog: sleepLog || null });
  } catch (error) {
    console.error('Error fetching today\'s sleep log:', error);
    return NextResponse.json(
      { error: 'Failed to fetch today\'s sleep log' },
      { status: 500 }
    );
  }
}
