/**
 * Patient/Caregiver Onboarding Endpoint
 *
 * Creates Patient or Caregiver record after Clerk signup
 *
 * Security:
 * - Requires Clerk authentication via auth()
 * - Only creates record for authenticated user (no impersonation)
 *
 * Flow:
 * 1. User signs up with Clerk
 * 2. User fills out onboarding form
 * 3. Frontend calls this endpoint
 * 4. We create Patient/Caregiver record in database
 */

import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { createPatientAgent } from '@/lib/letta';

// Validation schemas
const patientSchema = z.object({
  role: z.literal('patient'),
  name: z.string().min(1, 'Name is required').trim(),
  age: z.number().int().positive('Age must be greater than 0'),
  diagnosisStage: z.string().optional(),
  locationLabel: z.string().optional(),
  preferredName: z.string().optional(),
});

const caregiverSchema = z.object({
  role: z.literal('caregiver'),
  name: z.string().min(1, 'Name is required').trim(),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
});

const onboardingSchema = z.discriminatedUnion('role', [
  patientSchema,
  caregiverSchema,
]);

export async function POST(req: Request) {
  // 1. Verify authentication
  const authResult = await auth();
  const userId = authResult?.userId;

  if (!userId) {
    return NextResponse.json(
      { error: 'Unauthorized: Must be logged in to onboard' },
      { status: 401 }
    );
  }

  // 2. Parse and validate request body
  let body: unknown;
  try {
    body = await req.json();
  } catch (err) {
    return NextResponse.json(
      { error: 'Invalid JSON in request body' },
      { status: 400 }
    );
  }

  const validation = onboardingSchema.safeParse(body);

  if (!validation.success) {
    // Get first error message from Zod
    const firstError = validation.error.issues[0];
    if (firstError) {
      return NextResponse.json(
        { error: `Validation error: ${firstError.path.join('.')} - ${firstError.message}` },
        { status: 400 }
      );
    }

    // Fallback if no specific error
    return NextResponse.json(
      { error: `Validation error: ${validation.error.message}` },
      { status: 400 }
    );
  }

  const data = validation.data;

  // 3. Create Patient or Caregiver based on role
  try {
    if (data.role === 'patient') {
      // Create Patient record first
      const patient = await prisma.patient.create({
        data: {
          clerkId: userId,
          name: data.name,
          age: data.age,
          diagnosisStage: data.diagnosisStage || null,
          locationLabel: data.locationLabel || null,
          preferredName: data.preferredName || null,
          // lettaAgentId will be set after agent creation
        },
      });

      // Create Letta AI agent for the patient
      try {
        const agent = await createPatientAgent({
          patientName: data.name,
          age: data.age,
          diagnosisStage: data.diagnosisStage,
          locationLabel: data.locationLabel,
          preferredName: data.preferredName,
        });

        // Update patient with Letta agent ID
        await prisma.patient.update({
          where: { id: patient.id },
          data: { lettaAgentId: agent.id },
        });

        console.log(`Created Letta agent ${agent.id} for patient ${patient.id}`);

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
        // If Letta agent creation fails, log error but still return success
        // Patient can use app without AI companion (degraded mode)
        console.error('Failed to create Letta agent:', lettaError);

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
      // Create Caregiver record (no Letta agent needed)
      const caregiver = await prisma.caregiver.create({
        data: {
          clerkId: userId,
          name: data.name,
          email: data.email || null,
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
    // Handle unique constraint violation (duplicate clerkId)
    if (error.code === 'P2002') {
      console.error('User already onboarded:', userId);
      return NextResponse.json(
        { error: 'User already onboarded' },
        { status: 409 }
      );
    }

    // Handle other database errors
    console.error('Database error during onboarding:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
