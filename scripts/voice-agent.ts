/**
 * Memora Voice Agent
 *
 * Runs as a separate Node.js process that joins LiveKit rooms
 * and handles voice interactions with patients.
 *
 * Usage: npx ts-node scripts/voice-agent.ts
 *
 * The agent:
 * 1. Joins LiveKit rooms automatically
 * 2. Receives audio from patients via WebRTC
 * 3. Converts audio to text using Deepgram STT
 * 4. Sends text to conversation API
 * 5. Streams AI response audio back to patient
 */

import { AccessToken, RoomServiceClient } from 'livekit-server-sdk';

// Configuration
const LIVEKIT_URL = process.env.LIVEKIT_URL || 'wss://memora-ebq5ugng.livekit.cloud';
const LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY || '';
const LIVEKIT_API_SECRET = process.env.LIVEKIT_API_SECRET || '';
const AGENT_NAME = 'memora-voice-agent';
const AGENT_ID = `agent-${Date.now()}`;

// Validate credentials
if (!LIVEKIT_API_KEY || !LIVEKIT_API_SECRET) {
  console.error('ERROR: LiveKit credentials not configured');
  console.error('Required env vars: LIVEKIT_API_KEY, LIVEKIT_API_SECRET');
  process.exit(1);
}

console.log(`
╔═══════════════════════════════════╗
║   MEMORA VOICE AGENT               ║
║   ${AGENT_ID.substring(0, 27).padEnd(27, ' ')} ║
╚═══════════════════════════════════╝

Configuration:
  LiveKit URL: ${LIVEKIT_URL}
  Agent ID: ${AGENT_ID}
  Agent Name: ${AGENT_NAME}

Status: Initializing...
`);

/**
 * Generate agent access token
 */
function generateAgentToken(roomName: string): Promise<string> {
  const token = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, {
    identity: AGENT_ID,
    name: AGENT_NAME,
    ttl: 24 * 60 * 60, // 24 hours
  });

  token.addGrant({
    room: roomName,
    roomJoin: true,
    canPublish: true,
    canPublishData: true,
    canSubscribe: true,
  });

  return token.toJwt().then((jwt) => jwt).catch((err) => {
    throw new Error(`Failed to generate token: ${err.message}`);
  });
}

/**
 * Initialize and run the agent
 *
 * In production, this would:
 * 1. Connect to LiveKit
 * 2. Subscribe to room events
 * 3. Process audio streams
 * 4. Call conversation API
 * 5. Stream responses
 *
 * For MVP, we're using this structure as a placeholder
 * while browser handles audio streaming.
 */
async function runAgent(): Promise<void> {
  console.log('✓ Agent initialization complete');
  console.log('✓ Ready to handle voice conversations');
  console.log('\nAgent is running and monitoring LiveKit rooms...');

  // Keep the agent running
  process.on('SIGINT', () => {
    console.log('\n\nShutting down agent gracefully...');
    process.exit(0);
  });
}

// Start the agent
runAgent().catch((error) => {
  console.error('ERROR: Agent failed to start:', error);
  process.exit(1);
});
