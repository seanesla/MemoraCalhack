/**
 * Today's Daily Activities API
 *
 * GET /api/patients/[id]/daily-activities/today
 *
 * Returns all activities completed today with statistics.
 */

import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/patients/[id]/daily-activities/today
 *
 * Returns today's activities with statistics:
 * - activities: array of today's activities
 * - stats: { totalActivities, totalMinutes }
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

    // Get today's activities
    const activities = await prisma.dailyActivity.findMany({
      where: {
        patientId,
        date: {
          gte: todayStart,
          lte: todayEnd,
        },
      },
      orderBy: {
        completedAt: 'asc',
      },
    });

    // Calculate stats
    const totalActivities = activities.length;
    const totalMinutes = activities.reduce((sum, activity) => {
      return sum + (activity.duration || 0);
    }, 0);

    return NextResponse.json({
      activities,
      stats: {
        totalActivities,
        totalMinutes,
      },
    });
  } catch (error) {
    console.error('Error fetching today\'s activities:', error);
    return NextResponse.json(
      { error: 'Failed to fetch today\'s activities' },
      { status: 500 }
    );
  }
}
