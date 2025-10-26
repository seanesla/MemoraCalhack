/**
 * Audio Processing Utilities for LiveKit → Deepgram Integration
 *
 * This module provides utilities to extract PCM audio data from LiveKit's
 * MediaStreamTrack and process it for streaming to Deepgram's WebSocket API.
 */

export interface AudioProcessorOptions {
  sampleRate?: number;
  channelCount?: number;
  chunkDurationMs?: number;
}

export class LiveKitAudioProcessor {
  private audioContext: AudioContext | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private processorNode: ScriptProcessorNode | null = null;
  private onAudioDataCallback: ((data: Int16Array) => void) | null = null;

  constructor(private options: AudioProcessorOptions = {}) {
    this.options = {
      sampleRate: options.sampleRate || 16000,
      channelCount: options.channelCount || 1,
      chunkDurationMs: options.chunkDurationMs || 100,
    };
  }

  /**
   * Start processing audio from a MediaStreamTrack
   */
  async start(mediaStreamTrack: MediaStreamTrack, onAudioData: (data: Int16Array) => void): Promise<void> {
    this.onAudioDataCallback = onAudioData;

    // Create AudioContext
    this.audioContext = new AudioContext({
      sampleRate: this.options.sampleRate,
    });

    // Create MediaStream from track
    const mediaStream = new MediaStream([mediaStreamTrack]);

    // Create source node from MediaStream
    this.sourceNode = this.audioContext.createMediaStreamSource(mediaStream);

    // Calculate buffer size based on chunk duration
    // Buffer size must be power of 2 between 256 and 16384
    const idealBufferSize = Math.floor(
      (this.options.sampleRate! * this.options.chunkDurationMs!) / 1000
    );
    const bufferSize = this.getNearestPowerOfTwo(idealBufferSize);

    // Create script processor node
    this.processorNode = this.audioContext.createScriptProcessor(
      bufferSize,
      this.options.channelCount,
      this.options.channelCount
    );

    // Set up audio processing
    this.processorNode.onaudioprocess = (event: AudioProcessingEvent) => {
      const inputBuffer = event.inputBuffer;
      const inputData = inputBuffer.getChannelData(0);

      // Convert Float32Array to Int16Array for Deepgram
      const pcmData = this.floatTo16BitPCM(inputData);

      // Send to callback
      if (this.onAudioDataCallback) {
        this.onAudioDataCallback(pcmData);
      }
    };

    // Connect nodes
    this.sourceNode.connect(this.processorNode);
    this.processorNode.connect(this.audioContext.destination);

    console.log('LiveKitAudioProcessor started', {
      sampleRate: this.audioContext.sampleRate,
      bufferSize,
      channelCount: this.options.channelCount,
    });
  }

  /**
   * Stop processing audio and cleanup resources
   */
  stop(): void {
    if (this.processorNode) {
      this.processorNode.disconnect();
      this.processorNode.onaudioprocess = null;
      this.processorNode = null;
    }

    if (this.sourceNode) {
      this.sourceNode.disconnect();
      this.sourceNode = null;
    }

    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }

    this.onAudioDataCallback = null;

    console.log('LiveKitAudioProcessor stopped');
  }

  /**
   * Convert Float32Array audio data to Int16Array PCM
   */
  private floatTo16BitPCM(float32Array: Float32Array): Int16Array {
    const int16Array = new Int16Array(float32Array.length);

    for (let i = 0; i < float32Array.length; i++) {
      // Clamp value between -1 and 1
      const clamped = Math.max(-1, Math.min(1, float32Array[i]));
      // Convert to 16-bit PCM
      int16Array[i] = clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff;
    }

    return int16Array;
  }

  /**
   * Get nearest power of 2 for buffer size
   */
  private getNearestPowerOfTwo(value: number): number {
    const powers = [256, 512, 1024, 2048, 4096, 8192, 16384];
    return powers.reduce((prev, curr) => {
      return Math.abs(curr - value) < Math.abs(prev - value) ? curr : prev;
    });
  }

  /**
   * Check if AudioContext is available
   */
  static isSupported(): boolean {
    return typeof AudioContext !== 'undefined' || typeof (window as any).webkitAudioContext !== 'undefined';
  }
}

/**
 * Voice Activity Detection Helper
 */
export class VoiceActivityDetector {
  private silenceIntervals = 0;
  private hasDetectedVoice = false;

  constructor(
    private silenceThreshold: number = 0.01,
    private silenceDuration: number = 3000,
    private sampleRate: number = 16000
  ) {}

  /**
   * Process audio chunk and detect voice activity
   * Returns true if silence detected after voice
   */
  detectSilence(pcmData: Int16Array, chunkDurationMs: number): boolean {
    // Calculate audio level
    let sum = 0;
    for (let i = 0; i < pcmData.length; i++) {
      sum += Math.abs(pcmData[i]);
    }
    const average = sum / pcmData.length;
    const normalized = average / 32768; // Normalize to 0-1

    // Check if voice is present
    if (normalized > this.silenceThreshold) {
      this.hasDetectedVoice = true;
      this.silenceIntervals = 0;
      return false;
    }

    // Only count silence after voice detected
    if (this.hasDetectedVoice) {
      this.silenceIntervals++;
      const silenceDuration = this.silenceIntervals * chunkDurationMs;

      if (silenceDuration >= this.silenceDuration) {
        return true; // Silence detected
      }
    }

    return false;
  }

  /**
   * Reset the detector state
   */
  reset(): void {
    this.silenceIntervals = 0;
    this.hasDetectedVoice = false;
  }

  /**
   * Check if voice has been detected at least once
   */
  hasVoice(): boolean {
    return this.hasDetectedVoice;
  }
}
