'use client';

import { LiveKitRoom } from '@livekit/components-react';
import { ReactNode, useEffect, useState } from 'react';
import { useAuth } from '@clerk/nextjs';

interface LiveKitRoomProviderProps {
  children: ReactNode;
  patientId: string;
}

export function LiveKitRoomProvider({ children, patientId }: LiveKitRoomProviderProps) {
  const { isSignedIn } = useAuth();
  const [token, setToken] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Check for demo mode
    const isDemoMode = typeof window !== 'undefined' && localStorage.getItem('demo_mode') === 'true';

    if (!isSignedIn && !isDemoMode) {
      return;
    }

    const fetchToken = async () => {
      try {
        const roomName = `patient-${patientId}`;
        const userName = `Patient ${patientId}`;
        const response = await fetch(`/api/livekit/token?roomName=${encodeURIComponent(roomName)}&userName=${encodeURIComponent(userName)}`);

        if (!response.ok) {
          throw new Error(`Token fetch failed: ${response.status}`);
        }

        const data = await response.json();
        setToken(data.token);
        setError(null);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to fetch LiveKit token';
        console.error('LiveKit token error:', errorMessage);
        setError(errorMessage);
      }
    };

    fetchToken();
  }, [isSignedIn, patientId]);

  // Check for demo mode
  const isDemoMode = typeof window !== 'undefined' && localStorage.getItem('demo_mode') === 'true';

  if (!isSignedIn && !isDemoMode) {
    return <div>Please sign in to use voice features.</div>;
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 text-red-800 rounded-lg">
        <p className="font-semibold">Voice Connection Error</p>
        <p className="text-sm">{error}</p>
      </div>
    );
  }

  if (!token) {
    return (
      <div className="p-4 bg-gray-50 text-gray-800 rounded-lg">
        <p>Connecting to voice service...</p>
      </div>
    );
  }

  return (
    <LiveKitRoom
      serverUrl={process.env.NEXT_PUBLIC_LIVEKIT_URL || 'wss://memora-ebq5ugng.livekit.cloud'}
      token={token}
      connect={true}
      audio={true}
      video={false}
      onError={(error) => {
        console.error('LiveKit room error:', error);
        setError(error.message);
      }}
      onConnected={() => {
        console.log('LiveKit room connected');
      }}
      onDisconnected={() => {
        console.log('LiveKit room disconnected');
      }}
    >
      {children}
    </LiveKitRoom>
  );
}
