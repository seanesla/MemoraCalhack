import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@clerk/nextjs/server';
import { verifyPatientAccess } from '@/lib/auth-helpers';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const patientId = (await params).id;

    const { userId } = await auth();

    // Verify patient access
    const access = await verifyPatientAccess(userId, patientId);

    if (!access.authorized) {
      return NextResponse.json(
        { error: access.reason || 'Access denied' },
        { status: access.patient ? 403 : 404 }
      );
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
