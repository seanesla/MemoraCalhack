/**
 * Re-onboard demo patient after database reset
 */

import { PrismaClient } from '@prisma/client';
import { letta } from '../lib/letta';

const prisma = new PrismaClient();

async function reOnboardDemo() {
  console.log('Re-onboarding demo patient...');

  // Create Letta agent
  const agent = await letta.agents.create({
    name: 'Demo Patient',
    memoryBlocks: [
      {
        label: 'human',
        value: 'Demo Patient is a 70-year-old individual with early-stage dementia. They live at home in San Francisco and prefer to be called "Demo".',
        limit: 2000,
      },
      {
        label: 'persona',
        value: 'You are a supportive AI companion for someone with dementia. Be patient, reassuring, and helpful. Provide orientation cues (date, time, location) when needed.',
        limit: 2000,
      },
      {
        label: 'patient_context',
        value: 'Early-stage dementia. Living at home with family support. Enjoys gardening, reading mystery novels, and video calls with grandchildren.',
        limit: 2000,
      },
    ],
  });

  console.log('Created Letta agent:', agent.id);

  // Create patient record
  const patient = await prisma.patient.create({
    data: {
      clerkId: 'clerk_demo_patient',
      name: 'Demo Patient',
      age: 70,
      diagnosisStage: 'Early-stage dementia',
      locationLabel: 'Home, San Francisco',
      preferredName: 'Demo',
      lettaAgentId: agent.id,
    },
  });

  console.log('\n✅ Demo patient re-onboarded successfully!');
  console.log('Patient ID:', patient.id);
  console.log('Letta Agent ID:', agent.id);
  console.log('\nUpdate the following files with this patient ID:');
  console.log('1. public/dashboard.html');
  console.log('2. scripts/seed-demo-data.ts');

  await prisma.$disconnect();
}

reOnboardDemo().catch((error) => {
  console.error('Error re-onboarding demo patient:', error);
  prisma.$disconnect();
  process.exit(1);
});
