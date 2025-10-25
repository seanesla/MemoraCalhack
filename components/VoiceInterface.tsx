'use client';

import { useState, useEffect, useRef } from 'react';
import PainterlyWaveform from './PainterlyWaveform';
import ConversationTranscript from './ConversationTranscript';
import { useMockVoiceConnection } from '@/hooks/useMockVoiceConnection';
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
  const synthRef = useRef<SpeechSynthesis | null>(null);

  const {
    isConnected,
    startListening,
    stopListening,
    audioLevel
  } = useMockVoiceConnection();

  // Initialize speech synthesis
  useEffect(() => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      synthRef.current = window.speechSynthesis;
    }
  }, []);

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
    if (!hasSpokenWelcome && synthRef.current) {
      // Wait a moment for page to settle, then speak welcome
      const welcomeTimeout = setTimeout(() => {
        speak("Hello, I'm Memora. I'm here with you. Press the circle to talk to me.");
        setHasSpokenWelcome(true);
      }, 1000);

      return () => clearTimeout(welcomeTimeout);
    }
  }, [hasSpokenWelcome]);

  // Speak function with accessibility features
  const speak = (text: string, options = {}) => {
    if (!synthRef.current) return;

    // Cancel any ongoing speech
    synthRef.current.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.9; // Slightly slower for elderly users
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

    synthRef.current.speak(utterance);
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

  const handlePress = () => {
    if (state === 'idle') {
      // Play audio feedback
      playFeedbackSound(440, 0.1); // A4 note, short beep

      // Voice announcement
      speak("I'm listening. Take your time.");

      setState('listening');
      startListening();

      // Mock: simulate transcript appearing
      setTimeout(() => {
        setTranscript('What day is it today?');
      }, 1500);

      // Mock: transition to thinking
      setTimeout(() => {
        playFeedbackSound(523, 0.15); // C5 note
        speak("Let me think about that.");
        setState('thinking');
        stopListening();
      }, 3000);

      // Mock: transition to speaking with response
      setTimeout(() => {
        setState('speaking');
        const responseText = 'Today is Wednesday, October 23rd. It\'s a beautiful autumn day.';
        setResponse(responseText);
        speak(responseText);
      }, 4500);

      // Mock: return to idle and save conversation
      setTimeout(() => {
        playFeedbackSound(349, 0.2); // F4 note, completion sound

        // Save conversation to shared state
        const userMessage = 'What day is it today?';
        const assistantMessage = 'Today is Wednesday, October 23rd. It\'s a beautiful autumn day.';
        addConversation({
          timestamp: new Date().toISOString(),
          userMessage,
          assistantMessage,
          context: coreMemory?.context
        });
        console.log('Conversation saved to shared state');

        setState('idle');
        setTranscript('');
        setResponse('');
      }, 8000);
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
        return 'I\'m here with you...';
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
        return 'rgba(212, 165, 116, 0.3)';
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

  return (
    <div className="voice-interface">
      {/* Main interaction area */}
      <div className="interaction-container">
        <button
          className={`voice-trigger ${state}`}
          onClick={handlePress}
          onKeyDown={handleKeyDown}
          disabled={state !== 'idle'}
          aria-label={getInvitationText()}
          tabIndex={0}
        >
          {/* Pulsing circles */}
          <div className="pulse-ring"></div>
          <div className="pulse-ring delay-1"></div>
          <div className="pulse-ring delay-2"></div>

          {/* Center dot */}
          <div className="center-dot"></div>
        </button>

        {/* Invitation text */}
        <p className="invitation-text">{getInvitationText()}</p>

        {/* Audio visualization (shows when listening or speaking) */}
        {(state === 'listening' || state === 'speaking') && (
          <PainterlyWaveform
            audioLevel={audioLevel}
            isActive={state === 'listening' || state === 'speaking'}
          />
        )}

        {/* Thinking animation */}
        {state === 'thinking' && (
          <div className="thinking-animation">
            <div className="thinking-dot"></div>
            <div className="thinking-dot"></div>
            <div className="thinking-dot"></div>
          </div>
        )}
      </div>

      {/* Transcript display */}
      <ConversationTranscript
        userText={transcript}
        assistantText={response}
        state={state}
      />

      {/* Connection status indicator (subtle, bottom corner) */}
      <div className="connection-status">
        <div className={`status-dot ${isConnected ? 'connected' : 'disconnected'}`}></div>
      </div>

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
        }

        .interaction-container {
          position: relative;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 3rem;
        }

        .voice-trigger {
          position: relative;
          width: 200px;
          height: 200px;
          background: transparent;
          border: none;
          cursor: pointer;
          transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
        }

        .voice-trigger:hover:not(:disabled) {
          transform: scale(1.05);
        }

        .voice-trigger:disabled {
          cursor: default;
        }

        /* Pulsing rings */
        .pulse-ring {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 100%;
          height: 100%;
          border: 2px solid ${getStatusColor()};
          border-radius: 50%;
          opacity: 0;
          animation: pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }

        .pulse-ring.delay-1 {
          animation-delay: 1s;
        }

        .pulse-ring.delay-2 {
          animation-delay: 2s;
        }

        @keyframes pulse {
          0% {
            transform: translate(-50%, -50%) scale(0.8);
            opacity: 1;
          }
          100% {
            transform: translate(-50%, -50%) scale(1.4);
            opacity: 0;
          }
        }

        /* Center dot */
        .center-dot {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 80px;
          height: 80px;
          background: radial-gradient(
            circle,
            rgba(212, 165, 116, 0.4) 0%,
            rgba(212, 165, 116, 0.2) 50%,
            transparent 100%
          );
          border-radius: 50%;
          box-shadow:
            0 0 40px rgba(212, 165, 116, 0.3),
            inset 0 0 20px rgba(212, 165, 116, 0.2);
        }

        .voice-trigger.listening .center-dot,
        .voice-trigger.speaking .center-dot {
          animation: glow 2s ease-in-out infinite alternate;
        }

        @keyframes glow {
          from {
            box-shadow:
              0 0 40px rgba(212, 165, 116, 0.3),
              inset 0 0 20px rgba(212, 165, 116, 0.2);
          }
          to {
            box-shadow:
              0 0 60px rgba(212, 165, 116, 0.6),
              inset 0 0 30px rgba(212, 165, 116, 0.4);
          }
        }

        /* Invitation text */
        .invitation-text {
          font-family: 'Space Grotesk', sans-serif;
          font-size: 1.5rem;
          font-weight: 300;
          color: #fafaf6;
          text-align: center;
          opacity: 0.7;
          letter-spacing: 0.05em;
          text-shadow: 0 2px 20px rgba(0, 0, 0, 0.5);
          transition: opacity 0.5s ease;
        }

        /* Thinking animation */
        .thinking-animation {
          display: flex;
          gap: 12px;
          margin-top: 2rem;
        }

        .thinking-dot {
          width: 12px;
          height: 12px;
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

        /* Connection status */
        .connection-status {
          position: fixed;
          bottom: 2rem;
          right: 2rem;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          z-index: 100;
        }

        .status-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          transition: all 0.3s ease;
        }

        .status-dot.connected {
          background: rgba(100, 220, 150, 0.8);
          box-shadow: 0 0 10px rgba(100, 220, 150, 0.5);
        }

        .status-dot.disconnected {
          background: rgba(220, 100, 100, 0.5);
        }

        /* Ambient context display */
        .ambient-context {
          position: fixed;
          top: 2rem;
          right: 2rem;
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 0.25rem;
          font-family: 'Space Grotesk', sans-serif;
          font-size: 0.875rem;
          color: rgba(250, 250, 246, 0.5);
          text-align: right;
          z-index: 100;
          letter-spacing: 0.02em;
        }

        .context-day {
          font-weight: 500;
          font-size: 0.75rem;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          opacity: 0.7;
        }

        .context-date {
          font-weight: 400;
          font-size: 0.9rem;
        }

        .context-time {
          font-weight: 300;
          font-size: 1.25rem;
          color: rgba(212, 165, 116, 0.7);
          margin-top: 0.25rem;
        }

        .context-weather {
          font-weight: 400;
          font-size: 0.75rem;
          margin-top: 0.5rem;
          padding-top: 0.5rem;
          border-top: 1px solid rgba(250, 250, 246, 0.1);
          opacity: 0.6;
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
