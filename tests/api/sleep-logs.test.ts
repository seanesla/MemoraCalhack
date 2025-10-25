/**
 * Sleep Logs API Tests
 *
 * Tests for Phase 5: Sleep Logs CRUD operations
 * Following TDD approach - tests written BEFORE implementation
 *
 * Endpoints tested:
 * - GET /api/patients/[id]/sleep-logs - Get all sleep logs for patient
 * - POST /api/patients/[id]/sleep-logs - Create/update sleep log
 * - GET /api/patients/[id]/sleep-logs/today - Get today's sleep log
 */

import { describe, it, expect, beforeEach, afterAll, vi } from 'vitest';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Mock Clerk auth - framework concern only
let mockUserId: string | null = null;

vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn(() => Promise.resolve({ userId: mockUserId })),
}));

describe('Sleep Logs API Tests', () => {
  let testPatientId: string;

  beforeEach(async () => {
    // Clean up database
    await prisma.sleepLog.deleteMany();
    await prisma.patient.deleteMany();

    // Create test patient
    mockUserId = 'clerk_test_sleep_user';
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

  describe('GET /api/patients/[id]/sleep-logs', () => {
    it('should return empty array when patient has no sleep logs', async () => {
      const { GET } = await import('@/app/api/patients/[id]/sleep-logs/route');

      const request = new Request(`http://localhost:3000/api/patients/${testPatientId}/sleep-logs`);
      const response = await GET(request, { params: Promise.resolve({ id: testPatientId }) });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.sleepLogs).toEqual([]);
    });

    it('should return all sleep logs ordered by date descending', async () => {
      // Arrange: Create test sleep logs
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      await prisma.sleepLog.createMany({
        data: [
          {
            patientId: testPatientId,
            date: today,
            totalHours: 7.5,
            quality: 'Good',
          },
          {
            patientId: testPatientId,
            date: yesterday,
            totalHours: 6.0,
            quality: 'Fair',
          },
        ],
      });

      const { GET } = await import('@/app/api/patients/[id]/sleep-logs/route');

      const request = new Request(`http://localhost:3000/api/patients/${testPatientId}/sleep-logs`);
      const response = await GET(request, { params: Promise.resolve({ id: testPatientId }) });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.sleepLogs).toHaveLength(2);
      // Most recent first
      expect(data.sleepLogs[0].totalHours).toBe(7.5);
      expect(data.sleepLogs[1].totalHours).toBe(6.0);
    });

    it('should return 404 when patient does not exist', async () => {
      const { GET } = await import('@/app/api/patients/[id]/sleep-logs/route');

      const fakePatientId = 'nonexistent_patient_id';
      const request = new Request(`http://localhost:3000/api/patients/${fakePatientId}/sleep-logs`);
      const response = await GET(request, { params: Promise.resolve({ id: fakePatientId }) });

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.error).toBeDefined();
    });
  });

  describe('POST /api/patients/[id]/sleep-logs', () => {
    it('should create a new sleep log with complete data', async () => {
      const { POST } = await import('@/app/api/patients/[id]/sleep-logs/route');

      const today = new Date();
      const bedtime = new Date(today);
      bedtime.setHours(22, 0, 0, 0);
      const wakeTime = new Date(today);
      wakeTime.setHours(6, 30, 0, 0);

      const request = new Request(`http://localhost:3000/api/patients/${testPatientId}/sleep-logs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: today.toISOString(),
          bedtime: bedtime.toISOString(),
          wakeTime: wakeTime.toISOString(),
          totalHours: 8.5,
          quality: 'Good',
          notes: 'Slept well, no interruptions',
        }),
      });

      const response = await POST(request, { params: Promise.resolve({ id: testPatientId }) });

      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.sleepLog.totalHours).toBe(8.5);
      expect(data.sleepLog.quality).toBe('Good');
      expect(data.sleepLog.notes).toBe('Slept well, no interruptions');

      // Verify in database
      const sleepLog = await prisma.sleepLog.findFirst({
        where: { patientId: testPatientId },
      });
      expect(sleepLog).toBeDefined();
      expect(sleepLog?.totalHours).toBe(8.5);
    });

    it('should create minimal sleep log with only date', async () => {
      const { POST } = await import('@/app/api/patients/[id]/sleep-logs/route');

      const today = new Date();
      const request = new Request(`http://localhost:3000/api/patients/${testPatientId}/sleep-logs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: today.toISOString(),
        }),
      });

      const response = await POST(request, { params: Promise.resolve({ id: testPatientId }) });

      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.sleepLog.bedtime).toBeNull();
      expect(data.sleepLog.wakeTime).toBeNull();
      expect(data.sleepLog.totalHours).toBeNull();
      expect(data.sleepLog.quality).toBeNull();
    });

    it('should update existing sleep log for same date (upsert)', async () => {
      // Arrange: Create initial sleep log
      const today = new Date();
      await prisma.sleepLog.create({
        data: {
          patientId: testPatientId,
          date: today,
          totalHours: 6.0,
          quality: 'Fair',
        },
      });

      const { POST } = await import('@/app/api/patients/[id]/sleep-logs/route');

      // Update with better data
      const request = new Request(`http://localhost:3000/api/patients/${testPatientId}/sleep-logs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: today.toISOString(),
          totalHours: 8.0,
          quality: 'Excellent',
        }),
      });

      const response = await POST(request, { params: Promise.resolve({ id: testPatientId }) });

      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.sleepLog.totalHours).toBe(8.0);
      expect(data.sleepLog.quality).toBe('Excellent');

      // Verify only one record exists
      const sleepLogs = await prisma.sleepLog.findMany({
        where: { patientId: testPatientId },
      });
      expect(sleepLogs).toHaveLength(1);
    });

    it('should return 400 when date is missing', async () => {
      const { POST } = await import('@/app/api/patients/[id]/sleep-logs/route');

      const request = new Request(`http://localhost:3000/api/patients/${testPatientId}/sleep-logs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          totalHours: 7.5,
          // Missing date
        }),
      });

      const response = await POST(request, { params: Promise.resolve({ id: testPatientId }) });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBeDefined();
    });

    it('should return 404 when patient does not exist', async () => {
      const { POST } = await import('@/app/api/patients/[id]/sleep-logs/route');

      const fakePatientId = 'nonexistent_patient_id';
      const today = new Date();
      const request = new Request(`http://localhost:3000/api/patients/${fakePatientId}/sleep-logs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: today.toISOString(),
          totalHours: 7.5,
        }),
      });

      const response = await POST(request, { params: Promise.resolve({ id: fakePatientId }) });

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.error).toContain('Patient not found');
    });
  });

  describe('GET /api/patients/[id]/sleep-logs/today', () => {
    it('should return today\'s sleep log', async () => {
      // Arrange: Create sleep log for today
      const today = new Date();
      await prisma.sleepLog.create({
        data: {
          patientId: testPatientId,
          date: today,
          totalHours: 7.5,
          quality: 'Good',
        },
      });

      const { GET } = await import('@/app/api/patients/[id]/sleep-logs/today/route');

      const request = new Request(`http://localhost:3000/api/patients/${testPatientId}/sleep-logs/today`);
      const response = await GET(request, { params: Promise.resolve({ id: testPatientId }) });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.sleepLog).toBeDefined();
      expect(data.sleepLog.totalHours).toBe(7.5);
      expect(data.sleepLog.quality).toBe('Good');
    });

    it('should return null when no sleep log exists for today', async () => {
      const { GET } = await import('@/app/api/patients/[id]/sleep-logs/today/route');

      const request = new Request(`http://localhost:3000/api/patients/${testPatientId}/sleep-logs/today`);
      const response = await GET(request, { params: Promise.resolve({ id: testPatientId }) });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.sleepLog).toBeNull();
    });

    it('should not return yesterday\'s sleep log', async () => {
      // Arrange: Create sleep log for yesterday only
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      await prisma.sleepLog.create({
        data: {
          patientId: testPatientId,
          date: yesterday,
          totalHours: 6.0,
          quality: 'Fair',
        },
      });

      const { GET } = await import('@/app/api/patients/[id]/sleep-logs/today/route');

      const request = new Request(`http://localhost:3000/api/patients/${testPatientId}/sleep-logs/today`);
      const response = await GET(request, { params: Promise.resolve({ id: testPatientId }) });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.sleepLog).toBeNull();
    });
  });
});
