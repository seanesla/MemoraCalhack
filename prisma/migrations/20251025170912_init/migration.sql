-- CreateEnum
CREATE TYPE "MessageRole" AS ENUM ('USER', 'ASSISTANT', 'SYSTEM');

-- CreateEnum
CREATE TYPE "PrivacyConsentType" AS ENUM ('LOCATION_TRACKING', 'CONVERSATION_RECORDING', 'MEDICATION_TRACKING', 'ACTIVITY_MONITORING');

-- CreateEnum
CREATE TYPE "EventType" AS ENUM ('CONVERSATION', 'SENSOR_ALERT', 'PATTERN_CHANGE', 'MEMORY_UPDATE', 'MEDICATION', 'ACTIVITY');

-- CreateEnum
CREATE TYPE "Severity" AS ENUM ('INFO', 'WARNING', 'CRITICAL');

-- CreateTable
CREATE TABLE "patients" (
    "id" TEXT NOT NULL,
    "clerkId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "age" INTEGER NOT NULL,
    "preferredName" TEXT,
    "locationLabel" TEXT,
    "diagnosisStage" TEXT,
    "currentRoutineFocus" TEXT,
    "lastCheckIn" TIMESTAMP(3),
    "lettaAgentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "patients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "caregivers" (
    "id" TEXT NOT NULL,
    "clerkId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "caregivers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conversations" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "title" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
    "duration" INTEGER,

    CONSTRAINT "conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "messages" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "role" "MessageRole" NOT NULL,
    "content" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "edited" BOOLEAN NOT NULL DEFAULT false,
    "editedAt" TIMESTAMP(3),

    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "medications" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "dosage" TEXT NOT NULL,
    "timeOfDay" TEXT NOT NULL,
    "reminderTime" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "medications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "medication_doses" (
    "id" TEXT NOT NULL,
    "medicationId" TEXT NOT NULL,
    "scheduledFor" TIMESTAMP(3) NOT NULL,
    "takenAt" TIMESTAMP(3),
    "skipped" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "medication_doses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "daily_activities" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "activityType" TEXT NOT NULL,
    "description" TEXT,
    "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "duration" INTEGER,

    CONSTRAINT "daily_activities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sleep_logs" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "bedtime" TIMESTAMP(3),
    "wakeTime" TIMESTAMP(3),
    "totalHours" DOUBLE PRECISION,
    "quality" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sleep_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "behavioral_metrics" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "avgResponseTimeMs" INTEGER,
    "responseTimeBaseline" INTEGER,
    "unpromptedRecallCount" INTEGER NOT NULL DEFAULT 0,
    "unpromptedRecallExamples" TEXT,
    "dateChecksCount" INTEGER NOT NULL DEFAULT 0,
    "timeChecksCount" INTEGER NOT NULL DEFAULT 0,
    "repeatedQuestions" TEXT,
    "repetitionBaseline" DOUBLE PRECISION,
    "moodScore" DOUBLE PRECISION,
    "engagementScore" DOUBLE PRECISION,
    "calculatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "behavioral_metrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "privacy_consents" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "consentType" "PrivacyConsentType" NOT NULL,
    "enabled" BOOLEAN NOT NULL,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "impact" TEXT,

    CONSTRAINT "privacy_consents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "timeline_events" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "type" "EventType" NOT NULL,
    "severity" "Severity" NOT NULL,
    "summary" TEXT NOT NULL,
    "details" JSONB,

    CONSTRAINT "timeline_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "patient_insights" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "mood" TEXT,
    "streakDays" INTEGER NOT NULL DEFAULT 0,
    "concerns" TEXT[],
    "positiveMoments" TEXT[],
    "memoryTopicsToReinforce" TEXT[],
    "lastUpdated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "patient_insights_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alert_configurations" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "wanderingEnabled" BOOLEAN NOT NULL DEFAULT true,
    "wanderingSafeRadius" INTEGER NOT NULL DEFAULT 110,
    "wanderingQuietStart" TEXT NOT NULL DEFAULT '21:00',
    "wanderingQuietEnd" TEXT NOT NULL DEFAULT '06:00',
    "wanderingChannels" TEXT[],
    "activityEnabled" BOOLEAN NOT NULL DEFAULT true,
    "activityThresholdHours" INTEGER NOT NULL DEFAULT 3,
    "activityChannels" TEXT[],
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "alert_configurations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "patients_clerkId_key" ON "patients"("clerkId");

-- CreateIndex
CREATE UNIQUE INDEX "patients_lettaAgentId_key" ON "patients"("lettaAgentId");

-- CreateIndex
CREATE UNIQUE INDEX "caregivers_clerkId_key" ON "caregivers"("clerkId");

-- CreateIndex
CREATE INDEX "conversations_patientId_startedAt_idx" ON "conversations"("patientId", "startedAt" DESC);

-- CreateIndex
CREATE INDEX "messages_conversationId_timestamp_idx" ON "messages"("conversationId", "timestamp");

-- CreateIndex
CREATE INDEX "medications_patientId_active_idx" ON "medications"("patientId", "active");

-- CreateIndex
CREATE INDEX "medication_doses_medicationId_scheduledFor_idx" ON "medication_doses"("medicationId", "scheduledFor" DESC);

-- CreateIndex
CREATE INDEX "daily_activities_patientId_date_idx" ON "daily_activities"("patientId", "date" DESC);

-- CreateIndex
CREATE INDEX "sleep_logs_patientId_date_idx" ON "sleep_logs"("patientId", "date" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "sleep_logs_patientId_date_key" ON "sleep_logs"("patientId", "date");

-- CreateIndex
CREATE INDEX "behavioral_metrics_patientId_date_idx" ON "behavioral_metrics"("patientId", "date" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "behavioral_metrics_patientId_date_key" ON "behavioral_metrics"("patientId", "date");

-- CreateIndex
CREATE INDEX "privacy_consents_patientId_changedAt_idx" ON "privacy_consents"("patientId", "changedAt" DESC);

-- CreateIndex
CREATE INDEX "timeline_events_patientId_timestamp_idx" ON "timeline_events"("patientId", "timestamp" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "patient_insights_patientId_key" ON "patient_insights"("patientId");

-- CreateIndex
CREATE UNIQUE INDEX "alert_configurations_patientId_key" ON "alert_configurations"("patientId");

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medications" ADD CONSTRAINT "medications_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medication_doses" ADD CONSTRAINT "medication_doses_medicationId_fkey" FOREIGN KEY ("medicationId") REFERENCES "medications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_activities" ADD CONSTRAINT "daily_activities_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sleep_logs" ADD CONSTRAINT "sleep_logs_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "behavioral_metrics" ADD CONSTRAINT "behavioral_metrics_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "privacy_consents" ADD CONSTRAINT "privacy_consents_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "timeline_events" ADD CONSTRAINT "timeline_events_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient_insights" ADD CONSTRAINT "patient_insights_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alert_configurations" ADD CONSTRAINT "alert_configurations_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;
