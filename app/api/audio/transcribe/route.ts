import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

/**
 * Transcribes audio to text using Deepgram STT
 *
 * Body: FormData with audio blob
 * Returns: { text: string }
 */
export async function POST(request: Request) {
  try {
    // Verify authentication
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get audio from FormData
    const formData = await request.formData();
    const audioBlob = formData.get('audio') as Blob;

    if (!audioBlob) {
      return NextResponse.json(
        { error: 'No audio provided' },
        { status: 400 }
      );
    }

    // Convert blob to buffer
    const audioBuffer = await audioBlob.arrayBuffer();

    // Call Deepgram API
    const deepgramApiKey = process.env.DEEPGRAM_API_KEY;
    if (!deepgramApiKey) {
      console.error('DEEPGRAM_API_KEY not configured');
      return NextResponse.json(
        { error: 'STT service not configured' },
        { status: 500 }
      );
    }

    const deepgramUrl = new URL('https://api.deepgram.com/v1/listen');
    deepgramUrl.searchParams.append('model', 'nova-2');
    deepgramUrl.searchParams.append('smart_format', 'true');

    const deepgramResponse = await fetch(deepgramUrl.toString(), {
      method: 'POST',
      headers: {
        'Authorization': `Token ${deepgramApiKey}`,
        'Content-Type': 'audio/webm',
      },
      body: audioBuffer,
    });

    if (!deepgramResponse.ok) {
      const error = await deepgramResponse.text();
      console.error('Deepgram error:', deepgramResponse.status, error);
      return NextResponse.json(
        { error: 'Transcription failed' },
        { status: 500 }
      );
    }

    const deepgramData = await deepgramResponse.json() as any;
    const transcript = deepgramData.results?.channels?.[0]?.alternatives?.[0]?.transcript || '';

    if (!transcript) {
      return NextResponse.json({
        text: '',
        confidence: 0,
      });
    }

    return NextResponse.json({
      text: transcript,
      confidence: deepgramData.results?.channels?.[0]?.alternatives?.[0]?.confidence || 0,
    });
  } catch (error) {
    console.error('Error transcribing audio:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
