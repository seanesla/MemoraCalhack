'use client';

import { useState, useEffect, useRef } from 'react';
import {
  getCoreMemory,
  addConversation,
  initSharedState,
  onStateChange,
  type MemoraCoreMemory
} from '@/lib/shared-state';

type VoiceState = 'idle' | 'listening' | 'thinking' | 'speaking' | 'error';

export default function VoiceInterface() {
  const [state, setState] = useState<VoiceState>('idle');
  const [transcript, setTranscript] = useState<string>('');
  const [response, setResponse] = useState<string>('');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [hasSpokenWelcome, setHasSpokenWelcome] = useState(false);
  const [coreMemory, setCoreMemory] = useState<MemoraCoreMemory | null>(null);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const synthRef = useRef<SpeechSynthesis | null>(null);

  // Audio capture refs for Phase 11.1 STT integration
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioStreamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Privacy settings state
  const [privacySettings, setPrivacySettings] = useState({
    conversations: true,
    location: true,
    medicationTracking: true,
    activityMonitoring: true
  });

  // Speech synthesis DISABLED - see speak() function
  // Will be replaced with proper voice in Phase 11 (LiveKit + Deepgram)

  // Initialize shared state and load Core Memory
  useEffect(() => {
    initSharedState();
    const memory = getCoreMemory();
    setCoreMemory(memory);

    // Subscribe to Core Memory updates from dashboard
    const unsubscribe = onStateChange((type, data) => {
      if (type === 'core_memory_updated') {
        setCoreMemory(data);
        console.log('Core Memory updated from dashboard:', data);
      }
    });

    return unsubscribe;
  }, []);

  // Voice-guided onboarding - speak welcome message on first load
  useEffect(() => {
    if (!hasSpokenWelcome) {
      // Wait a moment for page to settle, then speak welcome
      const welcomeTimeout = setTimeout(async () => {
        await speak("Hello, I'm Memora. I'm here with you. Press the circle to talk to me.");
        setHasSpokenWelcome(true);
      }, 1000);

      return () => clearTimeout(welcomeTimeout);
    }
  }, [hasSpokenWelcome]);

  // Speak function - Real TTS via Deepgram API (Phase 11.2)
  const speak = async (text: string, options = {}) => {
    if (!text || !text.trim()) {
      console.warn('speak() called with empty text');
      return;
    }

    try {
      console.log('Calling Deepgram TTS for:', text.substring(0, 50) + '...');

      // Call Deepgram TTS endpoint
      const response = await fetch('/api/audio/speak', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });

      if (!response.ok) {
        console.error('TTS failed:', response.status);
        return;
      }

      // Get audio as blob
      const audioBlob = await response.blob();

      // Create audio element and play
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);

      audio.addEventListener('ended', () => {
        // Clean up URL when playback finishes
        URL.revokeObjectURL(audioUrl);
        console.log('TTS playback finished');
      });

      audio.addEventListener('error', (err) => {
        console.error('Audio playback error:', err);
        URL.revokeObjectURL(audioUrl);
      });

      console.log('Playing TTS audio');
      await audio.play();
    } catch (error) {
      console.error('Error in speak():', error);
    }
  };

  // Play audio feedback for interactions
  const playFeedbackSound = (frequency: number, duration: number) => {
    if (typeof window === 'undefined' || !window.AudioContext) return;

    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.value = frequency;
      oscillator.type = 'sine';

      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + duration);
    } catch (error) {
      console.log('Audio feedback not available');
    }
  };

  // Update time every minute for ambient context display
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // Update every minute

    return () => clearInterval(timer);
  }, []);

  const handlePress = async () => {
    if (state === 'idle') {
      // ===== START RECORDING (First Click) =====
      try {
        playFeedbackSound(440, 0.1); // A4 note, short beep
        speak("I'm listening. Take your time.");
        setState('listening');

        // Request microphone access
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });

        audioStreamRef.current = stream;
        audioChunksRef.current = [];

        // Create MediaRecorder
        const mediaRecorder = new MediaRecorder(stream, {
          mimeType: 'audio/webm',
        });

        mediaRecorderRef.current = mediaRecorder;

        // Collect audio chunks
        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            audioChunksRef.current.push(event.data);
          }
        };

        // Handle recording stop
        mediaRecorder.onstop = async () => {
          try {
            // ===== TRANSCRIBE AUDIO =====
            const audioBlob = new Blob(audioChunksRef.current, {
              type: 'audio/webm',
            });

            const formData = new FormData();
            formData.append('audio', audioBlob);

            console.log('Sending audio to transcribe endpoint...');
            const transcribeRes = await fetch('/api/audio/transcribe', {
              method: 'POST',
              body: formData,
            });

            if (!transcribeRes.ok) {
              throw new Error(`Transcribe failed: ${transcribeRes.status}`);
            }

            const { text } = await transcribeRes.json();
            console.log('Transcribed text:', text);

            if (!text.trim()) {
              setState('error');
              console.warn('No speech detected');
              return;
            }

            setTranscript(text);

            // ===== TRANSITION TO THINKING =====
            playFeedbackSound(523, 0.15); // C5 note
            speak('Let me think about that.');
            setState('thinking');

            // ===== GET AI RESPONSE =====
            console.log('Calling conversation API with:', text);
            const conversationRes = await fetch('/api/conversation', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ message: text }),
            });

            if (!conversationRes.ok) {
              throw new Error(
                `Conversation API failed: ${conversationRes.status}`
              );
            }

            const { response: responseText } = await conversationRes.json();
            console.log('AI response:', responseText);

            // ===== TRANSITION TO SPEAKING =====
            setState('speaking');
            setResponse(responseText);
            speak(responseText);

            // ===== RETURN TO IDLE =====
            setTimeout(() => {
              playFeedbackSound(349, 0.2); // F4 note, completion sound

              // Save conversation to shared state
              addConversation({
                timestamp: new Date().toISOString(),
                userMessage: text,
                assistantMessage: responseText,
                context: coreMemory?.context,
              });
              console.log('Conversation saved to shared state');

              setState('idle');
              setTranscript('');
              setResponse('');
            }, 3500);

            // Clean up audio stream
            stream.getTracks().forEach((track) => track.stop());
          } catch (error) {
            console.error('Error during transcription/conversation:', error);
            setState('error');
            stream.getTracks().forEach((track) => track.stop());
          }
        };

        // Start recording
        mediaRecorder.start();
      } catch (error) {
        console.error('Error accessing microphone:', error);
        setState('error');
      }
    } else if (state === 'listening') {
      // ===== STOP RECORDING (Second Click) =====
      if (mediaRecorderRef.current) {
        mediaRecorderRef.current.stop();
      }
    }
  };

  // Handle keyboard press (Space or Enter)
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.code === 'Space' || e.code === 'Enter') {
      e.preventDefault();
      handlePress();
    }
  };

  const getInvitationText = () => {
    switch (state) {
      case 'idle':
        return 'Press the circle to talk to me';
      case 'listening':
        return 'Take your time';
      case 'thinking':
        return 'Let me think about that...';
      case 'speaking':
        return '';
      case 'error':
        return 'No worries, let\'s try again';
      default:
        return '';
    }
  };

  const getStatusColor = () => {
    switch (state) {
      case 'idle':
        return 'rgba(212, 165, 116, 0.3)'; // #d4a574 warm gold
      case 'listening':
        return 'rgba(212, 165, 116, 0.6)';
      case 'thinking':
        return 'rgba(212, 165, 116, 0.4)';
      case 'speaking':
        return 'rgba(212, 165, 116, 0.8)';
      case 'error':
        return 'rgba(220, 100, 100, 0.5)';
    }
  };

  const togglePrivacySetting = (setting: keyof typeof privacySettings) => {
    setPrivacySettings(prev => ({
      ...prev,
      [setting]: !prev[setting]
    }));

    // In real implementation, this would notify the caregiver
    console.log(`Privacy setting changed: ${setting} = ${!privacySettings[setting]}`);
  };

  return (
    <div className="voice-interface">
      {/* Top navigation */}
      <div className="top-nav">
        <a href="/" className="nav-button">
          <svg className="nav-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
          <span className="nav-label">Home</span>
        </a>

        {!showPrivacy && (
          <button onClick={() => setShowPrivacy(true)} className="nav-button">
            <svg className="nav-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <span className="nav-label">My Data</span>
          </button>
        )}

        {showPrivacy && (
          <button onClick={() => setShowPrivacy(false)} className="nav-button">
            <svg className="nav-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            <span className="nav-label">Close</span>
          </button>
        )}
      </div>

      {/* Privacy Dashboard */}
      {showPrivacy && (
        <div className="privacy-dashboard">
          <div className="privacy-header">
            <h1 className="privacy-title">What We Track About You</h1>
            <p className="privacy-subtitle">You control your data. Turn off anything you're not comfortable with.</p>
          </div>

          <div className="privacy-controls">
            {/* Conversations */}
            <div className="privacy-item">
              <div className="privacy-item-header">
                <div className="privacy-item-info">
                  <h3 className="privacy-item-title">Conversations</h3>
                  <p className="privacy-item-description">
                    Records what you say to help remember context and provide better responses
                  </p>
                </div>
                <label className="privacy-toggle">
                  <input
                    type="checkbox"
                    checked={privacySettings.conversations}
                    onChange={() => togglePrivacySetting('conversations')}
                  />
                  <span className="toggle-slider"></span>
                </label>
              </div>
              {!privacySettings.conversations && (
                <div className="privacy-warning">
                  <svg className="warning-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <span>Ava will be notified. I won't remember our conversations.</span>
                </div>
              )}
            </div>

            {/* Location */}
            <div className="privacy-item">
              <div className="privacy-item-header">
                <div className="privacy-item-info">
                  <h3 className="privacy-item-title">Location Tracking</h3>
                  <p className="privacy-item-description">
                    Tracks where you are to detect if you wander outside safe areas
                  </p>
                </div>
                <label className="privacy-toggle">
                  <input
                    type="checkbox"
                    checked={privacySettings.location}
                    onChange={() => togglePrivacySetting('location')}
                  />
                  <span className="toggle-slider"></span>
                </label>
              </div>
              {!privacySettings.location && (
                <div className="privacy-warning">
                  <svg className="warning-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <span>Ava will be notified. Wandering alerts will be disabled.</span>
                </div>
              )}
            </div>

            {/* Medication */}
            <div className="privacy-item">
              <div className="privacy-item-header">
                <div className="privacy-item-info">
                  <h3 className="privacy-item-title">Medication Reminders</h3>
                  <p className="privacy-item-description">
                    Tracks when you take medication and sends reminders
                  </p>
                </div>
                <label className="privacy-toggle">
                  <input
                    type="checkbox"
                    checked={privacySettings.medicationTracking}
                    onChange={() => togglePrivacySetting('medicationTracking')}
                  />
                  <span className="toggle-slider"></span>
                </label>
              </div>
              {!privacySettings.medicationTracking && (
                <div className="privacy-warning">
                  <svg className="warning-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <span>Ava will be notified. You won't receive medication reminders.</span>
                </div>
              )}
            </div>

            {/* Activity */}
            <div className="privacy-item">
              <div className="privacy-item-header">
                <div className="privacy-item-info">
                  <h3 className="privacy-item-title">Activity Monitoring</h3>
                  <p className="privacy-item-description">
                    Tracks your daily activities to notice changes in routine
                  </p>
                </div>
                <label className="privacy-toggle">
                  <input
                    type="checkbox"
                    checked={privacySettings.activityMonitoring}
                    onChange={() => togglePrivacySetting('activityMonitoring')}
                  />
                  <span className="toggle-slider"></span>
                </label>
              </div>
              {!privacySettings.activityMonitoring && (
                <div className="privacy-warning">
                  <svg className="warning-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <span>Activity pattern alerts will be disabled.</span>
                </div>
              )}
            </div>
          </div>

          <div className="privacy-footer">
            <p className="privacy-note">
              All changes notify Ava. Your safety matters, but so does your autonomy.
            </p>
          </div>
        </div>
      )}

      {/* Idle state: Show circle button */}
      {!showPrivacy && state === 'idle' && (
        <div className="interaction-container">
          {/* Welcome message */}
          <div className="welcome-message">
            <h1 className="welcome-title">Hi, I'm Memora</h1>
            <p className="welcome-subtitle">I'm here to chat with you anytime</p>
          </div>

          <button
            className={`voice-trigger ${state}`}
            onClick={handlePress}
            onKeyDown={handleKeyDown}
            aria-label={getInvitationText()}
            tabIndex={0}
          >
            {/* Minimal border circle */}
            <div className="circle-border"></div>

            {/* Inner content */}
            <div className="circle-inner">
              <div className="circle-label">Speak</div>
            </div>
          </button>

          {/* Example prompts */}
          <div className="example-prompts">
            <p className="prompts-label">You can ask me:</p>
            <div className="prompts-grid">
              <div className="prompt-item">"Where am I?"</div>
              <div className="prompt-item">"Who are my grandchildren?"</div>
              <div className="prompt-item">"I'm feeling worried"</div>
              <div className="prompt-item">"Did I take my medicine?"</div>
            </div>
          </div>
        </div>
      )}

      {/* Active state: Show chat interface */}
      {!showPrivacy && state !== 'idle' && (
        <div className="chat-interface">
          <div className="chat-messages">
            {/* User message */}
            {transcript && (
              <div className="message user-message">
                <div className="message-label">You</div>
                <div className="message-text">{transcript}</div>
              </div>
            )}

            {/* Thinking indicator */}
            {state === 'thinking' && (
              <div className="message memora-message">
                <div className="message-label">Memora</div>
                <div className="thinking-animation">
                  <div className="thinking-dot"></div>
                  <div className="thinking-dot"></div>
                  <div className="thinking-dot"></div>
                </div>
              </div>
            )}

            {/* Memora response */}
            {response && (
              <div className="message memora-message">
                <div className="message-label">Memora</div>
                <div className="message-text">{response}</div>
              </div>
            )}
          </div>

          {/* Status text */}
          <div className="chat-status">{getInvitationText()}</div>
        </div>
      )}

      {/* Ambient context display (top corner, grounding information) */}
      <div className="ambient-context">
        <div className="context-day">
          {currentTime.toLocaleDateString('en-US', { weekday: 'long' })}
        </div>
        <div className="context-date">
          {currentTime.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}
        </div>
        <div className="context-time">
          {currentTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
        </div>
        <div className="context-weather">
          Sunny, 72°F
        </div>
      </div>

      <style jsx>{`
        .voice-interface {
          position: relative;
          width: 100%;
          height: 100vh;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 2rem;
          z-index: 10;
          background: #0a0a0a;
        }

        /* Film grain overlay - matching landing page */
        .voice-interface::before {
          content: '';
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='2.5' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.08'/%3E%3C/svg%3E");
          pointer-events: none;
          opacity: 0.4;
          z-index: 1;
        }

        /* Vignette effect - matching landing page */
        .voice-interface::after {
          content: '';
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: radial-gradient(
            ellipse at center,
            transparent 0%,
            transparent 40%,
            rgba(10, 10, 10, 0.3) 70%,
            rgba(10, 10, 10, 0.6) 100%
          );
          pointer-events: none;
          z-index: 2;
        }

        .interaction-container {
          position: relative;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 3rem;
          z-index: 10;
          max-width: 900px;
          width: 100%;
        }

        /* Welcome message */
        .welcome-message {
          text-align: center;
          margin-bottom: 1rem;
        }

        .welcome-title {
          font-family: 'Literata', Georgia, serif;
          font-size: 3rem;
          font-weight: 400;
          color: #fafaf6;
          margin-bottom: 1rem;
          letter-spacing: 0.02em;
        }

        .welcome-subtitle {
          font-family: 'Literata', Georgia, serif;
          font-size: 1.25rem;
          font-weight: 300;
          color: rgba(250, 250, 246, 0.6);
          letter-spacing: 0.02em;
        }

        /* Example prompts */
        .example-prompts {
          width: 100%;
          text-align: center;
        }

        .prompts-label {
          font-family: 'Inconsolata', monospace;
          font-size: 0.75rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.15em;
          color: rgba(212, 165, 116, 0.5);
          margin-bottom: 1.5rem;
        }

        .prompts-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 1rem;
          max-width: 600px;
          margin: 0 auto;
        }

        .prompt-item {
          font-family: 'Literata', Georgia, serif;
          font-size: 1rem;
          font-weight: 400;
          color: rgba(250, 250, 246, 0.5);
          padding: 1rem 1.5rem;
          border: 1px solid rgba(212, 165, 116, 0.15);
          border-radius: 4px;
          background: rgba(212, 165, 116, 0.02);
          transition: all 0.3s cubic-bezier(0.23, 1, 0.32, 1);
          font-style: italic;
        }

        .prompt-item:hover {
          border-color: rgba(212, 165, 116, 0.3);
          background: rgba(212, 165, 116, 0.05);
          color: rgba(250, 250, 246, 0.7);
        }

        .voice-trigger {
          position: relative;
          width: 240px;
          height: 240px;
          background: transparent;
          border: none;
          cursor: pointer;
          transition: all 0.4s cubic-bezier(0.23, 1, 0.32, 1);
          z-index: 10;
        }

        .voice-trigger:hover:not(:disabled) {
          transform: scale(1.02);
        }

        .voice-trigger:disabled {
          cursor: default;
        }

        /* Minimal border circle */
        .circle-border {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          border: 1px solid rgba(212, 165, 116, 0.3);
          border-radius: 50%;
          transition: all 0.4s cubic-bezier(0.23, 1, 0.32, 1);
        }

        .voice-trigger:hover:not(:disabled) .circle-border {
          border-color: rgba(212, 165, 116, 0.5);
          box-shadow:
            0 0 40px rgba(212, 165, 116, 0.1),
            inset 0 0 40px rgba(212, 165, 116, 0.05);
        }

        .voice-trigger.idle .circle-border {
          animation: breathe 4s ease-in-out infinite;
        }

        @keyframes breathe {
          0%, 100% {
            opacity: 0.6;
            transform: scale(1);
          }
          50% {
            opacity: 1;
            transform: scale(1.01);
          }
        }

        /* Inner content */
        .circle-inner {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          display: flex;
          align-items: center;
          justify-content: center;
          width: 100%;
          height: 100%;
        }

        .circle-label {
          font-family: 'Inconsolata', monospace;
          font-size: 0.875rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.2em;
          color: rgba(212, 165, 116, 0.7);
          transition: all 0.4s cubic-bezier(0.23, 1, 0.32, 1);
        }

        .voice-trigger:hover:not(:disabled) .circle-label {
          color: rgba(212, 165, 116, 0.9);
          letter-spacing: 0.25em;
        }

        /* Active states */
        .voice-trigger.listening .circle-border,
        .voice-trigger.speaking .circle-border {
          border-color: rgba(212, 165, 116, 0.6);
          box-shadow:
            0 0 60px rgba(212, 165, 116, 0.15),
            inset 0 0 60px rgba(212, 165, 116, 0.08);
          animation: pulse-subtle 2s ease-in-out infinite;
        }

        .voice-trigger.listening .circle-label,
        .voice-trigger.speaking .circle-label {
          color: rgba(212, 165, 116, 1);
        }

        @keyframes pulse-subtle {
          0%, 100% {
            opacity: 0.8;
          }
          50% {
            opacity: 1;
          }
        }

        .voice-trigger.thinking .circle-border {
          border-color: rgba(212, 165, 116, 0.4);
          opacity: 0.6;
        }

        /* Invitation text - editorial serif like landing page */
        .invitation-text {
          font-family: 'Literata', Georgia, serif;
          font-size: 1.75rem;
          font-weight: 400;
          color: #fafaf6;
          text-align: center;
          opacity: 0.85;
          letter-spacing: 0.02em;
          text-shadow: 0 2px 30px rgba(0, 0, 0, 0.8);
          transition: opacity 0.5s ease;
          line-height: 1.5;
          max-width: 600px;
          z-index: 10;
          position: relative;
        }

        /* Chat interface */
        .chat-interface {
          position: relative;
          z-index: 10;
          width: 100%;
          max-width: 800px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 2rem;
          animation: fadeIn 0.4s cubic-bezier(0.23, 1, 0.32, 1);
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .chat-messages {
          width: 100%;
          display: flex;
          flex-direction: column;
          gap: 2rem;
        }

        .message {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          animation: slideIn 0.3s cubic-bezier(0.23, 1, 0.32, 1);
        }

        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateX(-10px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        .message-label {
          font-family: 'Inconsolata', monospace;
          font-size: 0.75rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.15em;
          color: rgba(212, 165, 116, 0.6);
        }

        .message-text {
          font-family: 'Literata', Georgia, serif;
          font-size: 1.5rem;
          font-weight: 400;
          line-height: 1.6;
          color: #fafaf6;
          padding: 1.5rem 2rem;
          border: 1px solid rgba(212, 165, 116, 0.2);
          border-radius: 4px;
          background: rgba(212, 165, 116, 0.03);
        }

        .user-message .message-text {
          border-color: rgba(250, 250, 246, 0.2);
          background: rgba(250, 250, 246, 0.03);
        }

        .memora-message .message-label {
          color: rgba(212, 165, 116, 0.8);
        }

        .chat-status {
          font-family: 'Inconsolata', monospace;
          font-size: 0.875rem;
          font-weight: 500;
          text-transform: uppercase;
          letter-spacing: 0.15em;
          color: rgba(212, 165, 116, 0.5);
          margin-top: 1rem;
        }

        /* Thinking animation */
        .thinking-animation {
          display: flex;
          gap: 12px;
          padding: 1.5rem 2rem;
        }

        .thinking-dot {
          width: 8px;
          height: 8px;
          background: rgba(212, 165, 116, 0.6);
          border-radius: 50%;
          animation: thinking-bounce 1.4s ease-in-out infinite;
        }

        .thinking-dot:nth-child(2) {
          animation-delay: 0.2s;
        }

        .thinking-dot:nth-child(3) {
          animation-delay: 0.4s;
        }

        @keyframes thinking-bounce {
          0%, 80%, 100% {
            transform: scale(0.8);
            opacity: 0.5;
          }
          40% {
            transform: scale(1.2);
            opacity: 1;
          }
        }

        /* Top navigation */
        .top-nav {
          position: fixed;
          top: 2rem;
          left: 2rem;
          display: flex;
          gap: 1rem;
          z-index: 100;
        }

        .nav-button {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem 1.25rem;
          border: 1px solid rgba(212, 165, 116, 0.3);
          border-radius: 4px;
          background: rgba(10, 10, 10, 0.8);
          backdrop-filter: blur(10px);
          text-decoration: none;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.23, 1, 0.32, 1);
        }

        .nav-button:hover {
          border-color: rgba(212, 165, 116, 0.6);
          background: rgba(10, 10, 10, 0.95);
          transform: translateY(-1px);
        }

        .nav-icon {
          width: 18px;
          height: 18px;
          color: rgba(212, 165, 116, 0.7);
          transition: color 0.3s cubic-bezier(0.23, 1, 0.32, 1);
        }

        .nav-button:hover .nav-icon {
          color: rgba(212, 165, 116, 0.9);
        }

        .nav-label {
          font-family: 'Inconsolata', monospace;
          font-size: 0.75rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.15em;
          color: rgba(212, 165, 116, 0.7);
          transition: color 0.3s cubic-bezier(0.23, 1, 0.32, 1);
        }

        .nav-button:hover .nav-label {
          color: rgba(212, 165, 116, 0.9);
        }

        /* Privacy Dashboard */
        .privacy-dashboard {
          position: relative;
          z-index: 10;
          width: 100%;
          max-width: 800px;
          padding: 2rem;
        }

        .privacy-header {
          text-align: center;
          margin-bottom: 3rem;
        }

        .privacy-title {
          font-family: 'Literata', Georgia, serif;
          font-size: 2.5rem;
          font-weight: 400;
          color: #fafaf6;
          margin-bottom: 1rem;
          letter-spacing: 0.02em;
        }

        .privacy-subtitle {
          font-family: 'Literata', Georgia, serif;
          font-size: 1.125rem;
          font-weight: 300;
          color: rgba(250, 250, 246, 0.6);
          letter-spacing: 0.02em;
        }

        .privacy-controls {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 1.5rem;
        }

        .privacy-item {
          padding: 1.5rem;
          border: 1px solid rgba(212, 165, 116, 0.2);
          border-radius: 4px;
          background: rgba(212, 165, 116, 0.03);
        }

        .privacy-item-header {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .privacy-item-info {
          flex: 1;
        }

        .privacy-item-title {
          font-family: 'Inconsolata', monospace;
          font-size: 1rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          color: #fafaf6;
          margin-bottom: 0.5rem;
        }

        .privacy-item-description {
          font-family: 'Literata', Georgia, serif;
          font-size: 0.938rem;
          line-height: 1.6;
          color: rgba(250, 250, 246, 0.7);
        }

        /* Toggle Switch */
        .privacy-toggle {
          position: relative;
          display: inline-block;
          width: 52px;
          height: 28px;
          flex-shrink: 0;
          align-self: flex-start;
        }

        .privacy-toggle input {
          opacity: 0;
          width: 0;
          height: 0;
        }

        .toggle-slider {
          position: absolute;
          cursor: pointer;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: rgba(250, 250, 246, 0.2);
          transition: 0.3s;
          border-radius: 28px;
          border: 1px solid rgba(250, 250, 246, 0.3);
        }

        .toggle-slider:before {
          position: absolute;
          content: "";
          height: 20px;
          width: 20px;
          left: 3px;
          bottom: 3px;
          background-color: #fafaf6;
          transition: 0.3s;
          border-radius: 50%;
        }

        input:checked + .toggle-slider {
          background-color: rgba(212, 165, 116, 0.3);
          border-color: rgba(212, 165, 116, 0.6);
        }

        input:checked + .toggle-slider:before {
          transform: translateX(24px);
          background-color: #d4a574;
        }

        /* Privacy Warning */
        .privacy-warning {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          margin-top: 1rem;
          padding: 1rem;
          border-radius: 4px;
          background: rgba(255, 152, 0, 0.08);
          border: 1px solid rgba(255, 152, 0, 0.2);
        }

        .warning-icon {
          width: 20px;
          height: 20px;
          color: #FF9800;
          flex-shrink: 0;
        }

        .privacy-warning span {
          font-family: 'Literata', Georgia, serif;
          font-size: 0.875rem;
          color: rgba(250, 250, 246, 0.8);
          line-height: 1.5;
        }

        .privacy-footer {
          margin-top: 2rem;
          padding-top: 2rem;
          border-top: 1px solid rgba(212, 165, 116, 0.2);
          text-align: center;
        }

        .privacy-note {
          font-family: 'Literata', Georgia, serif;
          font-size: 1rem;
          font-style: italic;
          color: rgba(250, 250, 246, 0.6);
          line-height: 1.6;
        }

        /* Ambient context display - monospace like landing page UI */
        .ambient-context {
          position: fixed;
          top: 2rem;
          right: 2rem;
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 0.375rem;
          font-family: 'Inconsolata', monospace;
          font-size: 0.875rem;
          color: rgba(250, 250, 246, 0.5);
          text-align: right;
          z-index: 100;
          letter-spacing: 0.05em;
        }

        .context-day {
          font-weight: 600;
          font-size: 0.7rem;
          text-transform: uppercase;
          letter-spacing: 0.15em;
          opacity: 0.6;
          color: rgba(250, 250, 246, 0.4);
        }

        .context-date {
          font-weight: 400;
          font-size: 0.875rem;
          color: rgba(250, 250, 246, 0.6);
        }

        .context-time {
          font-weight: 300;
          font-size: 1.5rem;
          color: rgba(212, 165, 116, 0.8);
          margin-top: 0.25rem;
          letter-spacing: 0.05em;
        }

        .context-weather {
          font-weight: 400;
          font-size: 0.7rem;
          margin-top: 0.5rem;
          padding-top: 0.5rem;
          border-top: 1px solid rgba(250, 250, 246, 0.08);
          opacity: 0.5;
          text-transform: uppercase;
          letter-spacing: 0.1em;
        }

        /* Responsive */
        @media (max-width: 768px) {
          .voice-trigger {
            width: 160px;
            height: 160px;
          }

          .center-dot {
            width: 60px;
            height: 60px;
          }

          .invitation-text {
            font-size: 1.25rem;
          }

          .privacy-controls {
            grid-template-columns: 1fr;
          }

          .top-nav {
            gap: 0.5rem;
          }

          .nav-button {
            padding: 0.5rem 0.875rem;
          }
        }

        /* Reduced Motion Support - Accessibility for vestibular disorders */
        @media (prefers-reduced-motion: reduce) {
          .pulse-ring {
            animation: none;
            opacity: 0.3;
          }

          .thinking-dot {
            animation: none;
            transform: scale(1);
            opacity: 0.8;
          }

          .voice-trigger {
            transition: none;
          }

          .voice-trigger:hover:not(:disabled) {
            transform: none;
          }

          .center-dot {
            animation: none !important;
          }
        }

        /* Focus visible for keyboard navigation */
        .voice-trigger:focus-visible {
          outline: 3px solid rgba(212, 165, 116, 0.8);
          outline-offset: 8px;
        }
      `}</style>
    </div>
  );
}
