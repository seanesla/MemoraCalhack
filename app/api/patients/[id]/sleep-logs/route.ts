/**
 * Sleep Logs CRUD API
 *
 * GET /api/patients/[id]/sleep-logs - Get all sleep logs for patient
 * POST /api/patients/[id]/sleep-logs - Create or update sleep log (upsert by date)
 */

import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { verifyPatientAccess } from '@/lib/auth-helpers';

// Validation schema for creating/updating sleep log
const sleepLogSchema = z.object({
  date: z.string().datetime(),
  bedtime: z.string().datetime().optional(),
  wakeTime: z.string().datetime().optional(),
  totalHours: z.number().positive().optional(),
  quality: z.string().optional(),
  notes: z.string().optional(),
});

/**
 * GET /api/patients/[id]/sleep-logs
 *
 * Returns all sleep logs for the specified patient, ordered by date descending.
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

    // Get all sleep logs for patient
    const sleepLogs = await prisma.sleepLog.findMany({
      where: {
        patientId,
      },
      orderBy: {
        date: 'desc',
      },
    });

    return NextResponse.json({ sleepLogs });
  } catch (error) {
    console.error('Error fetching sleep logs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch sleep logs' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/patients/[id]/sleep-logs
 *
 * Creates or updates a sleep log for the specified patient.
 * Uses upsert to ensure only one log per date.
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
    const validationResult = sleepLogSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: validationResult.error.issues,
        },
        { status: 400 }
      );
    }

    const { date, bedtime, wakeTime, totalHours, quality, notes } = validationResult.data;

    // Normalize date to start of day for uniqueness constraint
    const dateOnly = new Date(date);
    dateOnly.setHours(0, 0, 0, 0);

    // Upsert sleep log (update if exists for this date, create otherwise)
    const sleepLog = await prisma.sleepLog.upsert({
      where: {
        patientId_date: {
          patientId,
          date: dateOnly,
        },
      },
      update: {
        bedtime: bedtime ? new Date(bedtime) : null,
        wakeTime: wakeTime ? new Date(wakeTime) : null,
        totalHours: totalHours || null,
        quality: quality || null,
        notes: notes || null,
      },
      create: {
        patientId,
        date: dateOnly,
        bedtime: bedtime ? new Date(bedtime) : null,
        wakeTime: wakeTime ? new Date(wakeTime) : null,
        totalHours: totalHours || null,
        quality: quality || null,
        notes: notes || null,
      },
    });

    return NextResponse.json({ sleepLog }, { status: 201 });
  } catch (error) {
    console.error('Error creating/updating sleep log:', error);
    return NextResponse.json(
      { error: 'Failed to create/update sleep log' },
      { status: 500 }
    );
  }
}
