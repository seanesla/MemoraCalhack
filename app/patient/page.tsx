'use client';

import VoiceInterface from '@/components/VoiceInterface';

export default function PatientPage() {
  return (
    <main className="patient-page">
      <VoiceInterface />

      <style jsx global>{`
        .patient-page {
          min-height: 100vh;
          background: #0a0a0a;
          position: relative;
          overflow: hidden;
        }

        /* Subtle texture overlay */
        .patient-page::before {
          content: '';
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background-image:
            radial-gradient(ellipse at 20% 30%, rgba(212, 165, 116, 0.03) 0%, transparent 50%),
            radial-gradient(ellipse at 80% 70%, rgba(212, 165, 116, 0.02) 0%, transparent 50%);
          pointer-events: none;
          z-index: 0;
        }

        /* Grain texture */
        .patient-page::after {
          content: '';
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background-image: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><filter id="grain"><feTurbulence type="turbulence" baseFrequency="0.65" /></filter><rect width="200" height="200" filter="url(%23grain)" opacity="0.02"/></svg>');
          opacity: 0.3;
          pointer-events: none;
          z-index: 0;
        }
      `}</style>
    </main>
  );
}
