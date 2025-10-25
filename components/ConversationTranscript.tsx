'use client';

import { useEffect, useState } from 'react';

interface ConversationTranscriptProps {
  userText: string;
  assistantText: string;
  state: 'idle' | 'listening' | 'thinking' | 'speaking' | 'error';
}

export default function ConversationTranscript({
  userText,
  assistantText,
  state
}: ConversationTranscriptProps) {
  const [displayedUserText, setDisplayedUserText] = useState('');
  const [displayedAssistantText, setDisplayedAssistantText] = useState('');

  // Typewriter effect for user text
  useEffect(() => {
    if (!userText) {
      setDisplayedUserText('');
      return;
    }

    let index = 0;
    const interval = setInterval(() => {
      if (index <= userText.length) {
        setDisplayedUserText(userText.slice(0, index));
        index++;
      } else {
        clearInterval(interval);
      }
    }, 30);

    return () => clearInterval(interval);
  }, [userText]);

  // Typewriter effect for assistant text
  useEffect(() => {
    if (!assistantText) {
      setDisplayedAssistantText('');
      return;
    }

    let index = 0;
    const interval = setInterval(() => {
      if (index <= assistantText.length) {
        setDisplayedAssistantText(assistantText.slice(0, index));
        index++;
      } else {
        clearInterval(interval);
      }
    }, 40);

    return () => clearInterval(interval);
  }, [assistantText]);

  const shouldShow = (state === 'listening' || state === 'thinking' || state === 'speaking') && (displayedUserText || displayedAssistantText || userText || assistantText);

  return (
    <div className={`conversation-transcript ${shouldShow ? 'visible' : ''}`}>
      {displayedUserText && (
        <div className="transcript-message user-message">
          <div className="message-label">You</div>
          <p className="message-text">{displayedUserText}</p>
        </div>
      )}

      {displayedAssistantText && (
        <div className="transcript-message assistant-message">
          <div className="message-label">Memora</div>
          <p className="message-text">{displayedAssistantText}</p>
        </div>
      )}

      <style jsx>{`
        .conversation-transcript {
          position: fixed;
          bottom: 8rem;
          left: 50%;
          transform: translateX(-50%);
          width: 90%;
          max-width: 600px;
          display: flex;
          flex-direction: column;
          gap: 2rem;
          opacity: 0;
          transition: opacity 0.5s ease;
          z-index: 20;
          pointer-events: none;
        }

        .conversation-transcript.visible {
          opacity: 1;
        }

        .transcript-message {
          background: rgba(10, 10, 10, 0.8);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(212, 165, 116, 0.2);
          border-radius: 16px;
          padding: 1.5rem 2rem;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
          animation: slideUp 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }

        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .message-label {
          font-family: 'Space Grotesk', sans-serif;
          font-size: 0.75rem;
          font-weight: 600;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          margin-bottom: 0.75rem;
          opacity: 0.6;
        }

        .user-message .message-label {
          color: #fafaf6;
        }

        .assistant-message .message-label {
          color: #d4a574;
        }

        .message-text {
          font-family: 'Space Grotesk', sans-serif;
          font-size: 1.125rem;
          line-height: 1.6;
          color: #fafaf6;
          margin: 0;
          text-shadow: 0 2px 10px rgba(0, 0, 0, 0.5);
        }

        .user-message {
          align-self: flex-start;
          border-left: 3px solid rgba(250, 250, 246, 0.3);
        }

        .assistant-message {
          align-self: flex-end;
          border-left: 3px solid rgba(212, 165, 116, 0.5);
        }

        /* Responsive */
        @media (max-width: 768px) {
          .conversation-transcript {
            width: 95%;
            bottom: 6rem;
            gap: 1.5rem;
          }

          .transcript-message {
            padding: 1.25rem 1.5rem;
          }

          .message-text {
            font-size: 1rem;
          }
        }
      `}</style>
    </div>
  );
}
