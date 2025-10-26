'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import VoiceInterface from '@/components/VoiceInterface';
import { LiveKitRoomProvider } from '@/components/LiveKitRoomProvider';

export default function PatientPage() {
  const { userId, isSignedIn } = useAuth();
  const [patientId, setPatientId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isSignedIn) {
      setLoading(false);
      return;
    }

    const fetchPatientId = async () => {
      try {
        // Use /api/conversations to verify patient exists
        // The API internally looks up the patient from auth context
        const response = await fetch('/api/conversations');

        if (!response.ok) {
          if (response.status === 404) {
            throw new Error('Patient profile not found. Please complete onboarding.');
          }
          throw new Error('Failed to fetch patient information');
        }

        const data = await response.json();

        // API returns conversations for the patient, which means patient exists
        // We'll use userId as patientId since there's a 1:1 mapping
        // The actual patientId will be determined server-side
        setPatientId(userId || 'unknown');
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load patient profile';
        console.error('Error fetching patient ID:', errorMessage);
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    fetchPatientId();
  }, [isSignedIn]);

  if (!isSignedIn) {
    return (
      <main className="patient-page">
        <div className="p-8 text-center text-white">
          <p>Please sign in to access the voice interface.</p>
        </div>
      </main>
    );
  }

  if (loading) {
    return (
      <main className="patient-page">
        <div className="p-8 text-center text-white">
          <p>Loading...</p>
        </div>
      </main>
    );
  }

  if (error || !patientId) {
    return (
      <main className="patient-page">
        <div className="p-8 text-center text-red-500">
          <p>{error || 'Failed to load patient profile'}</p>
        </div>
      </main>
    );
  }

  return (
    <main className="patient-page">
      <LiveKitRoomProvider patientId={patientId}>
        <VoiceInterface />
      </LiveKitRoomProvider>

      <style jsx global>{`
        html, body {
          background: #0a0a0a;
        }

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
