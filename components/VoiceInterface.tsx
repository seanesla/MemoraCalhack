'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@clerk/nextjs';
import { createClient, LiveTranscriptionEvents } from '@deepgram/sdk';
import type { LiveClient } from '@deepgram/sdk';
import { useLocalParticipant } from '@livekit/components-react';
import { Track } from 'livekit-client';
import { LiveKitAudioProcessor, VoiceActivityDetector } from '@/lib/audio-processing';

type VoiceState = 'idle' | 'listening' | 'thinking' | 'speaking' | 'error';

interface Message {
  id: string;
  role: 'USER' | 'ASSISTANT';
  content: string;
  timestamp: string;
  edited: boolean;
  editedAt: string | null;
}

interface Conversation {
  id: string;
  title: string;
  startedAt: string;
  lastMessageAt: string;
  messageCount: number;
}

interface MemoraCoreMemory {
  persona: string;
  patient: string;
  context: string;
}

export default function VoiceInterface({ patientId: propPatientId }: { patientId?: string | null }) {
  // Authentication
  const { userId } = useAuth();

  // LiveKit integration
  const { localParticipant, microphoneTrack } = useLocalParticipant();

  // Core UI state
  const [state, setState] = useState<VoiceState>('idle');
  const [transcript, setTranscript] = useState<string>('');
  const [response, setResponse] = useState<string>('');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [hasSpokenWelcome, setHasSpokenWelcome] = useState(false);
  const [coreMemory, setCoreMemory] = useState<MemoraCoreMemory | null>(null);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const synthRef = useRef<SpeechSynthesis | null>(null);

  // LiveKit audio processing refs (replacing MediaRecorder)
  const audioProcessorRef = useRef<LiveKitAudioProcessor | null>(null);
  const vadRef = useRef<VoiceActivityDetector | null>(null);
  const vadIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Privacy settings state
  const [privacySettings, setPrivacySettings] = useState({
    conversations: true,
    location: true,
    medicationTracking: true,
    activityMonitoring: true
  });

  // Debug/detailed UI state
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioLevel, setAudioLevel] = useState(0);
  const [apiStatus, setApiStatus] = useState<string>('Ready');
  const [debugLog, setDebugLog] = useState<string[]>([]);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);

  // Supabase conversation state (replacing localStorage)
  const [patientId, setPatientId] = useState<string | null>(propPatientId || null);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [conversationHistory, setConversationHistory] = useState<Message[]>([]);
  const [allConversations, setAllConversations] = useState<Conversation[]>([]);
  const [showSessionList, setShowSessionList] = useState(false);
  const [lastMessageTimestamp, setLastMessageTimestamp] = useState<string | null>(null);

  // Chat interface state
  const [textInput, setTextInput] = useState<string>('');
  const [silenceCounter, setSilenceCounter] = useState(0);
  const chatHistoryContainerRef = useRef<HTMLDivElement | null>(null);

  // Deepgram real-time transcription state
  const [deepgramToken, setDeepgramToken] = useState<string | null>(null);
  const deepgramConnectionRef = useRef<LiveClient | null>(null);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const liveTranscriptRef = useRef<string>(''); // Store live transcript for callback access

  // Debug helper function
  const addDebugLog = (message: string) => {
    console.log('[DEBUG]', message);
    setDebugLog(prev => [...prev.slice(-9), `${new Date().toLocaleTimeString()}: ${message}`]);
    setApiStatus(message);
  };

  // Initialize: Load patient ID, conversations list, and most recent conversation
  useEffect(() => {
    if (!userId && !patientId) return;

    const initializeConversations = async () => {
      try {
        // Get list of all conversations for authenticated user
        // API will determine patient from auth context
        const conversationsRes = await fetch('/api/conversations', {
          headers: { 'Content-Type': 'application/json' },
        });

        if (!conversationsRes.ok) {
          console.error('Failed to fetch conversations:', conversationsRes.status);
          return;
        }

        const conversationsData = await conversationsRes.json();
        setAllConversations(conversationsData.conversations);

        // Load most recent conversation if it exists
        if (conversationsData.conversations.length > 0) {
          const mostRecent = conversationsData.conversations[0];
          setCurrentConversationId(mostRecent.id);
          setLastMessageTimestamp(mostRecent.lastMessageAt);

          // Fetch messages for most recent conversation
          const messagesRes = await fetch(
            `/api/conversations/${mostRecent.id}/messages`,
            { headers: { 'Content-Type': 'application/json' } }
          );

          if (messagesRes.ok) {
            const messagesData = await messagesRes.json();
            setConversationHistory(messagesData.messages);
          }
        }
      } catch (error) {
        console.error('Error initializing conversations:', error);
      }
    };

    initializeConversations();
  }, [userId]);

  // Fetch Deepgram token on mount for real-time transcription
  useEffect(() => {
    const fetchDeepgramToken = async () => {
      try {
        const response = await fetch('/api/audio/token');
        if (response.ok) {
          const data = await response.json();
          setDeepgramToken(data.token);
          console.log('Deepgram token fetched successfully');
        } else {
          console.error('Failed to fetch Deepgram token:', response.status);
        }
      } catch (error) {
        console.error('Error fetching Deepgram token:', error);
      }
    };

    fetchDeepgramToken();
  }, []);

  // Auto-scroll chat history to bottom when new messages arrive
  useEffect(() => {
    if (chatHistoryContainerRef.current) {
      chatHistoryContainerRef.current.scrollTop = chatHistoryContainerRef.current.scrollHeight;
    }
  }, [conversationHistory]);

  // Voice-guided onboarding - speak welcome message on first load
  useEffect(() => {
    if (!hasSpokenWelcome) {
      // Wait a moment for page to settle, then speak welcome
      const welcomeTimeout = setTimeout(async () => {
        await speak("Hello, I'm Memora. I'm here with you. You can talk to me or type a message.");
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

  // Handle text message submission
  const handleTextSubmit = async () => {
    if (!textInput.trim()) return;

    const userMessage = textInput.trim();
    setTextInput('');

    try {
      // Transition to thinking state
      setState('thinking');
      playFeedbackSound(523, 0.15); // C5 note
      speak('Let me think about that.');

      console.log('Sending text to conversation API:', { message: userMessage, conversationId: currentConversationId });

      // Build request body - only include conversationId if it has a value
      const requestBody: any = { message: userMessage };
      if (currentConversationId) {
        requestBody.conversationId = currentConversationId;
      }

      // Send to Claude API
      const conversationRes = await fetch('/api/conversation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      if (!conversationRes.ok) {
        const errorText = await conversationRes.text();
        console.error('Conversation API error:', errorText);
        throw new Error(`Conversation API failed: ${conversationRes.status}`);
      }

      const conversationData = await conversationRes.json();
      const responseText = conversationData.response;
      const newConversationId = conversationData.conversationId;

      console.log('Claude response received:', responseText);

      // Update conversation ID if this was a new conversation
      if (!currentConversationId) {
        setCurrentConversationId(newConversationId);
        setLastMessageTimestamp(new Date().toISOString());
      }

      // Reload conversation messages from database
      try {
        const messagesRes = await fetch(
          `/api/conversations/${newConversationId}/messages`,
          { headers: { 'Content-Type': 'application/json' } }
        );

        if (messagesRes.ok) {
          const messagesData = await messagesRes.json();
          setConversationHistory(messagesData.messages);
        }
      } catch (error) {
        console.warn('Failed to reload conversation messages:', error);
      }

      // Refresh conversation list in modal (so "Back" shows new conversation)
      try {
        const refreshRes = await fetch('/api/conversations', {
          headers: { 'Content-Type': 'application/json' },
        });

        if (refreshRes.ok) {
          const refreshData = await refreshRes.json();
          setAllConversations(refreshData.conversations);
        }
      } catch (error) {
        console.warn('Failed to refresh conversation list:', error);
      }

      // Transition to speaking state
      setState('speaking');
      playFeedbackSound(349, 0.2); // F4 note
      speak(responseText);

      // Return to idle after speech completes
      setTimeout(() => {
        setState('idle');
      }, responseText.length * 50);
    } catch (error) {
      console.error('Error in text submission:', error);
      setState('error');
    }
  };;

  // Update time every minute for ambient context display
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // Update every minute

    return () => clearInterval(timer);
  }, []);

  // Check if 30+ minutes have passed since last message
  const isTimeGapTooLarge = (): boolean => {
    if (!lastMessageTimestamp) return false;
    const now = new Date();
    const lastMessage = new Date(lastMessageTimestamp);
    const diffMinutes = (now.getTime() - lastMessage.getTime()) / 1000 / 60;
    return diffMinutes > 30;
  };

  // Load a specific conversation's messages
  const loadConversation = async (conversationId: string) => {
    try {
      const messagesRes = await fetch(`/api/conversations/${conversationId}/messages`, {
        headers: { 'Content-Type': 'application/json' },
      });

      if (messagesRes.ok) {
        const messagesData = await messagesRes.json();
        setConversationHistory(messagesData.messages);
        setCurrentConversationId(conversationId);
        setLastMessageTimestamp(messagesData.conversation.lastMessageAt);
        setShowSessionList(false);
      }
    } catch (error) {
      console.error('Failed to load conversation:', error);
    }
  };

  // Start a new conversation
  const startNewConversation = () => {
    setCurrentConversationId(null);
    setConversationHistory([]);
    setLastMessageTimestamp(null);
    setShowSessionList(false);
  };

  // Initialize Deepgram live transcription connection
  // Returns a Promise that resolves when the WebSocket connection opens
  const initializeDeepgramConnection = (): Promise<LiveClient> => {
    return new Promise((resolve, reject) => {
      if (!deepgramToken) {
        console.error('Cannot initialize Deepgram: token not available');
        reject(new Error('Deepgram token not available'));
        return;
      }

      try {
        // CRITICAL: Use accessToken option for JWT tokens (not raw string)
        const deepgram = createClient({ accessToken: deepgramToken });
        const connection = deepgram.listen.live({
          model: 'nova-2',
          language: 'en-US',
          smart_format: true,
          interim_results: true,
        });

        connection.on(LiveTranscriptionEvents.Open, () => {
          console.log('Deepgram WebSocket connection opened');
          setIsTranscribing(true);
          resolve(connection); // Resolve promise when connection opens
        });

        connection.on(LiveTranscriptionEvents.Transcript, (data: any) => {
          const transcript = data.channel?.alternatives?.[0]?.transcript || '';
          const isFinal = data.is_final;

          if (transcript) {
            console.log('Transcript received:', { transcript, isFinal });

            if (isFinal) {
              // Final transcript - append to accumulated text
              const newText = liveTranscriptRef.current + ' ' + transcript;
              liveTranscriptRef.current = newText.trim();
              setTextInput(newText.trim());
              console.log('Final transcript accumulated:', liveTranscriptRef.current);
            } else {
              // Interim transcript - show in real-time but don't store yet
              const previewText = liveTranscriptRef.current + ' ' + transcript;
              setTextInput(previewText.trim());
            }
          }
        });

        connection.on(LiveTranscriptionEvents.Error, (error: any) => {
          console.error('Deepgram error:', error);
          setIsTranscribing(false);
          reject(error);
        });

        connection.on(LiveTranscriptionEvents.Close, () => {
          console.log('Deepgram connection closed');
          setIsTranscribing(false);
        });
      } catch (error) {
        console.error('Error initializing Deepgram:', error);
        reject(error);
      }
    });
  };

  const handlePress = async () => {
    if (state === 'idle') {
      // ===== START RECORDING (First Click) =====
      try {
        // Check if we need to start a new conversation due to time gap
        if (currentConversationId && isTimeGapTooLarge()) {
          console.log('30+ minute gap detected, starting new conversation');
          addDebugLog('Starting new session (30+ min gap)');
          startNewConversation();
        }

        addDebugLog('🎤 Starting recording...');
        playFeedbackSound(440, 0.1); // A4 note, short beep
        speak("I'm listening. Take your time.");
        setState('listening');
        setRecordingTime(0);
        setTextInput(''); // Clear previous transcript for new recording
        liveTranscriptRef.current = ''; // Clear ref for new recording

        // Initialize Deepgram WebSocket and wait for connection to open
        addDebugLog('🔌 Connecting to Deepgram WebSocket...');
        const connection = await initializeDeepgramConnection();
        deepgramConnectionRef.current = connection;
        addDebugLog('✅ Deepgram WebSocket ready for streaming');

        // Enable LiveKit microphone
        addDebugLog('📍 Enabling LiveKit microphone...');
        await localParticipant.setMicrophoneEnabled(true, {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        });

        // Wait for microphone track to be available
        let attempts = 0;
        while (!microphoneTrack && attempts < 50) {
          await new Promise(resolve => setTimeout(resolve, 100));
          attempts++;
        }

        // Access the underlying audio track from the publication
        const audioTrack = microphoneTrack?.audioTrack;
        if (!microphoneTrack || !audioTrack || !audioTrack.mediaStreamTrack) {
          throw new Error('Failed to get microphone track from LiveKit');
        }

        addDebugLog('✅ LiveKit microphone enabled');

        // Create audio processor for LiveKit → Deepgram
        const processor = new LiveKitAudioProcessor({
          sampleRate: 16000,
          channelCount: 1,
          chunkDurationMs: 100,
        });

        audioProcessorRef.current = processor;

        // Create VAD for silence detection
        const vad = new VoiceActivityDetector(0.01, 3000, 16000);
        vadRef.current = vad;

        // Start processing audio with callback to stream to Deepgram
        await processor.start(audioTrack.mediaStreamTrack, (pcmData: Int16Array) => {
          // Send PCM data to Deepgram WebSocket
          if (deepgramConnectionRef.current) {
            // Convert Int16Array to ArrayBuffer for Deepgram
            const buffer = pcmData.buffer;
            deepgramConnectionRef.current.send(buffer);
          }

          // Voice Activity Detection
          if (vadRef.current) {
            const silenceDetected = vadRef.current.detectSilence(pcmData, 100);

            if (silenceDetected) {
              console.log('Silence detected after speaking - auto-stopping recording');
              addDebugLog('Silence detected - auto-stopping');
              
              // Stop recording
              if (audioProcessorRef.current) {
                audioProcessorRef.current.stop();
                audioProcessorRef.current = null;
              }

              if (vadIntervalRef.current) {
                clearInterval(vadIntervalRef.current);
                vadIntervalRef.current = null;
              }

              // Disable LiveKit microphone
              localParticipant.setMicrophoneEnabled(false);

              // Trigger completion flow
              handleRecordingComplete();
            }
          }
        });

        addDebugLog('▶️ Recording started. Listening for your voice...');

        // Start recording time counter
        const monitoringInterval = setInterval(() => {
          setRecordingTime(t => t + 0.1);
        }, 100);
        vadIntervalRef.current = monitoringInterval;

        // Reset silence counter when starting new recording
        setSilenceCounter(0);

      } catch (error) {
        addDebugLog(`⚠️ Error: ${(error as Error).message}`);
        setState('error');
        
        // Cleanup on error
        if (audioProcessorRef.current) {
          audioProcessorRef.current.stop();
          audioProcessorRef.current = null;
        }
        
        if (vadIntervalRef.current) {
          clearInterval(vadIntervalRef.current);
          vadIntervalRef.current = null;
        }

        await localParticipant.setMicrophoneEnabled(false);
      }

    } else if (state === 'listening') {
      // ===== STOP RECORDING (Second Click) =====
      console.log('Stop recording triggered');
      addDebugLog('Stopping recording...');

      // Stop audio processor
      if (audioProcessorRef.current) {
        audioProcessorRef.current.stop();
        audioProcessorRef.current = null;
      }

      // Clear VAD interval
      if (vadIntervalRef.current) {
        clearInterval(vadIntervalRef.current);
        vadIntervalRef.current = null;
      }

      // Disable LiveKit microphone
      await localParticipant.setMicrophoneEnabled(false);

      // Trigger completion flow
      handleRecordingComplete();

    } else if (state === 'error') {
      // ===== RESET FROM ERROR STATE =====
      console.log('Resetting from error state');
      setState('idle');
      setTextInput('');
      setTranscript('');
      setResponse('');
    }
  };

  // Extracted completion logic (called after recording stops)
  const handleRecordingComplete = async () => {
    console.log('🛑 Recording stopped');
    try {
      // Close Deepgram WebSocket connection
      if (deepgramConnectionRef.current) {
        deepgramConnectionRef.current.finish();
        addDebugLog('🔒 Deepgram connection closed');
      }

      // Use real-time transcript from ref (populated by Transcript events)
      const finalText = liveTranscriptRef.current.trim();
      console.log('Final transcript from real-time stream:', finalText);
      addDebugLog(`Final transcript: "${finalText}"`);

      if (!finalText) {
        addDebugLog('No speech detected');
        setState('error');
        return;
      }

      setTranscript(finalText);
      setTextInput(finalText); // Update textInput for display

      // ===== TRANSITION TO THINKING =====
      addDebugLog('💭 Processing your message...');
      playFeedbackSound(523, 0.15); // C5 note
      speak('Let me think about that.');
      setState('thinking');

      // ===== GET AI RESPONSE =====
      addDebugLog(`🤖 Calling Claude with: "${finalText.substring(0, 50)}..."`);

      // Build request body - include conversationId if it exists
      const requestBody: any = { message: finalText };
      if (currentConversationId) {
        requestBody.conversationId = currentConversationId;
      }
      if (patientId) {
        requestBody.patientId = patientId;
      }

      console.log('🤖 Sending to conversation API:', requestBody);

      const conversationRes = await fetch('/api/conversation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      console.log('📥 Conversation response:', {
        status: conversationRes.status,
        statusText: conversationRes.statusText,
      });

      if (!conversationRes.ok) {
        const errorText = await conversationRes.text();
        console.error('❌ Conversation API error:', errorText);
        throw new Error(
          `Conversation API failed: ${conversationRes.status} - ${errorText}`
        );
      }

      const conversationData = await conversationRes.json();
      console.log('✅ Conversation data received:', conversationData);

      const { response: responseText, conversationId: newConvId } = conversationData;
      console.log('🤖 Claude response:', responseText);
      addDebugLog(`✅ Claude responded: "${responseText.substring(0, 50)}..."`);
      addDebugLog('🔊 Speaking response...');

      // Update conversation ID if this was a new conversation
      if (!currentConversationId) {
        setCurrentConversationId(newConvId);
        setLastMessageTimestamp(new Date().toISOString());
      }

      // ===== TRANSITION TO SPEAKING =====
      setState('speaking');
      setResponse(responseText);
      speak(responseText);

      // ===== RETURN TO IDLE =====
      addDebugLog('✨ Conversation complete, returning to idle...');
      setTimeout(async () => {
        playFeedbackSound(349, 0.2); // F4 note, completion sound

        // Reload conversation messages from Supabase
        try {
          const messagesRes = await fetch(
            `/api/conversations/${newConvId}/messages`,
            { headers: { 'Content-Type': 'application/json' } }
          );

          if (messagesRes.ok) {
            const messagesData = await messagesRes.json();
            setConversationHistory(messagesData.messages);
          }
        } catch (error) {
          console.warn('Failed to reload messages:', error);
        }

        addDebugLog('💾 Conversation saved to Supabase');

        setState('idle');
        setTranscript('');
        setResponse('');
        setTextInput(''); // Clear input for next message
        setDebugLog([]);
      }, 3500);

    } catch (error) {
      addDebugLog(`⚠️ Error: ${(error as Error).message}`);
      setState('error');
    }
  };

  // Handle keyboard press (Space or Enter)
  const handleKeyDown = (e: React.KeyboardEvent) => {
    console.log('⌨️  KEYBOARD EVENT:', { code: e.code, state });
    if (e.code === 'Space' || e.code === 'Enter') {
      console.log('⌨️  SPACE/ENTER DETECTED. Current state:', state);
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


      {/* Chat History Panel - Always show (contains both welcome and chat states) */}
      {!showPrivacy && (
        <div className="chat-history-panel">
          {/* Navigation Bar - Unified with Home/My Data */}
          <div className="chat-nav-bar">
            <div className="nav-left">
              <a href="/" className="nav-link-button" title="Go home">
                Home
              </a>
              <button
                className="nav-link-button"
                onClick={() => setShowPrivacy(true)}
                title="View privacy settings"
              >
                What We Track
              </button>
            </div>
            <div className="nav-title">
              {currentConversationId && allConversations.find(c => c.id === currentConversationId)?.title || 'New Chat'}
            </div>
            <div className="nav-right">
              <button
                className="nav-back-button"
                onClick={() => setShowSessionList(!showSessionList)}
                title="Back to sessions"
              >
                Back
              </button>
              <button
                className="nav-new-button"
                onClick={startNewConversation}
                title="Start new conversation"
              >
                New Chat
              </button>
            </div>
          </div>

          {/* Session List Modal */}
          {showSessionList && (
            <div className="session-list-modal">
              <div className="session-list-overlay" onClick={() => setShowSessionList(false)}></div>
              <div className="session-list-content">
                <div className="session-list-header">
                  <h2>Your Conversations</h2>
                  <button
                    className="session-list-close"
                    onClick={() => setShowSessionList(false)}
                  >
                    Close
                  </button>
                </div>
                <div className="session-list">
                  {allConversations.length === 0 ? (
                    <p className="session-list-empty">No conversations yet</p>
                  ) : (
                    allConversations.map((conv) => (
                      <div
                        key={conv.id}
                        className={`session-list-item ${currentConversationId === conv.id ? 'active' : ''}`}
                        onClick={() => loadConversation(conv.id)}
                      >
                        <div className="session-info">
                          <div className="session-title">{conv.title}</div>
                          <div className="session-time">
                            {new Date(conv.lastMessageAt).toLocaleString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              hour: 'numeric',
                              minute: '2-digit',
                              hour12: true,
                            })}
                          </div>
                        </div>
                        <div className="session-count">{conv.messageCount} messages</div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Conversation History / Welcome State */}
          <div className="chat-history-container" ref={chatHistoryContainerRef}>
            {conversationHistory.length === 0 ? (
              <div className="welcome-state">
                <div className="welcome-message-large">
                  <h2>Hi, I'm Memora</h2>
                  <p>I'm here to chat with you anytime</p>
                </div>
                <div className="example-prompts-large">
                  <p className="prompts-label-large">You can ask me:</p>
                  <div className="prompts-grid-large">
                    <div className="prompt-item-large">"Where am I?"</div>
                    <div className="prompt-item-large">"Who are my grandchildren?"</div>
                    <div className="prompt-item-large">"I'm feeling worried"</div>
                    <div className="prompt-item-large">"Did I take my medicine?"</div>
                  </div>
                </div>
              </div>
            ) : (
              conversationHistory.map((msg) => (
                <div key={msg.id} className="conversation-entry">
                  {msg.role === 'USER' ? (
                    <div className="message-block user-message-block">
                      <div className="message-header">
                        <span className="message-sender">You</span>
                        <span className="message-time">
                          {new Date(msg.timestamp).toLocaleTimeString('en-US', {
                            hour: 'numeric',
                            minute: '2-digit',
                            hour12: true,
                          })}
                        </span>
                      </div>
                      <div className="message-content">{msg.content}</div>
                    </div>
                  ) : (
                    <div className="message-block assistant-message-block">
                      <div className="message-header">
                        <span className="message-sender">Memora</span>
                      </div>
                      <div className="message-content">{msg.content}</div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Input Area - Text + Voice */}
          <div className="chat-input-area">
            <div className="input-controls">
              {/* Mic button */}
              <button
                className={`input-mic-button state-${state}`}
                onClick={handlePress}
                onKeyDown={handleKeyDown}
                disabled={state === 'thinking' || state === 'speaking'}
                title={state === 'listening' ? 'Release or press space to stop' : 'Click to record'}
              >
                <svg
                  className="mic-icon"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path d="M10 2a3 3 0 00-3 3v4a3 3 0 006 0V5a3 3 0 00-3-3z" />
                  <path
                    fillRule="evenodd"
                    d="M4 10.5a1 1 0 00-1 1A6 6 0 0010 17a6 6 0 007-5.5 1 1 0 11-2 0 4 4 0 11-8 0 1 1 0 00-1-1z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>

              {/* Text input */}
              <input
                type="text"
                className="text-input"
                placeholder="Type a message..."
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleTextSubmit();
                  }
                }}
                disabled={state === 'thinking' || state === 'speaking' || state === 'listening'}
              />

              {/* Send button */}
              <button
                className="send-button"
                onClick={handleTextSubmit}
                disabled={
                  !textInput.trim() ||
                  state === 'thinking' ||
                  state === 'speaking' ||
                  state === 'listening'
                }
                title="Send message (Enter)"
              >
                <svg
                  className="send-icon"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5.951-2.965L9 13h2l1.774 1.997 5.951 2.965a1 1 0 001.169-1.409l-7-14z" />
                </svg>
              </button>
            </div>

            {/* Status indicator */}
            {(state === 'listening' || state === 'thinking' || state === 'speaking') && (
              <div className="input-status">
                {state === 'listening' && '🎤 Recording...'}
                {state === 'thinking' && '💭 Thinking...'}
                {state === 'speaking' && '🔊 Speaking...'}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Active state: Show chat interface (keeping for compatibility, but using history panel) */}
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

        /* Ambient context display - bottom right corner */
        .ambient-context {
          position: fixed;
          bottom: 1rem;
          right: 2rem;
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 0.375rem;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          font-size: 0.875rem;
          color: rgba(250, 250, 246, 0.5);
          text-align: right;
          z-index: 5;
          letter-spacing: 0.05em;
        }

        .context-day {
          font-family: 'Space Grotesk', sans-serif;
          font-weight: 700;
          font-size: 0.7rem;
          text-transform: uppercase;
          letter-spacing: 0.15em;
          opacity: 0.6;
          color: rgba(250, 250, 246, 0.4);
        }

        .context-date {
          font-family: 'Space Grotesk', sans-serif;
          font-weight: 500;
          font-size: 0.875rem;
          color: rgba(250, 250, 246, 0.6);
        }

        .context-time {
          font-family: 'Space Grotesk', sans-serif;
          font-weight: 700;
          font-size: 1.5rem;
          color: rgba(212, 165, 116, 0.8);
          margin-top: 0.25rem;
          letter-spacing: -0.01em;
        }

        .context-weather {
          font-family: 'Space Grotesk', sans-serif;
          font-weight: 600;
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

        /* Chat History Panel - New unified chat UI */
        .chat-history-panel {
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          display: flex;
          flex-direction: column;
          height: 100vh;
          z-index: 20;
          background: linear-gradient(180deg, rgba(10, 10, 10, 0.8) 0%, rgba(10, 10, 10, 0.95) 100%);
          backdrop-filter: blur(10px);
        }

        /* Conversation History Container */
        .chat-history-container {
          flex: 1;
          overflow-y: auto;
          padding: 2rem;
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
          max-width: 900px;
          margin: 0 auto;
          width: 100%;
        }

        .chat-empty-state {
          display: flex;
          align-items: center;
          justify-content: center;
          height: 100%;
          color: rgba(250, 250, 246, 0.4);
          font-family: 'Literata', Georgia, serif;
          font-size: 1.1rem;
        }

        /* Conversation Entry */
        .conversation-entry {
          display: flex;
          flex-direction: column;
          gap: 1rem;
          animation: slideInUp 0.3s ease-out;
        }

        @keyframes slideInUp {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        /* Message Block */
        .message-block {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          max-width: 70%;
        }

        .user-message-block {
          align-self: flex-end;
          align-items: flex-end;
        }

        .assistant-message-block {
          align-self: flex-start;
          align-items: flex-start;
        }

        /* Message Header */
        .message-header {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          font-family: 'Inconsolata', monospace;
          font-size: 0.75rem;
          text-transform: uppercase;
          letter-spacing: 0.1em;
        }

        .message-sender {
          color: rgba(212, 165, 116, 0.8);
          font-weight: 600;
        }

        .message-time {
          color: rgba(250, 250, 246, 0.4);
          font-weight: 400;
        }

        /* Message Content */
        .message-content {
          font-family: 'Literata', Georgia, serif;
          font-size: 1rem;
          line-height: 1.6;
          color: rgba(250, 250, 246, 0.9);
          padding: 1rem;
          border-radius: 4px;
          word-wrap: break-word;
        }

        .user-message-block .message-content {
          background: rgba(212, 165, 116, 0.15);
          border: 1px solid rgba(212, 165, 116, 0.3);
        }

        .assistant-message-block .message-content {
          background: rgba(250, 250, 246, 0.05);
          border: 1px solid rgba(250, 250, 246, 0.1);
        }

        /* Chat Input Area */
        .chat-input-area {
          border-top: 1px solid rgba(212, 165, 116, 0.2);
          padding: 1rem;
          background: rgba(10, 10, 10, 0.95);
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          align-items: center;
        }

        /* Input Controls */
        .input-controls {
          display: flex;
          gap: 0.75rem;
          width: 100%;
          max-width: 600px;
          align-items: center;
        }

        /* Mic Button */
        .input-mic-button {
          flex-shrink: 0;
          width: 60px;
          height: 60px;
          border-radius: 50%;
          border: 2px solid rgba(212, 165, 116, 0.4);
          background: transparent;
          color: rgba(212, 165, 116, 0.7);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.3s ease;
          padding: 0;
        }

        .input-mic-button:hover:not(:disabled) {
          border-color: rgba(212, 165, 116, 0.8);
          color: rgba(212, 165, 116, 1);
          background: rgba(212, 165, 116, 0.1);
        }

        .input-mic-button.state-listening {
          border-color: #4CAF50;
          color: #4CAF50;
          background: rgba(76, 175, 80, 0.15);
          animation: pulse 1.5s ease-in-out infinite;
        }

        @keyframes pulse {
          0%, 100% {
            box-shadow: 0 0 0 0 rgba(76, 175, 80, 0.4);
          }
          50% {
            box-shadow: 0 0 0 10px rgba(76, 175, 80, 0);
          }
        }

        .input-mic-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .mic-icon {
          width: 28px;
          height: 28px;
        }

        /* Text Input */
        .text-input {
          flex: 1;
          height: 60px;
          padding: 1rem 1.25rem;
          border: 1px solid rgba(212, 165, 116, 0.3);
          border-radius: 8px;
          background: rgba(250, 250, 246, 0.05);
          color: rgba(250, 250, 246, 0.9);
          font-family: 'Literata', Georgia, serif;
          font-size: 1rem;
          transition: all 0.2s ease;
          outline: none;
        }

        .text-input:focus {
          border-color: rgba(212, 165, 116, 0.6);
          background: rgba(250, 250, 246, 0.08);
        }

        .text-input::placeholder {
          color: rgba(250, 250, 246, 0.4);
        }

        .text-input:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        /* Send Button */
        .send-button {
          flex-shrink: 0;
          width: 60px;
          height: 60px;
          border-radius: 50%;
          border: 2px solid rgba(212, 165, 116, 0.4);
          background: transparent;
          color: rgba(212, 165, 116, 0.7);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.3s ease;
          padding: 0;
        }

        .send-button:hover:not(:disabled) {
          border-color: rgba(212, 165, 116, 0.8);
          color: rgba(212, 165, 116, 1);
          background: rgba(212, 165, 116, 0.15);
          transform: scale(1.05);
        }

        .send-button:disabled {
          opacity: 0.3;
          cursor: not-allowed;
        }

        .send-icon {
          width: 28px;
          height: 28px;
        }

        /* Input Status */
        .input-status {
          font-family: 'Inconsolata', monospace;
          font-size: 0.75rem;
          color: rgba(212, 165, 116, 0.6);
          text-align: center;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          animation: fadeIn 0.3s ease;
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        /* Chat History Scrollbar */
        .chat-history-container::-webkit-scrollbar {
          width: 8px;
        }

        .chat-history-container::-webkit-scrollbar-track {
          background: rgba(212, 165, 116, 0.1);
        }

        .chat-history-container::-webkit-scrollbar-thumb {
          background: rgba(212, 165, 116, 0.3);
          border-radius: 4px;
        }

        .chat-history-container::-webkit-scrollbar-thumb:hover {
          background: rgba(212, 165, 116, 0.5);
        }

        /* Navigation Bar */
        .chat-nav-bar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.75rem 1rem;
          background: rgba(212, 165, 116, 0.1);
          border-bottom: 1px solid rgba(212, 165, 116, 0.2);
          min-height: 50px;
          gap: 1rem;
        }

        .nav-left,
        .nav-right {
          display: flex;
          gap: 0.5rem;
          align-items: center;
        }

        .nav-link-button,
        .nav-back-button,
        .nav-new-button {
          background: transparent;
          color: #fafaf6;
          border: 1px solid rgba(212, 165, 116, 0.3);
          padding: 0.5rem 1rem;
          border-radius: 4px;
          font-family: 'Space Grotesk', sans-serif;
          font-size: 0.875rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          text-decoration: none;
        }

        .nav-link-button:hover,
        .nav-back-button:hover,
        .nav-new-button:hover {
          background: rgba(212, 165, 116, 0.15);
          border-color: rgba(212, 165, 116, 0.5);
        }

        .nav-title {
          font-family: 'Space Grotesk', sans-serif;
          font-size: 0.95rem;
          font-weight: 600;
          color: #fafaf6;
          flex: 1;
          text-align: center;
          padding: 0 1rem;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          min-width: 150px;
        }

        /* Welcome State */
        .welcome-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 3rem 2rem;
          text-align: center;
          height: 100%;
        }

        .welcome-message-large {
          margin-bottom: 3rem;
        }

        .welcome-message-large h2 {
          font-family: 'Space Grotesk', sans-serif;
          font-size: 2.5rem;
          font-weight: 700;
          color: #fafaf6;
          margin: 0 0 1rem 0;
          letter-spacing: -0.01em;
        }

        .welcome-message-large p {
          font-family: 'Space Grotesk', sans-serif;
          font-size: 1.1rem;
          font-weight: 400;
          color: rgba(250, 250, 246, 0.6);
          margin: 0;
          letter-spacing: -0.01em;
        }

        .example-prompts-large {
          width: 100%;
        }

        .prompts-label-large {
          font-family: 'Space Grotesk', sans-serif;
          font-size: 0.75rem;
          font-weight: 700;
          text-transform: uppercase;
          color: rgba(250, 250, 246, 0.5);
          margin-bottom: 1.5rem;
          letter-spacing: 0.1em;
        }

        .prompts-grid-large {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1rem;
          max-width: 600px;
          margin: 0 auto;
        }

        .prompt-item-large {
          padding: 1.5rem;
          background: rgba(212, 165, 116, 0.1);
          border: 1px solid rgba(212, 165, 116, 0.2);
          border-radius: 6px;
          color: #fafaf6;
          font-family: 'Space Grotesk', sans-serif;
          font-size: 0.95rem;
          font-weight: 500;
          cursor: default;
          transition: all 0.2s ease;
        }

        .prompt-item-large:hover {
          background: rgba(212, 165, 116, 0.15);
          border-color: rgba(212, 165, 116, 0.4);
        }

        /* Session List Modal */
        .session-list-modal {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          z-index: 1000;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .session-list-overlay {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.7);
          backdrop-filter: blur(4px);
        }

        .session-list-content {
          position: relative;
          z-index: 1001;
          background: #1a1a1a;
          border: 1px solid rgba(212, 165, 116, 0.2);
          border-radius: 8px;
          width: 90%;
          max-width: 500px;
          max-height: 80vh;
          display: flex;
          flex-direction: column;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.8);
        }

        .session-list-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1.5rem;
          border-bottom: 1px solid rgba(212, 165, 116, 0.2);
        }

        .session-list-header h2 {
          margin: 0;
          font-size: 1.25rem;
          color: #fafaf6;
        }

        .session-list-close {
          background: transparent;
          color: #fafaf6;
          border: 1px solid rgba(212, 165, 116, 0.3);
          padding: 0.5rem 1rem;
          border-radius: 4px;
          cursor: pointer;
          font-size: 0.875rem;
          transition: all 0.2s ease;
        }

        .session-list-close:hover {
          background: rgba(212, 165, 116, 0.15);
          border-color: rgba(212, 165, 116, 0.5);
        }

        .session-list {
          flex: 1;
          overflow-y: auto;
          padding: 0;
        }

        .session-list-empty {
          text-align: center;
          color: rgba(250, 250, 246, 0.5);
          padding: 2rem 1rem;
          margin: 0;
        }

        .session-list-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1rem 1.5rem;
          border-bottom: 1px solid rgba(212, 165, 116, 0.1);
          cursor: pointer;
          transition: background 0.2s ease;
        }

        .session-list-item:hover {
          background: rgba(212, 165, 116, 0.08);
        }

        .session-list-item.active {
          background: rgba(212, 165, 116, 0.15);
          border-left: 3px solid rgba(212, 165, 116, 0.5);
          padding-left: calc(1.5rem - 3px);
        }

        .session-info {
          flex: 1;
          min-width: 0;
        }

        .session-title {
          color: #fafaf6;
          font-weight: 500;
          margin-bottom: 0.25rem;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .session-time {
          color: rgba(250, 250, 246, 0.5);
          font-size: 0.75rem;
        }

        .session-count {
          color: rgba(250, 250, 246, 0.5);
          font-size: 0.875rem;
          margin-left: 1rem;
          white-space: nowrap;
        }
      `}</style>
    </div>
  );
}
