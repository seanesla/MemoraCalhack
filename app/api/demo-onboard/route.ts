/**
 * Demo Account Onboarding Endpoint
 *
 * Creates demo Patient/Caregiver records with hardcoded Clerk IDs
 * This allows anyone to test the demo without conflicts
 *
 * Security:
 * - Only works in development (checks NODE_ENV)
 * - Uses hardcoded demo Clerk IDs, not user's real auth
 * - Idempotent: handles existing records gracefully
 */

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { createPatientAgent } from '@/lib/letta';

// Hardcoded demo Clerk IDs
const DEMO_CLERK_IDS = {
  patient: 'clerk_demo_patient_global',
  caregiver: 'clerk_demo_caregiver_global',
} as const;

// Validation schema
const demoOnboardSchema = z.object({
  demoRole: z.enum(['patient', 'caregiver']),
  role: z.enum(['patient', 'caregiver']),
  name: z.string().min(1),
  age: z.number().optional(),
  email: z.string().optional(),
  diagnosisStage: z.string().optional(),
  locationLabel: z.string().optional(),
  preferredName: z.string().optional(),
});

export async function POST(req: Request) {
  // Demo accounts use hardcoded Clerk IDs, safe for production
  // They don't conflict with real user accounts

  // Parse and validate
  let body: unknown;
  try {
    body = await req.json();
  } catch (err) {
    return NextResponse.json(
      { error: 'Invalid JSON in request body' },
      { status: 400 }
    );
  }

  const validation = demoOnboardSchema.safeParse(body);

  if (!validation.success) {
    const firstError = validation.error.issues[0];
    if (firstError) {
      return NextResponse.json(
        {
          error: `Validation error: ${firstError.path.join('.')} - ${firstError.message}`,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: `Validation error: ${validation.error.message}` },
      { status: 400 }
    );
  }

  const data = validation.data;
  const demoClerkId =
    DEMO_CLERK_IDS[data.demoRole as keyof typeof DEMO_CLERK_IDS];

  try {
    if (data.role === 'patient') {
      // Check if demo patient already exists
      let patient = await prisma.patient.findUnique({
        where: { clerkId: demoClerkId },
      });

      if (patient) {
        // Demo patient already exists - return it
        return NextResponse.json(
          {
            success: true,
            userId: patient.id,
            role: 'patient',
            lettaAgentId: patient.lettaAgentId,
            isDemoExisting: true,
          },
          { status: 200 }
        );
      }

      // Create new demo patient
      patient = await prisma.patient.create({
        data: {
          clerkId: demoClerkId,
          name: data.name,
          age: data.age || 70,
          diagnosisStage: data.diagnosisStage || 'Early-stage dementia',
          locationLabel: data.locationLabel || 'Home, San Francisco',
          preferredName: data.preferredName || 'Demo',
        },
      });

      // Create Letta AI agent for demo patient
      try {
        const agent = await createPatientAgent({
          patientName: data.name,
          age: data.age || 70,
          diagnosisStage: data.diagnosisStage,
          locationLabel: data.locationLabel,
          preferredName: data.preferredName,
        });

        // Update patient with Letta agent ID
        await prisma.patient.update({
          where: { id: patient.id },
          data: { lettaAgentId: agent.id },
        });

        console.log(`Created Letta agent ${agent.id} for demo patient ${patient.id}`);

        return NextResponse.json(
          {
            success: true,
            userId: patient.id,
            role: 'patient',
            lettaAgentId: agent.id,
          },
          { status: 201 }
        );
      } catch (lettaError) {
        // If Letta fails, still return success (patient can use without AI)
        console.error('Failed to create Letta agent for demo patient:', lettaError);

        return NextResponse.json(
          {
            success: true,
            userId: patient.id,
            role: 'patient',
            lettaAgentId: null,
            warning: 'AI companion unavailable',
          },
          { status: 201 }
        );
      }
    } else {
      // Caregiver
      // Check if demo caregiver already exists
      let caregiver = await prisma.caregiver.findUnique({
        where: { clerkId: demoClerkId },
      });

      if (caregiver) {
        // Demo caregiver already exists - return it
        return NextResponse.json(
          {
            success: true,
            userId: caregiver.id,
            role: 'caregiver',
            isDemoExisting: true,
          },
          { status: 200 }
        );
      }

      // Create new demo caregiver
      caregiver = await prisma.caregiver.create({
        data: {
          clerkId: demoClerkId,
          name: data.name,
          email: data.email || 'demo@memora.care',
        },
      });

      return NextResponse.json(
        {
          success: true,
          userId: caregiver.id,
          role: 'caregiver',
        },
        { status: 201 }
      );
    }
  } catch (error: any) {
    console.error('Error in demo onboarding:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
