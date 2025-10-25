/**
 * Today's Medications API
 *
 * GET /api/patients/[id]/medications/today
 *
 * Returns today's medication schedule with dose status.
 * Shows whether each medication has been taken, skipped, or is pending.
 * Includes completion statistics.
 */

import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/patients/[id]/medications/today
 *
 * Returns today's medication schedule with status:
 * - medication info (name, dosage, timeOfDay, reminderTime)
 * - taken: boolean (true if dose recorded for today)
 * - takenAt: timestamp when dose was taken (null if not taken)
 * - skipped: boolean (true if dose was marked as skipped)
 * - notes: string (optional notes about the dose)
 *
 * Also returns stats:
 * - total: total number of active medications
 * - taken: number of doses taken today
 * - pending: number of doses not yet taken
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

    // Get all active medications with today's doses
    const medications = await prisma.medication.findMany({
      where: {
        patientId,
        active: true,
      },
      include: {
        doses: {
          where: {
            scheduledFor: {
              gte: todayStart,
              lte: todayEnd,
            },
          },
          orderBy: {
            scheduledFor: 'desc',
          },
          take: 1, // Only get the most recent dose for today
        },
      },
      orderBy: {
        reminderTime: 'asc',
      },
    });

    // Transform data to include dose status
    const medicationsWithStatus = medications.map((med) => {
      const todayDose = med.doses[0];

      return {
        id: med.id,
        name: med.name,
        dosage: med.dosage,
        timeOfDay: med.timeOfDay,
        reminderTime: med.reminderTime,
        taken: todayDose ? !todayDose.skipped && todayDose.takenAt !== null : false,
        skipped: todayDose?.skipped || false,
        takenAt: todayDose?.takenAt || null,
        notes: todayDose?.notes || null,
      };
    });

    // Calculate stats
    const stats = {
      total: medicationsWithStatus.length,
      taken: medicationsWithStatus.filter((m) => m.taken).length,
      pending: medicationsWithStatus.filter((m) => !m.taken && !m.skipped).length,
    };

    return NextResponse.json({
      medications: medicationsWithStatus,
      stats,
    });
  } catch (error) {
    console.error('Error fetching today\'s medications:', error);
    return NextResponse.json(
      { error: 'Failed to fetch today\'s medications' },
      { status: 500 }
    );
  }
}
