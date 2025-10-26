/**
 * Daily Activities CRUD API
 *
 * GET /api/patients/[id]/daily-activities - Get all activities for patient
 * POST /api/patients/[id]/daily-activities - Create new activity
 */

import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { verifyPatientAccess } from '@/lib/auth-helpers';

// Validation schema for creating activity
const createActivitySchema = z.object({
  date: z.string().datetime(),
  activityType: z.string().min(1, 'Activity type is required'),
  description: z.string().optional(),
  duration: z.number().int().positive().optional(),
});

/**
 * GET /api/patients/[id]/daily-activities
 *
 * Returns all activities for the specified patient, ordered by date descending.
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

    // Verify patient access
    const access = await verifyPatientAccess(userId, patientId);

    if (!access.authorized) {
      return NextResponse.json(
        { error: access.reason || 'Access denied' },
        { status: access.patient ? 403 : 404 }
      );
    }

    // Get all activities for patient
    const activities = await prisma.dailyActivity.findMany({
      where: {
        patientId,
      },
      orderBy: {
        date: 'desc',
      },
    });

    return NextResponse.json({ activities });
  } catch (error) {
    console.error('Error fetching daily activities:', error);
    return NextResponse.json(
      { error: 'Failed to fetch daily activities' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/patients/[id]/daily-activities
 *
 * Creates a new daily activity for the specified patient.
 */
export async function POST(
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

    // Verify patient access
    const access = await verifyPatientAccess(userId, patientId);

    if (!access.authorized) {
      return NextResponse.json(
        { error: access.reason || 'Access denied' },
        { status: access.patient ? 403 : 404 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validationResult = createActivitySchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: validationResult.error.issues,
        },
        { status: 400 }
      );
    }

    const { date, activityType, description, duration } = validationResult.data;

    // Create activity
    const activity = await prisma.dailyActivity.create({
      data: {
        patientId,
        date: new Date(date),
        activityType,
        description: description || null,
        duration: duration || null,
      },
    });

    return NextResponse.json({ activity }, { status: 201 });
  } catch (error) {
    console.error('Error creating daily activity:', error);
    return NextResponse.json(
      { error: 'Failed to create daily activity' },
      { status: 500 }
    );
  }
}
