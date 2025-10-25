'use client';

import { useEffect, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Register service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/service-worker.js')
        .then((registration) => {
          console.log('[PWA] Service Worker registered:', registration);
        })
        .catch((error) => {
          console.log('[PWA] Service Worker registration failed:', error);
        });
    }

    // Check if already installed
    if ('getInstalledRelatedApps' in navigator) {
      (navigator as any).getInstalledRelatedApps().then((apps: any[]) => {
        if (apps.length > 0) {
          setIsInstalled(true);
        }
      });
    }

    // Handle install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowPrompt(true);
    };

    // Handle app installed
    const handleAppInstalled = () => {
      console.log('[PWA] App installed');
      setIsInstalled(true);
      setShowPrompt(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`[PWA] User response: ${outcome}`);

    setDeferredPrompt(null);
    setShowPrompt(false);

    if (outcome === 'accepted') {
      setIsInstalled(true);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
  };

  if (!showPrompt || isInstalled) {
    return null;
  }

  return (
    <div className="pwa-prompt">
      <div className="pwa-prompt-content">
        <div className="pwa-prompt-icon">◉</div>
        <div className="pwa-prompt-info">
          <h3>Install Memora</h3>
          <p>Add Memora to your home screen for quick access and offline support.</p>
        </div>
        <div className="pwa-prompt-actions">
          <button className="pwa-install-btn" onClick={handleInstall}>
            Install
          </button>
          <button className="pwa-dismiss-btn" onClick={handleDismiss}>
            Not now
          </button>
        </div>
      </div>

      <style jsx>{`
        .pwa-prompt {
          position: fixed;
          bottom: 2rem;
          left: 2rem;
          right: 2rem;
          max-width: 400px;
          margin: 0 auto;
          z-index: 1000;
          animation: slideUp 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
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

        .pwa-prompt-content {
          background: rgba(10, 10, 10, 0.95);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(212, 165, 116, 0.3);
          border-radius: 12px;
          padding: 1.5rem;
          display: flex;
          align-items: center;
          gap: 1.5rem;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
        }

        .pwa-prompt-icon {
          font-size: 2rem;
          color: #d4a574;
          flex-shrink: 0;
        }

        .pwa-prompt-info {
          flex: 1;
          min-width: 0;
        }

        .pwa-prompt-info h3 {
          font-size: 1rem;
          font-weight: 700;
          letter-spacing: 0.03em;
          margin: 0 0 0.25rem 0;
          color: #fafaf6;
        }

        .pwa-prompt-info p {
          font-size: 0.85rem;
          opacity: 0.7;
          margin: 0;
          line-height: 1.4;
        }

        .pwa-prompt-actions {
          display: flex;
          gap: 0.75rem;
          flex-shrink: 0;
        }

        .pwa-install-btn,
        .pwa-dismiss-btn {
          padding: 0.5rem 1rem;
          border-radius: 6px;
          font-family: 'Space Grotesk', sans-serif;
          font-size: 0.8rem;
          font-weight: 600;
          letter-spacing: 0.05em;
          cursor: pointer;
          border: none;
          transition: all 0.2s ease;
          white-space: nowrap;
        }

        .pwa-install-btn {
          background: rgba(212, 165, 116, 0.3);
          border: 1px solid rgba(212, 165, 116, 0.5);
          color: #d4a574;
        }

        .pwa-install-btn:hover {
          background: rgba(212, 165, 116, 0.4);
          border-color: #d4a574;
        }

        .pwa-dismiss-btn {
          background: transparent;
          border: 1px solid rgba(100, 100, 100, 0.3);
          color: #9a9a9a;
        }

        .pwa-dismiss-btn:hover {
          background: rgba(100, 100, 100, 0.1);
          border-color: #9a9a9a;
        }

        @media (max-width: 640px) {
          .pwa-prompt {
            left: 1rem;
            right: 1rem;
            bottom: 1rem;
          }

          .pwa-prompt-content {
            flex-direction: column;
            gap: 1rem;
          }

          .pwa-prompt-actions {
            width: 100%;
            justify-content: stretch;
          }

          .pwa-install-btn,
          .pwa-dismiss-btn {
            flex: 1;
          }
        }
      `}</style>
    </div>
  );
}
