/**
 * Medication Doses API
 *
 * POST /api/patients/[id]/medications/[medId]/doses
 *
 * Records a medication dose as taken or skipped.
 * Used by caregivers to track medication adherence.
 */

import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

// Validation schema for recording a dose
const recordDoseSchema = z.object({
  scheduledFor: z.string().datetime(),
  takenAt: z.string().datetime().optional(),
  skipped: z.boolean().optional().default(false),
  notes: z.string().optional(),
});

/**
 * POST /api/patients/[id]/medications/[medId]/doses
 *
 * Records a medication dose.
 *
 * Body:
 * - scheduledFor: ISO datetime when dose was scheduled
 * - takenAt: ISO datetime when dose was actually taken (optional if skipped)
 * - skipped: boolean, true if dose was skipped
 * - notes: optional notes (e.g., "Patient felt nauseous")
 */
export async function POST(
  request: Request,
  context: { params: Promise<{ id: string; medId: string }> }
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

    const { id: patientId, medId: medicationId } = await context.params;

    // Verify medication exists and belongs to patient
    const medication = await prisma.medication.findFirst({
      where: {
        id: medicationId,
        patientId,
      },
    });

    if (!medication) {
      return NextResponse.json(
        { error: 'Medication not found' },
        { status: 404 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validationResult = recordDoseSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: validationResult.error.errors,
        },
        { status: 400 }
      );
    }

    const { scheduledFor, takenAt, skipped, notes } = validationResult.data;

    // Create dose record
    const dose = await prisma.medicationDose.create({
      data: {
        medicationId,
        scheduledFor: new Date(scheduledFor),
        takenAt: takenAt ? new Date(takenAt) : null,
        skipped,
        notes: notes || null,
      },
    });

    return NextResponse.json({ dose }, { status: 201 });
  } catch (error) {
    console.error('Error recording medication dose:', error);
    return NextResponse.json(
      { error: 'Failed to record medication dose' },
      { status: 500 }
    );
  }
}
