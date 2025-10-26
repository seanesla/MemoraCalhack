import { NextResponse } from 'next/server';
import { AccessToken } from 'livekit-server-sdk';
import { auth } from '@clerk/nextjs/server';

/**
 * Generates a LiveKit access token for WebRTC connection
 *
 * Query params:
 * - roomName: Name of the LiveKit room to join
 * - userName: Display name for the participant (optional, defaults to user ID)
 */
export async function GET(request: Request) {
  try {
    // Get query parameters first
    const { searchParams } = new URL(request.url);
    const roomName = searchParams.get('roomName');

    // Verify authentication (allow demo mode)
    const { userId } = await auth();

    // For demo mode: If no Clerk userId but roomName contains a patient ID, allow it
    let effectiveUserId = userId;
    if (!userId && roomName) {
      // Extract patient ID from room name (format: "patient-{patientId}")
      const match = roomName.match(/^patient-(.+)$/);
      if (match) {
        effectiveUserId = match[1]; // Use patient ID as user identity
        console.log('Demo mode: Using patient ID from room name:', effectiveUserId);
      } else {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        );
      }
    }

    if (!effectiveUserId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userName = searchParams.get('userName') || effectiveUserId;

    // Validate required parameters
    if (!roomName) {
      return NextResponse.json(
        { error: 'roomName query parameter is required' },
        { status: 400 }
      );
    }

    // Validate environment variables
    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;

    if (!apiKey || !apiSecret) {
      console.error('LiveKit credentials not configured');
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    // Generate access token
    const token = new AccessToken(apiKey, apiSecret, {
      identity: effectiveUserId,
      name: userName,
      ttl: 24 * 60 * 60, // 24 hours
    });

    // Set grants for room access
    token.addGrant({
      room: roomName,
      roomJoin: true,
      canPublish: true,
      canPublishData: true,
      canSubscribe: true,
    });

    const jwt = token.toJwt();

    return NextResponse.json({
      token: jwt,
      url: process.env.LIVEKIT_URL,
      wsUrl: process.env.LIVEKIT_URL,
    });
  } catch (error) {
    console.error('Error generating LiveKit token:', error);
    return NextResponse.json(
      { error: 'Failed to generate token' },
      { status: 500 }
    );
  }
}
