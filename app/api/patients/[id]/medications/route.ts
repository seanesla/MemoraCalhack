/**
 * Medications CRUD API
 *
 * GET /api/patients/[id]/medications - Get all active medications for patient
 * POST /api/patients/[id]/medications - Create new medication for patient
 */

import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

// Validation schema for creating medication
const createMedicationSchema = z.object({
  name: z.string().min(1, 'Medication name is required'),
  dosage: z.string().min(1, 'Dosage is required'),
  timeOfDay: z.string().min(1, 'Time of day is required'),
  reminderTime: z.string().optional(),
});

/**
 * GET /api/patients/[id]/medications
 *
 * Returns all active medications for the specified patient.
 * Only returns medications where active = true.
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

    // Get all active medications for patient
    const medications = await prisma.medication.findMany({
      where: {
        patientId,
        active: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json({ medications });
  } catch (error) {
    console.error('Error fetching medications:', error);
    return NextResponse.json(
      { error: 'Failed to fetch medications' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/patients/[id]/medications
 *
 * Creates a new medication for the specified patient.
 * All medications are created with active = true by default.
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

    // Parse and validate request body
    const body = await request.json();
    const validationResult = createMedicationSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: validationResult.error.issues,
        },
        { status: 400 }
      );
    }

    const { name, dosage, timeOfDay, reminderTime } = validationResult.data;

    // Create medication
    const medication = await prisma.medication.create({
      data: {
        patientId,
        name,
        dosage,
        timeOfDay,
        reminderTime: reminderTime || null,
        active: true,
      },
    });

    return NextResponse.json({ medication }, { status: 201 });
  } catch (error) {
    console.error('Error creating medication:', error);
    return NextResponse.json(
      { error: 'Failed to create medication' },
      { status: 500 }
    );
  }
}
