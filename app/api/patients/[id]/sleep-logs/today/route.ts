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

    // Get today's sleep log
    const sleepLog = await prisma.sleepLog.findFirst({
      where: {
        patientId,
        date: {
          gte: today,
          lt: tomorrow,
        },
      },
    });

    return NextResponse.json({
      sleepLog: sleepLog
        ? {
            id: sleepLog.id,
            bedtime: sleepLog.bedtime?.toISOString() || null,
            wakeTime: sleepLog.wakeTime?.toISOString() || null,
            totalHours: sleepLog.totalHours,
            quality: sleepLog.quality,
            notes: sleepLog.notes,
          }
        : null,
    });
  } catch (error) {
    console.error('Error fetching sleep log:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
