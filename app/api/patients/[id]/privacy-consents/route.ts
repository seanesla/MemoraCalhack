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

    // Get all privacy consents for patient, ordered by most recent changes
    const consents = await prisma.privacyConsent.findMany({
      where: {
        patientId,
      },
      orderBy: { changedAt: 'desc' },
    });

    return NextResponse.json({
      consents: consents.map((consent) => ({
        id: consent.id,
        type: consent.consentType,
        enabled: consent.enabled,
        changedAt: consent.changedAt.toISOString(),
        impact: consent.impact,
      })),
    });
  } catch (error) {
    console.error('Error fetching privacy consents:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
