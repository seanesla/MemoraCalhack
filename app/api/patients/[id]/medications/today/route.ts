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

    // Get today's date (start of day)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Get all medications for patient
    const medications = await prisma.medication.findMany({
      where: {
        patientId,
        active: true,
      },
      include: {
        doses: {
          where: {
            scheduledFor: {
              gte: today,
              lt: tomorrow,
            },
          },
          orderBy: { scheduledFor: 'asc' },
        },
      },
    });

    // Calculate statistics
    let totalDoses = 0;
    let takenDoses = 0;
    let pendingDoses = 0;

    medications.forEach((med) => {
      totalDoses += med.doses.length;
      takenDoses += med.doses.filter((d) => d.takenAt !== null).length;
      pendingDoses += med.doses.filter((d) => d.takenAt === null && !d.skipped).length;
    });

    return NextResponse.json({
      medications: medications.map((med) => ({
        id: med.id,
        name: med.name,
        dosage: med.dosage,
        timeOfDay: med.timeOfDay,
        doses: med.doses.map((dose) => ({
          id: dose.id,
          scheduledFor: dose.scheduledFor.toISOString(),
          takenAt: dose.takenAt?.toISOString() || null,
          skipped: dose.skipped,
        })),
      })),
      stats: {
        taken: takenDoses,
        total: totalDoses,
        pending: pendingDoses,
      },
    });
  } catch (error) {
    console.error('Error fetching medications:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
