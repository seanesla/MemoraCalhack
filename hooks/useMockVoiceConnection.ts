import { useState, useCallback, useRef } from 'react';

export function useMockVoiceConnection() {
  const [isConnected, setIsConnected] = useState(true);
  const [isListening, setIsListening] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const audioLevelRef = useRef(0);
  const animationRef = useRef<number>();

  const startListening = useCallback(() => {
    setIsListening(true);

    // Simulate audio level oscillation with natural variation
    const simulateAudioLevel = () => {
      // Random peaks and valleys to simulate actual speech
      const baseLevel = Math.random() * 0.3;
      const peak = Math.sin(Date.now() / 500) * 0.4 + 0.3;
      const noiseLevel = Math.random() * 0.2;

      audioLevelRef.current = Math.max(0, Math.min(1, baseLevel + peak + noiseLevel));
      setAudioLevel(audioLevelRef.current);

      animationRef.current = requestAnimationFrame(simulateAudioLevel);
    };

    simulateAudioLevel();
  }, []);

  const stopListening = useCallback(() => {
    setIsListening(false);
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    setAudioLevel(0);
  }, []);

  return {
    isConnected,
    isListening,
    audioLevel,
    startListening,
    stopListening,
  };
}
