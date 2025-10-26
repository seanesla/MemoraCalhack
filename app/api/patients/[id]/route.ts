import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@clerk/nextjs/server';
import { verifyPatientAccess } from '@/lib/auth-helpers';

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

    // Verify patient access
    const access = await verifyPatientAccess(userId, patientId);

    if (!access.authorized) {
      return NextResponse.json(
        { error: access.reason || 'Access denied' },
        { status: access.patient ? 403 : 404 }
      );
    }

    // Get patient details with caregiver relationship
    const patient = await prisma.patient.findUnique({
      where: { id: patientId },
      select: {
        id: true,
        name: true,
        age: true,
        preferredName: true,
        locationLabel: true,
        diagnosisStage: true,
        currentRoutineFocus: true,
        caregivers: {
          include: {
            caregiver: {
              select: {
                name: true,
                email: true,
              },
            },
          },
        },
      },
    });

    if (!patient) {
      return NextResponse.json(
        { error: 'Patient not found' },
        { status: 404 }
      );
    }

    // Format caregiver data
    const caregiverList = patient.caregivers.map(cp => ({
      name: cp.caregiver.name,
      email: cp.caregiver.email,
    }));

    // Return patient details
    return NextResponse.json({
      patient: {
        id: patient.id,
        name: patient.name,
        age: patient.age,
        preferredName: patient.preferredName,
        locationLabel: patient.locationLabel,
        diagnosisStage: patient.diagnosisStage,
        currentRoutineFocus: patient.currentRoutineFocus,
        caregivers: caregiverList,
      },
    });

  } catch (error) {
    console.error('Error fetching patient details:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
