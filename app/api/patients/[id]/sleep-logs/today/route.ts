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
