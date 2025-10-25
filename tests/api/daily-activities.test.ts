/**
 * Daily Activities API Tests
 *
 * Tests for Phase 5: Daily Activities CRUD operations
 * Following TDD approach - tests written BEFORE implementation
 *
 * Endpoints tested:
 * - GET /api/patients/[id]/daily-activities - Get all activities for patient
 * - POST /api/patients/[id]/daily-activities - Create new activity
 * - GET /api/patients/[id]/daily-activities/today - Get today's activities
 */

import { describe, it, expect, beforeEach, afterAll, vi } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { startOfDay, endOfDay } from 'date-fns';

const prisma = new PrismaClient();

// Mock Clerk auth - framework concern only
let mockUserId: string | null = null;

vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn(() => Promise.resolve({ userId: mockUserId })),
}));

describe('Daily Activities API Tests', () => {
  let testPatientId: string;

  beforeEach(async () => {
    // Clean up database
    await prisma.dailyActivity.deleteMany();
    await prisma.patient.deleteMany();

    // Create test patient
    mockUserId = 'clerk_test_activities_user';
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

  describe('GET /api/patients/[id]/daily-activities', () => {
    it('should return empty array when patient has no activities', async () => {
      const { GET } = await import('@/app/api/patients/[id]/daily-activities/route');

      const request = new Request(`http://localhost:3000/api/patients/${testPatientId}/daily-activities`);
      const response = await GET(request, { params: Promise.resolve({ id: testPatientId }) });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.activities).toEqual([]);
    });

    it('should return all activities for patient ordered by date descending', async () => {
      // Arrange: Create test activities
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      await prisma.dailyActivity.createMany({
        data: [
          {
            patientId: testPatientId,
            date: today,
            activityType: 'Exercise',
            description: 'Morning walk',
            duration: 30,
          },
          {
            patientId: testPatientId,
            date: yesterday,
            activityType: 'Social',
            description: 'Called daughter',
            duration: 15,
          },
        ],
      });

      const { GET } = await import('@/app/api/patients/[id]/daily-activities/route');

      const request = new Request(`http://localhost:3000/api/patients/${testPatientId}/daily-activities`);
      const response = await GET(request, { params: Promise.resolve({ id: testPatientId }) });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.activities).toHaveLength(2);
      // Most recent first
      expect(data.activities[0].activityType).toBe('Exercise');
      expect(data.activities[1].activityType).toBe('Social');
    });

    it('should return 404 when patient does not exist', async () => {
      const { GET } = await import('@/app/api/patients/[id]/daily-activities/route');

      const fakePatientId = 'nonexistent_patient_id';
      const request = new Request(`http://localhost:3000/api/patients/${fakePatientId}/daily-activities`);
      const response = await GET(request, { params: Promise.resolve({ id: fakePatientId }) });

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.error).toBeDefined();
    });
  });

  describe('POST /api/patients/[id]/daily-activities', () => {
    it('should create a new activity with all required fields', async () => {
      const { POST } = await import('@/app/api/patients/[id]/daily-activities/route');

      const today = new Date();
      const request = new Request(`http://localhost:3000/api/patients/${testPatientId}/daily-activities`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: today.toISOString(),
          activityType: 'Exercise',
          description: 'Morning walk in park',
          duration: 30,
        }),
      });

      const response = await POST(request, { params: Promise.resolve({ id: testPatientId }) });

      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.activity.activityType).toBe('Exercise');
      expect(data.activity.description).toBe('Morning walk in park');
      expect(data.activity.duration).toBe(30);

      // Verify in database
      const activity = await prisma.dailyActivity.findFirst({
        where: { patientId: testPatientId, activityType: 'Exercise' },
      });
      expect(activity).toBeDefined();
      expect(activity?.description).toBe('Morning walk in park');
    });

    it('should create activity without optional duration', async () => {
      const { POST } = await import('@/app/api/patients/[id]/daily-activities/route');

      const today = new Date();
      const request = new Request(`http://localhost:3000/api/patients/${testPatientId}/daily-activities`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: today.toISOString(),
          activityType: 'Social',
          description: 'Phone call with family',
        }),
      });

      const response = await POST(request, { params: Promise.resolve({ id: testPatientId }) });

      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.activity.activityType).toBe('Social');
      expect(data.activity.duration).toBeNull();
    });

    it('should return 400 when required fields are missing', async () => {
      const { POST } = await import('@/app/api/patients/[id]/daily-activities/route');

      const request = new Request(`http://localhost:3000/api/patients/${testPatientId}/daily-activities`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          activityType: 'Exercise',
          // Missing date
        }),
      });

      const response = await POST(request, { params: Promise.resolve({ id: testPatientId }) });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBeDefined();
    });

    it('should return 404 when patient does not exist', async () => {
      const { POST } = await import('@/app/api/patients/[id]/daily-activities/route');

      const fakePatientId = 'nonexistent_patient_id';
      const today = new Date();
      const request = new Request(`http://localhost:3000/api/patients/${fakePatientId}/daily-activities`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: today.toISOString(),
          activityType: 'Exercise',
        }),
      });

      const response = await POST(request, { params: Promise.resolve({ id: fakePatientId }) });

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.error).toContain('Patient not found');
    });
  });

  describe('GET /api/patients/[id]/daily-activities/today', () => {
    it('should return only today\'s activities', async () => {
      // Arrange: Create activities for today and yesterday
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      await prisma.dailyActivity.createMany({
        data: [
          {
            patientId: testPatientId,
            date: today,
            activityType: 'Exercise',
            description: 'Morning walk',
            duration: 30,
          },
          {
            patientId: testPatientId,
            date: today,
            activityType: 'Social',
            description: 'Video call',
            duration: 45,
          },
          {
            patientId: testPatientId,
            date: yesterday,
            activityType: 'Hobby',
            description: 'Reading',
            duration: 60,
          },
        ],
      });

      const { GET } = await import('@/app/api/patients/[id]/daily-activities/today/route');

      const request = new Request(`http://localhost:3000/api/patients/${testPatientId}/daily-activities/today`);
      const response = await GET(request, { params: Promise.resolve({ id: testPatientId }) });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.activities).toHaveLength(2);
      expect(data.activities[0].activityType).toBe('Exercise');
      expect(data.activities[1].activityType).toBe('Social');
    });

    it('should calculate completion stats correctly', async () => {
      // Arrange: Create 5 activities for today
      const today = new Date();
      await prisma.dailyActivity.createMany({
        data: [
          {
            patientId: testPatientId,
            date: today,
            activityType: 'Exercise',
            description: 'Walk',
            duration: 30,
          },
          {
            patientId: testPatientId,
            date: today,
            activityType: 'Social',
            description: 'Call',
            duration: 15,
          },
          {
            patientId: testPatientId,
            date: today,
            activityType: 'Hobby',
            description: 'Reading',
            duration: 45,
          },
          {
            patientId: testPatientId,
            date: today,
            activityType: 'Cognitive',
            description: 'Puzzle',
            duration: 20,
          },
          {
            patientId: testPatientId,
            date: today,
            activityType: 'Meal',
            description: 'Lunch',
            duration: 30,
          },
        ],
      });

      const { GET } = await import('@/app/api/patients/[id]/daily-activities/today/route');

      const request = new Request(`http://localhost:3000/api/patients/${testPatientId}/daily-activities/today`);
      const response = await GET(request, { params: Promise.resolve({ id: testPatientId }) });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.stats.totalActivities).toBe(5);
      expect(data.stats.totalMinutes).toBe(140); // 30+15+45+20+30
    });

    it('should return empty array when no activities today', async () => {
      const { GET } = await import('@/app/api/patients/[id]/daily-activities/today/route');

      const request = new Request(`http://localhost:3000/api/patients/${testPatientId}/daily-activities/today`);
      const response = await GET(request, { params: Promise.resolve({ id: testPatientId }) });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.activities).toEqual([]);
      expect(data.stats.totalActivities).toBe(0);
      expect(data.stats.totalMinutes).toBe(0);
    });
  });
});
