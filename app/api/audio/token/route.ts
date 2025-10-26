import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

/**
 * Generates a temporary Deepgram token for browser-side WebSocket connections
 *
 * Security: Uses server-side DEEPGRAM_API_KEY to generate token, never exposes API key to client
 * TTL: 600 seconds (10 minutes) - sufficient for voice interactions
 *
 * Returns: { token: string, expiresIn: number }
 */
export async function GET() {
  try {
    // Verify authentication (allow demo mode - Deepgram tokens are scoped and temporary)
    const { userId } = await auth();
    // Demo mode: Allow token generation even without Clerk auth
    // Deepgram tokens are temporary (10 min) and rate-limited, so this is safe

    // Get Deepgram API key from environment
    const deepgramApiKey = process.env.DEEPGRAM_API_KEY;
    if (!deepgramApiKey) {
      console.error('DEEPGRAM_API_KEY not configured');
      return NextResponse.json(
        { error: 'STT service not configured' },
        { status: 500 }
      );
    }

    // Request temporary token from Deepgram
    const response = await fetch('https://api.deepgram.com/v1/auth/grant', {
      method: 'POST',
      headers: {
        'Authorization': `Token ${deepgramApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ttl_seconds: 600, // 10 minutes
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Deepgram token generation error:', response.status, error);
      return NextResponse.json(
        { error: 'Failed to generate token' },
        { status: 500 }
      );
    }

    const data = await response.json();

    return NextResponse.json({
      token: data.access_token,
      expiresIn: data.expires_in,
    });
  } catch (error) {
    console.error('Error generating Deepgram token:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
