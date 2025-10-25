'use client';

import Link from 'next/link';
import '../auth.css';

export default function SignInPage() {
  return (
    <div className="authPage">
      <div className="authContainer">
        <Link href="/memora-cinematic.html" className="backLink">
          ← Back to Home
        </Link>

        <div className="authCard">
          <h1 className="authTitle">Choose Your Experience</h1>
          <p className="authSubtitle">Memora serves two users with different needs</p>

          <div className="roleSelector">
            <a href="/patient" className="roleCard">
              <div className="roleIcon">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="48" height="48">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <h3 className="roleTitle">Patient Interface</h3>
              <p className="roleDescription">
                Simple voice companion with supportive, dignified interaction
              </p>
              <ul className="roleFeatures">
                <li>No surveillance data</li>
                <li>Voice-first interaction</li>
                <li>Orientation cues</li>
              </ul>
              <div className="roleButton">Enter as Patient</div>
            </a>

            <a href="/dashboard.html" className="roleCard">
              <div className="roleIcon">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="48" height="48">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="roleTitle">Caregiver Dashboard</h3>
              <p className="roleDescription">
                Monitoring, insights, and memory management tools
              </p>
              <ul className="roleFeatures">
                <li>Analytics & insights</li>
                <li>Memory system management</li>
                <li>Alert configuration</li>
              </ul>
              <div className="roleButton">Enter as Caregiver</div>
            </a>
          </div>

          <p className="roleExplainer">
            Why two interfaces? Different users need different tools.
            Patients get supportive companionship. Caregivers get care analytics.
          </p>
        </div>
      </div>
    </div>
  );
}
