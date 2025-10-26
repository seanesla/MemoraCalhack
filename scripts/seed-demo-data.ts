/**
 * Seed Demo Data
 *
 * Creates realistic medications, activities, and sleep logs for demo patient
 * so the dashboard looks impressive for hackathon judges.
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const DEMO_PATIENT_ID = 'cmh6xjz9q00008omek5epf02t';
const DEMO_PATIENT_CLERK_ID = 'clerk_demo_patient_global';
const DEMO_CAREGIVER_CLERK_ID = 'clerk_demo_caregiver_global';

async function seedDemoData() {
  console.log('Seeding demo data for patient:', DEMO_PATIENT_ID);

  // Verify patient exists
  const patient = await prisma.patient.findUnique({
    where: { id: DEMO_PATIENT_ID },
  });

  if (!patient) {
    console.error('Demo patient not found!');
    process.exit(1);
  }

  console.log('Found patient:', patient.name);

  // ===== CAREGIVER-PATIENT RELATIONSHIP =====
  console.log('\nSetting up caregiver-patient relationship...');

  // Find or create demo caregiver
  let caregiver = await prisma.caregiver.findUnique({
    where: { clerkId: DEMO_CAREGIVER_CLERK_ID },
  });

  if (!caregiver) {
    caregiver = await prisma.caregiver.create({
      data: {
        clerkId: DEMO_CAREGIVER_CLERK_ID,
        name: 'Demo Caregiver',
        email: 'demo-caregiver@memora.care',
      },
    });
    console.log('Created demo caregiver:', caregiver.name);
  } else {
    console.log('Found existing demo caregiver:', caregiver.name);
  }

  // Create caregiver-patient relationship if it doesn't exist
  const existingRelationship = await prisma.caregiverPatient.findUnique({
    where: {
      caregiverId_patientId: {
        caregiverId: caregiver.id,
        patientId: patient.id,
      },
    },
  });

  if (!existingRelationship) {
    await prisma.caregiverPatient.create({
      data: {
        caregiverId: caregiver.id,
        patientId: patient.id,
      },
    });
    console.log('✓ Created caregiver-patient relationship');
  } else {
    console.log('✓ Caregiver-patient relationship already exists');
  }

  // ===== MEDICATIONS =====
  console.log('\nCreating medications...');

  // Morning medication - already taken
  const med1 = await prisma.medication.create({
    data: {
      patientId: DEMO_PATIENT_ID,
      name: 'Donepezil',
      dosage: '10mg',
      timeOfDay: 'Morning',
      reminderTime: '08:00',
      active: true,
    },
  });

  // Record morning dose as taken
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  await prisma.medicationDose.create({
    data: {
      medicationId: med1.id,
      scheduledFor: new Date(today.getTime() + 8 * 60 * 60 * 1000), // 8 AM
      takenAt: new Date(today.getTime() + 8 * 60 * 60 * 1000 + 15 * 60 * 1000), // 8:15 AM
      skipped: false,
      notes: 'Taken with breakfast',
    },
  });

  // Afternoon medication - already taken
  const med2 = await prisma.medication.create({
    data: {
      patientId: DEMO_PATIENT_ID,
      name: 'Memantine',
      dosage: '5mg',
      timeOfDay: 'Afternoon',
      reminderTime: '14:00',
      active: true,
    },
  });

  await prisma.medicationDose.create({
    data: {
      medicationId: med2.id,
      scheduledFor: new Date(today.getTime() + 14 * 60 * 60 * 1000), // 2 PM
      takenAt: new Date(today.getTime() + 14 * 60 * 60 * 1000 + 10 * 60 * 1000), // 2:10 PM
      skipped: false,
    },
  });

  // Evening medication - pending
  const med3 = await prisma.medication.create({
    data: {
      patientId: DEMO_PATIENT_ID,
      name: 'Vitamin D',
      dosage: '2000 IU',
      timeOfDay: 'Evening',
      reminderTime: '19:00',
      active: true,
    },
  });

  // No dose recorded yet - it's pending
  console.log('Created 3 medications (2 taken, 1 pending)');

  // ===== DAILY ACTIVITIES =====
  console.log('\nCreating daily activities...');

  const activities = [
    {
      activityType: 'Exercise',
      description: 'Morning walk around the neighborhood',
      duration: 30,
      time: new Date(today.getTime() + 9 * 60 * 60 * 1000), // 9 AM
    },
    {
      activityType: 'Social',
      description: 'Video call with grandchildren',
      duration: 45,
      time: new Date(today.getTime() + 14 * 60 * 60 * 1000 + 15 * 60 * 1000), // 2:15 PM
    },
    {
      activityType: 'Cognitive',
      description: 'Crossword puzzle',
      duration: 20,
      time: new Date(today.getTime() + 16 * 60 * 60 * 1000), // 4 PM
    },
    {
      activityType: 'Hobby',
      description: 'Gardening - watered roses',
      duration: 25,
      time: new Date(today.getTime() + 10 * 60 * 60 * 1000), // 10 AM
    },
    {
      activityType: 'Reading',
      description: 'Reading mystery novel',
      duration: 40,
      time: new Date(today.getTime() + 20 * 60 * 60 * 1000), // 8 PM
    },
  ];

  for (const activity of activities) {
    await prisma.dailyActivity.create({
      data: {
        patientId: DEMO_PATIENT_ID,
        date: activity.time,
        activityType: activity.activityType,
        description: activity.description,
        duration: activity.duration,
        completedAt: activity.time,
      },
    });
  }

  console.log('Created 5 daily activities (160 total minutes)');

  // ===== SLEEP LOG =====
  console.log('\nCreating sleep log...');

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const bedtime = new Date(yesterday);
  bedtime.setHours(22, 30, 0, 0); // 10:30 PM yesterday

  const wakeTime = new Date(today);
  wakeTime.setHours(6, 0, 0, 0); // 6:00 AM today

  await prisma.sleepLog.create({
    data: {
      patientId: DEMO_PATIENT_ID,
      date: yesterday,
      bedtime,
      wakeTime,
      totalHours: 7.5,
      quality: 'Good',
      notes: 'Slept through the night, woke up feeling refreshed',
    },
  });

  console.log('Created sleep log: 7.5 hours, Good quality');

  console.log('\n✅ Demo data seeded successfully!');
  console.log('\nDashboard should now show:');
  console.log('- Medications: 2/3 (1 pending)');
  console.log('- Activities: 5 (160 minutes)');
  console.log('- Sleep: 7.5h (Good rest)');
}

seedDemoData()
  .then(() => prisma.$disconnect())
  .catch((error) => {
    console.error('Error seeding demo data:', error);
    prisma.$disconnect();
    process.exit(1);
  });
