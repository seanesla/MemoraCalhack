import { describe, it, expect, beforeEach, afterAll, vi } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { POST } from '@/app/api/onboard/route';

const prisma = new PrismaClient();

// Mock Clerk auth function ONLY
// This is necessary because we can't create real Clerk sessions in automated tests
// The auth() function is a framework concern, not business logic
// Letta and Prisma use REAL APIs/database - NO MOCKS for business logic
let mockUserId: string | null = null;

vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn(() => Promise.resolve({ userId: mockUserId })),
}));

describe('Onboarding Endpoint Tests', () => {
  beforeEach(async () => {
    // Clean up database before each test
    await prisma.caregiver.deleteMany();
    await prisma.patient.deleteMany();

    // Reset mock user to null before each test
    mockUserId = null;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('POST /api/onboard - Patient Creation', () => {
    it('should create a Patient with all required fields', async () => {
      // Arrange: Mock authenticated user
      mockUserId = 'clerk_patient_12345';

      // Create mock Request object
      const request = new Request('http://localhost:3000/api/onboard', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          role: 'patient',
          name: 'John Smith',
          age: 72,
        }),
      });

      // Act: Call route handler directly
      const response = await POST(request);

      // Assert: Check response
      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.userId).toBeDefined();

      // Assert: Verify Patient record was created in database
      const patient = await prisma.patient.findUnique({
        where: { clerkId: mockUserId },
      });

      expect(patient).toBeDefined();
      expect(patient?.name).toBe('John Smith');
      expect(patient?.age).toBe(72);
      expect(patient?.diagnosisStage).toBeNull();
      expect(patient?.locationLabel).toBeNull();
      expect(patient?.preferredName).toBeNull();

      // Assert: Letta agent should be created
      expect(patient?.lettaAgentId).toBeDefined();
      expect(patient?.lettaAgentId).not.toBeNull();
      expect(typeof patient?.lettaAgentId).toBe('string');

      // Assert: Response should include agent ID
      expect(data.lettaAgentId).toBeDefined();
      expect(data.lettaAgentId).toBe(patient?.lettaAgentId);
    });

    it('should create a Patient with optional fields', async () => {
      // Arrange: Mock authenticated user
      mockUserId = 'clerk_patient_67890';

      const request = new Request('http://localhost:3000/api/onboard', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          role: 'patient',
          name: 'Jane Doe',
          age: 68,
          diagnosisStage: 'Early-stage Alzheimer\'s',
          locationLabel: 'San Francisco, CA',
          preferredName: 'Janie',
        }),
      });

      // Act: Call route handler directly
      const response = await POST(request);

      // Assert: Check response
      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.lettaAgentId).toBeDefined();

      // Assert: Verify Patient record with optional fields
      const patient = await prisma.patient.findUnique({
        where: { clerkId: mockUserId },
      });

      expect(patient).toBeDefined();
      expect(patient?.name).toBe('Jane Doe');
      expect(patient?.age).toBe(68);
      expect(patient?.diagnosisStage).toBe('Early-stage Alzheimer\'s');
      expect(patient?.locationLabel).toBe('San Francisco, CA');
      expect(patient?.preferredName).toBe('Janie');

      // Assert: Letta agent should be created
      expect(patient?.lettaAgentId).toBeDefined();
      expect(patient?.lettaAgentId).not.toBeNull();
      expect(typeof patient?.lettaAgentId).toBe('string');
    });

    it('should reject missing required fields (name)', async () => {
      // Arrange: Mock authenticated user
      mockUserId = 'clerk_patient_missing_name';

      const request = new Request('http://localhost:3000/api/onboard', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          role: 'patient',
          age: 70,
          // Missing name
        }),
      });

      // Act
      const response = await POST(request);

      // Assert: Should return 400 Bad Request
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('name');

      // Assert: No patient should be created
      const patientCount = await prisma.patient.count();
      expect(patientCount).toBe(0);
    });

    it('should reject missing required fields (age)', async () => {
      // Arrange: Mock authenticated user
      mockUserId = 'clerk_patient_missing_age';

      const request = new Request('http://localhost:3000/api/onboard', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          role: 'patient',
          name: 'Test Patient',
          // Missing age
        }),
      });

      // Act
      const response = await POST(request);

      // Assert: Should return 400 Bad Request
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('age');

      // Assert: No patient should be created
      const patientCount = await prisma.patient.count();
      expect(patientCount).toBe(0);
    });

    it('should reject invalid age (age <= 0)', async () => {
      // Arrange: Mock authenticated user
      mockUserId = 'clerk_patient_invalid_age';

      const request = new Request('http://localhost:3000/api/onboard', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          role: 'patient',
          name: 'Test Patient',
          age: -5,
        }),
      });

      // Act
      const response = await POST(request);

      // Assert: Should return 400 Bad Request
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('age');

      // Assert: No patient should be created
      const patientCount = await prisma.patient.count();
      expect(patientCount).toBe(0);
    });

    it('should reject invalid age (age = 0)', async () => {
      // Arrange: Mock authenticated user
      mockUserId = 'clerk_patient_zero_age';

      const request = new Request('http://localhost:3000/api/onboard', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          role: 'patient',
          name: 'Test Patient',
          age: 0,
        }),
      });

      // Act
      const response = await POST(request);

      // Assert: Should return 400 Bad Request
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('age');

      // Assert: No patient should be created
      const patientCount = await prisma.patient.count();
      expect(patientCount).toBe(0);
    });
  });

  describe('POST /api/onboard - Caregiver Creation', () => {
    it('should create a Caregiver with required fields', async () => {
      // Arrange: Mock authenticated user
      mockUserId = 'clerk_caregiver_12345';

      const request = new Request('http://localhost:3000/api/onboard', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          role: 'caregiver',
          name: 'Ava Smith',
          email: 'ava.smith@example.com',
        }),
      });

      // Act
      const response = await POST(request);

      // Assert: Check response
      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.success).toBe(true);

      // Assert: Verify Caregiver record was created in database
      const caregiver = await prisma.caregiver.findUnique({
        where: { clerkId: mockUserId },
      });

      expect(caregiver).toBeDefined();
      expect(caregiver?.name).toBe('Ava Smith');
      expect(caregiver?.email).toBe('ava.smith@example.com');
    });

    it('should create a Caregiver without email (optional)', async () => {
      // Arrange: Mock authenticated user
      mockUserId = 'clerk_caregiver_67890';

      const request = new Request('http://localhost:3000/api/onboard', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          role: 'caregiver',
          name: 'Bob Johnson',
          // No email provided
        }),
      });

      // Act
      const response = await POST(request);

      // Assert: Check response
      expect(response.status).toBe(201);

      // Assert: Verify Caregiver record without email
      const caregiver = await prisma.caregiver.findUnique({
        where: { clerkId: mockUserId },
      });

      expect(caregiver).toBeDefined();
      expect(caregiver?.name).toBe('Bob Johnson');
      expect(caregiver?.email).toBeNull();
    });
  });

  describe('POST /api/onboard - Validation & Security', () => {
    it('should reject unauthenticated requests', async () => {
      // Arrange: No authenticated user (mockUserId = null)
      mockUserId = null;

      const request = new Request('http://localhost:3000/api/onboard', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          role: 'patient',
          name: 'Test User',
          age: 70,
        }),
      });

      // Act
      const response = await POST(request);

      // Assert: Should return 401 Unauthorized
      expect(response.status).toBe(401);

      // Assert: No records should be created
      const patientCount = await prisma.patient.count();
      const caregiverCount = await prisma.caregiver.count();
      expect(patientCount).toBe(0);
      expect(caregiverCount).toBe(0);
    });

    it('should reject invalid role', async () => {
      // Arrange: Mock authenticated user
      mockUserId = 'clerk_invalid_role';

      const request = new Request('http://localhost:3000/api/onboard', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          role: 'admin', // Invalid role
          name: 'Test User',
        }),
      });

      // Act
      const response = await POST(request);

      // Assert: Should return 400 Bad Request
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('role');

      // Assert: No records should be created
      const patientCount = await prisma.patient.count();
      const caregiverCount = await prisma.caregiver.count();
      expect(patientCount).toBe(0);
      expect(caregiverCount).toBe(0);
    });

    it('should reject missing role', async () => {
      // Arrange: Mock authenticated user
      mockUserId = 'clerk_missing_role';

      const request = new Request('http://localhost:3000/api/onboard', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: 'Test User',
          age: 70,
          // Missing role
        }),
      });

      // Act
      const response = await POST(request);

      // Assert: Should return 400 Bad Request
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('role');

      // Assert: No records should be created
      const patientCount = await prisma.patient.count();
      const caregiverCount = await prisma.caregiver.count();
      expect(patientCount).toBe(0);
      expect(caregiverCount).toBe(0);
    });

    it('should handle duplicate clerkId (409 Conflict on duplicate)', async () => {
      // Arrange: Create a patient first
      const duplicateClerkId = 'clerk_duplicate_test';
      await prisma.patient.create({
        data: {
          clerkId: duplicateClerkId,
          name: 'Existing Patient',
          age: 70,
        },
      });

      // Arrange: Mock same authenticated user
      mockUserId = duplicateClerkId;

      const request = new Request('http://localhost:3000/api/onboard', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          role: 'patient',
          name: 'Duplicate Patient',
          age: 65,
        }),
      });

      // Act
      const response = await POST(request);

      // Assert: Should return 409 Conflict
      expect(response.status).toBe(409);
      const data = await response.json();
      expect(data.error).toContain('already onboarded');

      // Assert: Should still have only 1 patient
      const patientCount = await prisma.patient.count();
      expect(patientCount).toBe(1);

      // Assert: Original patient data should be unchanged
      const patient = await prisma.patient.findUnique({
        where: { clerkId: duplicateClerkId },
      });
      expect(patient?.name).toBe('Existing Patient');
      expect(patient?.age).toBe(70);
    });

    it('should reject empty string for required fields', async () => {
      // Arrange: Mock authenticated user
      mockUserId = 'clerk_empty_name';

      const request = new Request('http://localhost:3000/api/onboard', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          role: 'patient',
          name: '', // Empty string
          age: 70,
        }),
      });

      // Act
      const response = await POST(request);

      // Assert: Should return 400 Bad Request
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('name');

      // Assert: No patient should be created
      const patientCount = await prisma.patient.count();
      expect(patientCount).toBe(0);
    });
  });
});
