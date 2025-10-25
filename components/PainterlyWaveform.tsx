'use client';

import { useEffect, useRef } from 'react';

interface PainterlyWaveformProps {
  audioLevel: number;
  isActive: boolean;
}

export default function PainterlyWaveform({ audioLevel, isActive }: PainterlyWaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const particles = useRef<Particle[]>([]);

  interface Particle {
    x: number;
    y: number;
    radius: number;
    vx: number;
    vy: number;
    opacity: number;
    life: number;
    maxLife: number;
    hue: number;
  }

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Initialize particles
    const initParticles = () => {
      particles.current = [];
      for (let i = 0; i < 50; i++) {
        particles.current.push(createParticle());
      }
    };

    const createParticle = (): Particle => {
      const angle = Math.random() * Math.PI * 2;
      const distance = Math.random() * 100 + 50;
      return {
        x: canvas.width / 2 + Math.cos(angle) * distance,
        y: canvas.height / 2 + Math.sin(angle) * distance,
        radius: Math.random() * 3 + 1,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
        opacity: Math.random() * 0.5 + 0.3,
        life: 0,
        maxLife: Math.random() * 200 + 100,
        hue: 35 + Math.random() * 20, // Golden amber hue range
      };
    };

    initParticles();

    // Animation loop
    const animate = () => {
      if (!isActive) {
        animationRef.current = requestAnimationFrame(animate);
        return;
      }

      // Fade out previous frame for trail effect
      ctx.fillStyle = 'rgba(10, 10, 10, 0.1)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Update and draw particles
      particles.current.forEach((particle, index) => {
        // Update position
        particle.x += particle.vx;
        particle.y += particle.vy;
        particle.life++;

        // Respawn particles that have exceeded their life
        if (particle.life > particle.maxLife) {
          particles.current[index] = createParticle();
          return;
        }

        // Calculate opacity based on life and audio level
        const lifeFactor = 1 - (particle.life / particle.maxLife);
        const audioFactor = 0.5 + (audioLevel * 0.5);
        particle.opacity = lifeFactor * audioFactor * 0.6;

        // Draw particle as a soft brush stroke
        const gradient = ctx.createRadialGradient(
          particle.x, particle.y, 0,
          particle.x, particle.y, particle.radius * (1 + audioLevel * 2)
        );

        gradient.addColorStop(0, `hsla(${particle.hue}, 60%, 60%, ${particle.opacity})`);
        gradient.addColorStop(0.5, `hsla(${particle.hue}, 55%, 55%, ${particle.opacity * 0.5})`);
        gradient.addColorStop(1, `hsla(${particle.hue}, 50%, 50%, 0)`);

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.radius * (1 + audioLevel * 2), 0, Math.PI * 2);
        ctx.fill();

        // Add occasional larger strokes for more painterly effect
        if (Math.random() > 0.95 && audioLevel > 0.3) {
          ctx.globalAlpha = particle.opacity * 0.3;
          ctx.fillStyle = `hsl(${particle.hue}, 50%, 50%)`;
          ctx.beginPath();
          ctx.ellipse(
            particle.x,
            particle.y,
            particle.radius * 4,
            particle.radius * 2,
            Math.random() * Math.PI * 2,
            0,
            Math.PI * 2
          );
          ctx.fill();
          ctx.globalAlpha = 1;
        }
      });

      // Draw central glow that responds to audio
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      const glowRadius = 100 + (audioLevel * 100);

      const centerGlow = ctx.createRadialGradient(
        centerX, centerY, 0,
        centerX, centerY, glowRadius
      );

      centerGlow.addColorStop(0, `rgba(212, 165, 116, ${audioLevel * 0.2})`);
      centerGlow.addColorStop(0.5, `rgba(212, 165, 116, ${audioLevel * 0.1})`);
      centerGlow.addColorStop(1, 'rgba(212, 165, 116, 0)');

      ctx.fillStyle = centerGlow;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [audioLevel, isActive]);

  return (
    <canvas
      ref={canvasRef}
      className="painterly-waveform"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 1,
        opacity: isActive ? 1 : 0,
        transition: 'opacity 0.5s ease',
      }}
    />
  );
}
