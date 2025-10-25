import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

describe('Database Schema Tests', () => {
  // Clean up database before each test
  beforeEach(async () => {
    // Delete in reverse order of foreign key dependencies
    await prisma.medicationDose.deleteMany();
    await prisma.medication.deleteMany();
    await prisma.dailyActivity.deleteMany();
    await prisma.sleepLog.deleteMany();
    await prisma.timelineEvent.deleteMany();
    await prisma.message.deleteMany();
    await prisma.conversation.deleteMany();
    await prisma.behavioralMetrics.deleteMany();
    await prisma.privacyConsent.deleteMany();
    await prisma.patientInsights.deleteMany();
    await prisma.alertConfiguration.deleteMany();
    await prisma.caregiver.deleteMany();
    await prisma.patient.deleteMany();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('Patient Model', () => {
    it('should create a patient with all required fields', async () => {
      const patient = await prisma.patient.create({
        data: {
          clerkId: 'clerk_test_patient_123',
          name: 'John Smith',
          age: 72,
          diagnosisStage: "Early-stage Alzheimer's",
          locationLabel: 'Palo Alto, CA',
          lettaAgentId: 'agent_test_123',
        },
      });

      expect(patient.id).toBeDefined();
      expect(patient.name).toBe('John Smith');
      expect(patient.age).toBe(72);
      expect(patient.lettaAgentId).toBe('agent_test_123');
      expect(patient.createdAt).toBeInstanceOf(Date);
    });

    it('should enforce unique clerkId constraint', async () => {
      await prisma.patient.create({
        data: {
          clerkId: 'clerk_duplicate_test',
          name: 'Test Patient',
          age: 70,
          diagnosisStage: 'Moderate-stage',
        },
      });

      // Attempting to create another patient with same clerkId should fail
      await expect(
        prisma.patient.create({
          data: {
            clerkId: 'clerk_duplicate_test',
            name: 'Another Patient',
            age: 68,
            diagnosisStage: 'Early-stage',
          },
        })
      ).rejects.toThrow();
    });

    it('should allow optional lettaAgentId', async () => {
      const patient = await prisma.patient.create({
        data: {
          clerkId: 'clerk_no_agent',
          name: 'Test Patient',
          age: 65,
          diagnosisStage: 'Early-stage',
        },
      });

      expect(patient.lettaAgentId).toBeNull();
    });
  });

  describe('Caregiver Model', () => {
    it('should create a caregiver', async () => {
      const caregiver = await prisma.caregiver.create({
        data: {
          clerkId: 'clerk_caregiver_123',
          name: 'Ava Smith',
          email: 'ava@example.com',
        },
      });

      expect(caregiver.id).toBeDefined();
      expect(caregiver.name).toBe('Ava Smith');
      expect(caregiver.email).toBe('ava@example.com');
    });

    it('should enforce unique clerkId constraint', async () => {
      await prisma.caregiver.create({
        data: {
          clerkId: 'clerk_caregiver_dup',
          name: 'Caregiver One',
          email: 'one@example.com',
        },
      });

      await expect(
        prisma.caregiver.create({
          data: {
            clerkId: 'clerk_caregiver_dup',
            name: 'Caregiver Two',
            email: 'two@example.com',
          },
        })
      ).rejects.toThrow();
    });
  });

  describe('Medication Model and Foreign Keys', () => {
    let patientId: string;

    beforeEach(async () => {
      const patient = await prisma.patient.create({
        data: {
          clerkId: 'clerk_med_test',
          name: 'Test Patient',
          age: 70,
          diagnosisStage: 'Moderate',
        },
      });
      patientId = patient.id;
    });

    it('should create medication with valid patientId', async () => {
      const medication = await prisma.medication.create({
        data: {
          patientId,
          name: 'Leqembi',
          dosage: '10mg',
          timeOfDay: 'Evening',
          reminderTime: '20:00',
          active: true,
        },
      });

      expect(medication.id).toBeDefined();
      expect(medication.name).toBe('Leqembi');
      expect(medication.patientId).toBe(patientId);
    });

    it('should reject medication with invalid patientId', async () => {
      await expect(
        prisma.medication.create({
          data: {
            patientId: 'non_existent_patient_id',
            name: 'Test Drug',
            dosage: '5mg',
            timeOfDay: 'Morning',
            active: true,
          },
        })
      ).rejects.toThrow();
    });

    it('should cascade delete medications when patient is deleted', async () => {
      await prisma.medication.create({
        data: {
          patientId,
          name: 'Test Med',
          dosage: '10mg',
          timeOfDay: 'Morning',
          active: true,
        },
      });

      await prisma.patient.delete({
        where: { id: patientId },
      });

      const medications = await prisma.medication.findMany({
        where: { patientId },
      });

      expect(medications).toHaveLength(0);
    });
  });

  describe('PatientInsights Model with Array Fields', () => {
    let patientId: string;

    beforeEach(async () => {
      const patient = await prisma.patient.create({
        data: {
          clerkId: 'clerk_insights_test',
          name: 'Test Patient',
          age: 68,
          diagnosisStage: 'Moderate-stage',
        },
      });
      patientId = patient.id;
    });

    it('should create insights with array fields', async () => {
      const insights = await prisma.patientInsights.create({
        data: {
          patientId,
          concerns: ['Memory lapses', 'Anxiety episodes', 'Disorientation'],
          positiveMoments: [
            "Recalled daughter's name unprompted",
            'Engaged in 10-minute conversation',
          ],
          memoryTopicsToReinforce: ['Family names', 'Daily routine', 'Home address'],
          mood: 'neutral',
          streakDays: 5,
        },
      });

      expect(insights.concerns).toHaveLength(3);
      expect(insights.concerns).toContain('Memory lapses');
      expect(insights.positiveMoments).toHaveLength(2);
      expect(insights.memoryTopicsToReinforce).toHaveLength(3);
      expect(insights.streakDays).toBe(5);
    });

    it('should allow empty arrays', async () => {
      const insights = await prisma.patientInsights.create({
        data: {
          patientId,
          concerns: [],
          positiveMoments: [],
          memoryTopicsToReinforce: [],
          mood: 'good',
          streakDays: 0,
        },
      });

      expect(insights.concerns).toHaveLength(0);
      expect(insights.positiveMoments).toHaveLength(0);
    });

    it('should enforce unique patientId constraint', async () => {
      await prisma.patientInsights.create({
        data: {
          patientId,
          concerns: [],
          positiveMoments: [],
          memoryTopicsToReinforce: [],
          mood: 'neutral',
          streakDays: 0,
        },
      });

      // Attempting to create another insights record for same patient should fail
      await expect(
        prisma.patientInsights.create({
          data: {
            patientId,
            concerns: ['Test'],
            positiveMoments: [],
            memoryTopicsToReinforce: [],
            mood: 'good',
            streakDays: 1,
          },
        })
      ).rejects.toThrow();
    });
  });

  describe('Conversation and Message Models', () => {
    let patientId: string;

    beforeEach(async () => {
      const patient = await prisma.patient.create({
        data: {
          clerkId: 'clerk_conv_test',
          name: 'Test Patient',
          age: 70,
          diagnosisStage: 'Early',
        },
      });
      patientId = patient.id;
    });

    it('should create conversation with messages', async () => {
      const conversation = await prisma.conversation.create({
        data: {
          patientId,
          title: 'Morning Chat',
          startedAt: new Date(),
        },
      });

      const message1 = await prisma.message.create({
        data: {
          conversationId: conversation.id,
          role: 'USER',
          content: 'What day is it today?',
          timestamp: new Date(),
        },
      });

      const message2 = await prisma.message.create({
        data: {
          conversationId: conversation.id,
          role: 'ASSISTANT',
          content: 'Today is Monday, October 25th, 2025.',
          timestamp: new Date(),
        },
      });

      expect(message1.conversationId).toBe(conversation.id);
      expect(message2.conversationId).toBe(conversation.id);

      // Fetch messages for conversation
      const messages = await prisma.message.findMany({
        where: { conversationId: conversation.id },
        orderBy: { timestamp: 'asc' },
      });

      expect(messages).toHaveLength(2);
      expect(messages[0].role).toBe('USER');
      expect(messages[1].role).toBe('ASSISTANT');
    });

    it('should track message edits with edited flag', async () => {
      const conversation = await prisma.conversation.create({
        data: {
          patientId,
          title: 'Test Conversation',
          startedAt: new Date(),
        },
      });

      const message = await prisma.message.create({
        data: {
          conversationId: conversation.id,
          role: 'USER',
          content: 'Original message',
          timestamp: new Date(),
          edited: false,
        },
      });

      // Update message to mark as edited
      const updatedMessage = await prisma.message.update({
        where: { id: message.id },
        data: {
          content: 'Edited message',
          edited: true,
        },
      });

      expect(updatedMessage.edited).toBe(true);
      expect(updatedMessage.content).toBe('Edited message');
    });
  });

  describe('BehavioralMetrics Model with Unique Constraint', () => {
    let patientId: string;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    beforeEach(async () => {
      const patient = await prisma.patient.create({
        data: {
          clerkId: 'clerk_metrics_test',
          name: 'Test Patient',
          age: 72,
          diagnosisStage: 'Moderate',
        },
      });
      patientId = patient.id;
    });

    it('should create behavioral metrics for a specific date', async () => {
      const metrics = await prisma.behavioralMetrics.create({
        data: {
          patientId,
          date: today,
          avgResponseTimeMs: 1800,
          responseTimeBaseline: 2100,
          unpromptedRecallCount: 2,
          unpromptedRecallExamples: JSON.stringify([
            'I remember when we went to Big Sur',
            'Lily had her piano recital',
          ]),
          dateChecksCount: 2,
          timeChecksCount: 1,
          repeatedQuestions: JSON.stringify([
            { question: 'What day is it?', count: 5 },
          ]),
          repetitionBaseline: 2.5,
        },
      });

      expect(metrics.avgResponseTimeMs).toBe(1800);
      expect(metrics.unpromptedRecallCount).toBe(2);
    });

    it('should enforce unique patientId + date constraint', async () => {
      await prisma.behavioralMetrics.create({
        data: {
          patientId,
          date: today,
          avgResponseTimeMs: 1500,
          unpromptedRecallCount: 0,
          dateChecksCount: 0,
          timeChecksCount: 0,
        },
      });

      // Attempting to create another metrics record for same patient + date should fail
      await expect(
        prisma.behavioralMetrics.create({
          data: {
            patientId,
            date: today,
            avgResponseTimeMs: 2000,
            unpromptedRecallCount: 1,
            dateChecksCount: 1,
            timeChecksCount: 0,
          },
        })
      ).rejects.toThrow();
    });
  });

  describe('PrivacyConsent Model', () => {
    let patientId: string;

    beforeEach(async () => {
      const patient = await prisma.patient.create({
        data: {
          clerkId: 'clerk_privacy_test',
          name: 'Test Patient',
          age: 70,
          diagnosisStage: 'Early',
        },
      });
      patientId = patient.id;
    });

    it('should create privacy consent change record', async () => {
      const consent = await prisma.privacyConsent.create({
        data: {
          patientId,
          consentType: 'LOCATION_TRACKING',
          enabled: false,
          impact: 'Wandering alerts will not function while this is disabled.',
        },
      });

      expect(consent.consentType).toBe('LOCATION_TRACKING');
      expect(consent.enabled).toBe(false);
      expect(consent.impact).toBeDefined();
      expect(consent.changedAt).toBeInstanceOf(Date);
    });

    it('should support all consent types', async () => {
      const types = [
        'LOCATION_TRACKING',
        'CONVERSATION_RECORDING',
        'MEDICATION_TRACKING',
        'ACTIVITY_MONITORING',
      ];

      for (const type of types) {
        const consent = await prisma.privacyConsent.create({
          data: {
            patientId,
            consentType: type,
            enabled: true,
            impact: 'Test impact',
          },
        });

        expect(consent.consentType).toBe(type);
      }

      const allConsents = await prisma.privacyConsent.findMany({
        where: { patientId },
      });

      expect(allConsents).toHaveLength(4);
    });
  });
});
