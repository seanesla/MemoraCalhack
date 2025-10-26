import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

/**
 * Converts text to speech using Deepgram TTS
 *
 * Body: { text: string }
 * Returns: Audio stream (audio/mpeg)
 */
export async function POST(request: Request) {
  try {
    // Verify authentication (allow demo mode - TTS is read-only and rate-limited)
    const { userId } = await auth();

    const { text } = await request.json();

    if (!text || typeof text !== 'string') {
      return NextResponse.json(
        { error: 'text parameter is required and must be a string' },
        { status: 400 }
      );
    }

    // Get Deepgram API key
    const deepgramApiKey = process.env.DEEPGRAM_API_KEY;
    if (!deepgramApiKey) {
      console.error('DEEPGRAM_API_KEY not configured');
      return NextResponse.json(
        { error: 'TTS service not configured' },
        { status: 500 }
      );
    }

    // Call Deepgram TTS API
    const deepgramUrl = new URL('https://api.deepgram.com/v1/speak');
    deepgramUrl.searchParams.append('model', 'aura-asteria-en');
    deepgramUrl.searchParams.append('encoding', 'linear16');
    deepgramUrl.searchParams.append('sample_rate', '16000');

    const deepgramResponse = await fetch(deepgramUrl.toString(), {
      method: 'POST',
      headers: {
        'Authorization': `Token ${deepgramApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text }),
    });

    if (!deepgramResponse.ok) {
      const error = await deepgramResponse.text();
      console.error('Deepgram TTS error:', deepgramResponse.status, error);
      return NextResponse.json(
        { error: 'Text-to-speech conversion failed' },
        { status: 500 }
      );
    }

    // Stream the audio response
    const audioBuffer = await deepgramResponse.arrayBuffer();

    return new NextResponse(audioBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': audioBuffer.byteLength.toString(),
        'Cache-Control': 'no-cache',
      },
    });
  } catch (error) {
    console.error('Error generating speech:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
