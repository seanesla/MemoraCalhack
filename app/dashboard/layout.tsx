'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Image from 'next/image';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const isActive = (path: string) => pathname === path;

  const navItems = [
    { label: 'HOME', path: '/dashboard' },
    { label: 'ACTIVITY', path: '/dashboard/timeline' },
    { label: 'INSIGHTS', path: '/dashboard/insights' },
    { label: 'MEMORY', path: '/dashboard/memory' },
    { label: 'SETTINGS', path: '/dashboard/settings' },
  ];

  return (
    <div className="editorial-dashboard">
      {/* Film Grain Overlay */}
      <div className="film-grain" />

      {/* Vignette */}
      <div className="vignette" />

      {/* Top Navigation - Editorial Style */}
      <nav className="editorial-nav">
        <Link href="/" className="logo">
          <Image
            src="/memoralogo.svg"
            alt="Memora"
            width={56}
            height={56}
            style={{ filter: 'invert(1) brightness(1.2)' }}
          />
          <span className="logo-text">MEMORA</span>
        </Link>

        <div className="nav-sections">
          {navItems.map((item) => (
            <Link
              key={item.path}
              href={item.path}
              className={`nav-link ${isActive(item.path) ? 'active' : ''}`}
            >
              {item.label}
              {isActive(item.path) && <span className="nav-indicator">—</span>}
            </Link>
          ))}
        </div>

        <div className="patient-indicator">
          <span className="patient-label">PATIENT</span>
          <span className="patient-name">John Smith</span>
        </div>
      </nav>

      {/* Main Content */}
      <main className="editorial-main">
        {children}
      </main>

      {/* Footer */}
      <footer className="editorial-footer">
        <Link href="/" className="footer-link">← RETURN TO HOME</Link>
        <div className="footer-meta">
          <span>MEMORA CARE DASHBOARD</span>
          <span className="separator">—</span>
          <span>{new Date().getFullYear()}</span>
        </div>
      </footer>

      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Inconsolata:wght@400;700;900&family=Space+Grotesk:wght@400;700;900&display=swap');

        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        body {
          background: #000000;
          color: #FFFFFF;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
          font-size: 18px;
          line-height: 1.6;
        }

        .editorial-dashboard {
          min-height: 100vh;
          background: #000000;
          color: #FFFFFF;
          position: relative;
        }

        /* Film Grain Overlay */
        .film-grain {
          content: '';
          position: fixed;
          top: -50%;
          left: -50%;
          width: 200%;
          height: 200%;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='2.5' numOctaves='6' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.15'/%3E%3C/svg%3E");
          opacity: 0.5;
          pointer-events: none;
          z-index: 9999;
          mix-blend-mode: overlay;
          animation: grain 0.3s steps(2) infinite;
        }

        @keyframes grain {
          0%, 100% { transform: translate(0, 0); }
          10% { transform: translate(-5%, -10%); }
          30% { transform: translate(3%, -15%); }
          50% { transform: translate(12%, 9%); }
          70% { transform: translate(9%, 4%); }
          90% { transform: translate(-1%, 7%); }
        }

        /* Vignette */
        .vignette {
          content: '';
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          box-shadow: inset 0 0 200px rgba(0,0,0,0.4);
          pointer-events: none;
          z-index: 9998;
        }

        /* Editorial Navigation */
        .editorial-nav {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          padding: 1.5rem 4rem;
          z-index: 1000;
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: #000000;
          border-bottom: 2px solid #FFFFFF;
        }

        .logo {
          display: flex;
          align-items: center;
          gap: 1rem;
          text-decoration: none;
        }

        .logo-text {
          font-family: 'Space Grotesk', sans-serif;
          font-size: 1.5rem;
          font-weight: 700;
          letter-spacing: 0.05em;
          color: #FFFFFF;
        }

        .nav-sections {
          display: flex;
          gap: 2rem;
          align-items: center;
        }

        .nav-link {
          font-family: 'Inter', sans-serif;
          font-size: 0.9rem;
          font-weight: 600;
          letter-spacing: 0.05em;
          color: #FFFFFF;
          text-decoration: none;
          opacity: 0.6;
          transition: all 0.2s ease;
          position: relative;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem 1rem;
          border-radius: 4px;
        }

        .nav-link:hover {
          opacity: 1;
          background: rgba(255, 255, 255, 0.1);
        }

        .nav-link.active {
          opacity: 1;
          background: #FFB74D;
          color: #000000;
        }

        .nav-indicator {
          display: none;
        }

        .patient-indicator {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 0.75rem 1.5rem;
          background: #FFFFFF;
          color: #000000;
          border-radius: 8px;
        }

        .patient-label {
          font-family: 'Inter', sans-serif;
          font-size: 0.75rem;
          font-weight: 500;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          opacity: 0.6;
        }

        .patient-name {
          font-family: 'Inter', sans-serif;
          font-size: 1rem;
          font-weight: 700;
        }

        /* Main Content */
        .editorial-main {
          padding-top: 100px;
          min-height: calc(100vh - 100px);
          position: relative;
          z-index: 1;
        }

        /* Footer */
        .editorial-footer {
          padding: 2rem 4rem;
          border-top: 2px solid #FFFFFF;
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: #000000;
        }

        .footer-link {
          font-family: 'Inter', sans-serif;
          font-size: 0.9rem;
          font-weight: 600;
          color: #FFFFFF;
          text-decoration: none;
          transition: all 0.2s ease;
          opacity: 0.6;
        }

        .footer-link:hover {
          opacity: 1;
        }

        .footer-meta {
          font-family: 'Inter', sans-serif;
          font-size: 0.85rem;
          opacity: 0.6;
          display: flex;
          gap: 1rem;
          align-items: center;
        }

        .separator {
          opacity: 0.5;
        }

        /* Responsive */
        @media (max-width: 1024px) {
          .editorial-nav {
            padding: 1.5rem 2rem;
          }

          .nav-sections {
            gap: 2rem;
          }

          .patient-indicator {
            display: none;
          }
        }

        @media (max-width: 768px) {
          .editorial-nav {
            flex-wrap: wrap;
            gap: 1rem;
            padding: 1rem;
          }

          .logo-text {
            font-size: 1rem;
          }

          .nav-sections {
            width: 100%;
            justify-content: space-between;
            gap: 1rem;
          }

          .nav-link {
            font-size: 0.65rem;
          }

          .editorial-main {
            padding-top: 140px;
          }

          .editorial-footer {
            flex-direction: column;
            gap: 1rem;
            text-align: center;
          }
        }
      `}</style>
    </div>
  );
}
