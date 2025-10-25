/**
 * Medications API Tests
 *
 * Tests for Phase 4: Medications CRUD operations
 * Following TDD approach - tests written BEFORE implementation
 *
 * Endpoints tested:
 * - GET /api/patients/[id]/medications - Get all medications for patient
 * - POST /api/patients/[id]/medications - Create new medication
 * - GET /api/patients/[id]/medications/today - Get today's medication schedule
 * - POST /api/patients/[id]/medications/[medId]/doses - Record dose taken
 * - PATCH /api/patients/[id]/medications/[medId] - Update medication
 * - DELETE /api/patients/[id]/medications/[medId] - Delete medication
 */

import { describe, it, expect, beforeEach, afterAll, vi } from 'vitest';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Mock Clerk auth - framework concern only
let mockUserId: string | null = null;

vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn(() => Promise.resolve({ userId: mockUserId })),
}));

describe('Medications API Tests', () => {
  let testPatientId: string;

  beforeEach(async () => {
    // Clean up database
    await prisma.medicationDose.deleteMany();
    await prisma.medication.deleteMany();
    await prisma.patient.deleteMany();

    // Create test patient
    mockUserId = 'clerk_test_medications_user';
    const patient = await prisma.patient.create({
      data: {
        clerkId: mockUserId,
        name: 'Test Patient',
        age: 70,
      },
    });
    testPatientId = patient.id;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('GET /api/patients/[id]/medications', () => {
    it('should return empty array when patient has no medications', async () => {
      const { GET } = await import('@/app/api/patients/[id]/medications/route');

      const request = new Request(`http://localhost:3000/api/patients/${testPatientId}/medications`);
      const response = await GET(request, { params: Promise.resolve({ id: testPatientId }) });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.medications).toEqual([]);
    });

    it('should return all active medications for patient', async () => {
      // Arrange: Create test medications
      await prisma.medication.createMany({
        data: [
          {
            patientId: testPatientId,
            name: 'Leqembi',
            dosage: '10mg',
            timeOfDay: 'Morning',
            reminderTime: '08:00',
            active: true,
          },
          {
            patientId: testPatientId,
            name: 'Aricept',
            dosage: '5mg',
            timeOfDay: 'Evening',
            reminderTime: '20:00',
            active: true,
          },
        ],
      });

      const { GET } = await import('@/app/api/patients/[id]/medications/route');

      const request = new Request(`http://localhost:3000/api/patients/${testPatientId}/medications`);
      const response = await GET(request, { params: Promise.resolve({ id: testPatientId }) });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.medications).toHaveLength(2);
      expect(data.medications[0].name).toBe('Leqembi');
      expect(data.medications[1].name).toBe('Aricept');
    });

    it('should not return inactive medications', async () => {
      // Arrange: Create active and inactive medications
      await prisma.medication.createMany({
        data: [
          {
            patientId: testPatientId,
            name: 'Active Med',
            dosage: '10mg',
            timeOfDay: 'Morning',
            active: true,
          },
          {
            patientId: testPatientId,
            name: 'Inactive Med',
            dosage: '5mg',
            timeOfDay: 'Evening',
            active: false,
          },
        ],
      });

      const { GET } = await import('@/app/api/patients/[id]/medications/route');

      const request = new Request(`http://localhost:3000/api/patients/${testPatientId}/medications`);
      const response = await GET(request, { params: Promise.resolve({ id: testPatientId }) });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.medications).toHaveLength(1);
      expect(data.medications[0].name).toBe('Active Med');
    });

    it('should return 404 when patient does not exist', async () => {
      const { GET } = await import('@/app/api/patients/[id]/medications/route');

      const fakePatientId = 'nonexistent_patient_id';
      const request = new Request(`http://localhost:3000/api/patients/${fakePatientId}/medications`);
      const response = await GET(request, { params: Promise.resolve({ id: fakePatientId }) });

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.error).toBeDefined();
    });
  });

  describe('POST /api/patients/[id]/medications', () => {
    it('should create a new medication with all required fields', async () => {
      const { POST } = await import('@/app/api/patients/[id]/medications/route');

      const request = new Request(`http://localhost:3000/api/patients/${testPatientId}/medications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Leqembi',
          dosage: '10mg',
          timeOfDay: 'Morning',
          reminderTime: '08:00',
        }),
      });

      const response = await POST(request, { params: Promise.resolve({ id: testPatientId }) });

      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.medication.name).toBe('Leqembi');
      expect(data.medication.dosage).toBe('10mg');
      expect(data.medication.timeOfDay).toBe('Morning');
      expect(data.medication.active).toBe(true);

      // Verify in database
      const medication = await prisma.medication.findFirst({
        where: { patientId: testPatientId, name: 'Leqembi' },
      });
      expect(medication).toBeDefined();
      expect(medication?.reminderTime).toBe('08:00');
    });

    it('should create medication without optional reminderTime', async () => {
      const { POST } = await import('@/app/api/patients/[id]/medications/route');

      const request = new Request(`http://localhost:3000/api/patients/${testPatientId}/medications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Aricept',
          dosage: '5mg',
          timeOfDay: 'Evening',
        }),
      });

      const response = await POST(request, { params: Promise.resolve({ id: testPatientId }) });

      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.medication.name).toBe('Aricept');
      expect(data.medication.reminderTime).toBeNull();
    });

    it('should return 400 when required fields are missing', async () => {
      const { POST } = await import('@/app/api/patients/[id]/medications/route');

      const request = new Request(`http://localhost:3000/api/patients/${testPatientId}/medications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Incomplete Med',
          // Missing dosage and timeOfDay
        }),
      });

      const response = await POST(request, { params: Promise.resolve({ id: testPatientId }) });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBeDefined();
    });

    it('should return 404 when patient does not exist', async () => {
      const { POST } = await import('@/app/api/patients/[id]/medications/route');

      const fakePatientId = 'nonexistent_patient_id';
      const request = new Request(`http://localhost:3000/api/patients/${fakePatientId}/medications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Test Med',
          dosage: '10mg',
          timeOfDay: 'Morning',
        }),
      });

      const response = await POST(request, { params: Promise.resolve({ id: fakePatientId }) });

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.error).toContain('Patient not found');
    });
  });

  describe('GET /api/patients/[id]/medications/today', () => {
    it('should return today\'s medication schedule with dose status', async () => {
      // Arrange: Create medications
      const medication = await prisma.medication.create({
        data: {
          patientId: testPatientId,
          name: 'Leqembi',
          dosage: '10mg',
          timeOfDay: 'Morning',
          reminderTime: '08:00',
          active: true,
        },
      });

      // Create dose taken today
      const today = new Date();
      today.setHours(8, 0, 0, 0);
      await prisma.medicationDose.create({
        data: {
          medicationId: medication.id,
          scheduledFor: today,
          takenAt: new Date(),
        },
      });

      const { GET } = await import('@/app/api/patients/[id]/medications/today/route');

      const request = new Request(`http://localhost:3000/api/patients/${testPatientId}/medications/today`);
      const response = await GET(request, { params: Promise.resolve({ id: testPatientId }) });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.medications).toHaveLength(1);
      expect(data.medications[0].name).toBe('Leqembi');
      expect(data.medications[0].taken).toBe(true);
      expect(data.medications[0].takenAt).toBeDefined();
    });

    it('should show pending status for medications not yet taken', async () => {
      // Arrange: Create medication without dose
      await prisma.medication.create({
        data: {
          patientId: testPatientId,
          name: 'Aricept',
          dosage: '5mg',
          timeOfDay: 'Evening',
          reminderTime: '20:00',
          active: true,
        },
      });

      const { GET } = await import('@/app/api/patients/[id]/medications/today/route');

      const request = new Request(`http://localhost:3000/api/patients/${testPatientId}/medications/today`);
      const response = await GET(request, { params: Promise.resolve({ id: testPatientId }) });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.medications).toHaveLength(1);
      expect(data.medications[0].taken).toBe(false);
      expect(data.medications[0].takenAt).toBeNull();
    });

    it('should calculate completion stats (2/3 taken)', async () => {
      // Arrange: Create 3 medications, mark 2 as taken
      const meds = await Promise.all([
        prisma.medication.create({
          data: {
            patientId: testPatientId,
            name: 'Med 1',
            dosage: '10mg',
            timeOfDay: 'Morning',
            active: true,
          },
        }),
        prisma.medication.create({
          data: {
            patientId: testPatientId,
            name: 'Med 2',
            dosage: '5mg',
            timeOfDay: 'Afternoon',
            active: true,
          },
        }),
        prisma.medication.create({
          data: {
            patientId: testPatientId,
            name: 'Med 3',
            dosage: '15mg',
            timeOfDay: 'Evening',
            active: true,
          },
        }),
      ]);

      // Mark first 2 as taken
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      await Promise.all([
        prisma.medicationDose.create({
          data: {
            medicationId: meds[0].id,
            scheduledFor: today,
            takenAt: new Date(),
          },
        }),
        prisma.medicationDose.create({
          data: {
            medicationId: meds[1].id,
            scheduledFor: today,
            takenAt: new Date(),
          },
        }),
      ]);

      const { GET } = await import('@/app/api/patients/[id]/medications/today/route');

      const request = new Request(`http://localhost:3000/api/patients/${testPatientId}/medications/today`);
      const response = await GET(request, { params: Promise.resolve({ id: testPatientId }) });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.stats.total).toBe(3);
      expect(data.stats.taken).toBe(2);
      expect(data.stats.pending).toBe(1);
    });
  });

  describe('POST /api/patients/[id]/medications/[medId]/doses', () => {
    it('should record a dose as taken', async () => {
      // Arrange: Create medication
      const medication = await prisma.medication.create({
        data: {
          patientId: testPatientId,
          name: 'Leqembi',
          dosage: '10mg',
          timeOfDay: 'Morning',
          active: true,
        },
      });

      const { POST } = await import('@/app/api/patients/[id]/medications/[medId]/doses/route');

      const request = new Request(
        `http://localhost:3000/api/patients/${testPatientId}/medications/${medication.id}/doses`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            scheduledFor: new Date().toISOString(),
            takenAt: new Date().toISOString(),
          }),
        }
      );

      const response = await POST(request, {
        params: Promise.resolve({ id: testPatientId, medId: medication.id })
      });

      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.dose.takenAt).toBeDefined();
      expect(data.dose.skipped).toBe(false);

      // Verify in database
      const dose = await prisma.medicationDose.findFirst({
        where: { medicationId: medication.id },
      });
      expect(dose).toBeDefined();
      expect(dose?.takenAt).toBeDefined();
    });

    it('should record a dose as skipped', async () => {
      // Arrange: Create medication
      const medication = await prisma.medication.create({
        data: {
          patientId: testPatientId,
          name: 'Aricept',
          dosage: '5mg',
          timeOfDay: 'Evening',
          active: true,
        },
      });

      const { POST } = await import('@/app/api/patients/[id]/medications/[medId]/doses/route');

      const request = new Request(
        `http://localhost:3000/api/patients/${testPatientId}/medications/${medication.id}/doses`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            scheduledFor: new Date().toISOString(),
            skipped: true,
            notes: 'Patient felt nauseous',
          }),
        }
      );

      const response = await POST(request, {
        params: Promise.resolve({ id: testPatientId, medId: medication.id })
      });

      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.dose.skipped).toBe(true);
      expect(data.dose.notes).toBe('Patient felt nauseous');
      expect(data.dose.takenAt).toBeNull();
    });

    it('should return 404 when medication does not exist', async () => {
      const { POST } = await import('@/app/api/patients/[id]/medications/[medId]/doses/route');

      const fakeMedId = 'nonexistent_med_id';
      const request = new Request(
        `http://localhost:3000/api/patients/${testPatientId}/medications/${fakeMedId}/doses`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            scheduledFor: new Date().toISOString(),
            takenAt: new Date().toISOString(),
          }),
        }
      );

      const response = await POST(request, {
        params: Promise.resolve({ id: testPatientId, medId: fakeMedId })
      });

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.error).toContain('Medication not found');
    });
  });
});
