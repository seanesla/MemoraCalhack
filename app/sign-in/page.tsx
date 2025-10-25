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
              <div className="roleIcon">🧑‍🦳</div>
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
              <div className="roleIcon">👨‍⚕️</div>
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
