/**
 * Authorization Helpers
 *
 * Centralized authorization logic for patient data access.
 * Verifies that a user (identified by Clerk userId) has permission
 * to access a specific patient's data.
 */

import { prisma } from '@/lib/prisma';
import type { Patient, Caregiver } from '@prisma/client';

export interface PatientAccessResult {
  authorized: boolean;
  patient: Patient | null;
  caregiver: Caregiver | null;
  reason?: string;
}

/**
 * Verifies if a user has access to a patient's data
 *
 * Access is granted if:
 * 1. Patient ID is the demo patient (clerk_demo_patient_global)
 * 2. User is the patient themselves (userId matches patient.clerkId)
 * 3. User is a caregiver with an explicit CaregiverPatient relationship
 *
 * @param userId - Clerk user ID from auth()
 * @param patientId - Patient ID from URL parameter
 * @returns PatientAccessResult with authorization status
 */
export async function verifyPatientAccess(
  userId: string,
  patientId: string
): Promise<PatientAccessResult> {
  // Fetch patient
  const patient = await prisma.patient.findUnique({
    where: { id: patientId },
  });

  if (!patient) {
    return {
      authorized: false,
      patient: null,
      caregiver: null,
      reason: 'Patient not found',
    };
  }

  // Allow demo patient access
  const isDemoPatient = patient.clerkId === 'clerk_demo_patient_global';
  if (isDemoPatient) {
    return {
      authorized: true,
      patient,
      caregiver: null,
    };
  }

  // Check if user is the patient themselves
  if (userId === patient.clerkId) {
    return {
      authorized: true,
      patient,
      caregiver: null,
    };
  }

  // Check if user is a caregiver
  const caregiver = await prisma.caregiver.findUnique({
    where: { clerkId: userId },
  });

  if (!caregiver) {
    return {
      authorized: false,
      patient,
      caregiver: null,
      reason: 'User is not patient owner or authorized caregiver',
    };
  }

  // Check if caregiver has explicit access to this patient
  const caregiverPatient = await prisma.caregiverPatient.findUnique({
    where: {
      caregiverId_patientId: {
        caregiverId: caregiver.id,
        patientId: patient.id,
      },
    },
  });

  if (!caregiverPatient) {
    return {
      authorized: false,
      patient,
      caregiver,
      reason: 'Caregiver does not have access to this patient',
    };
  }

  // Access granted
  return {
    authorized: true,
    patient,
    caregiver,
  };
}
