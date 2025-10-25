'use client';

/**
 * Onboarding Page - Beautiful cinematic design matching landing page
 *
 * Step 1: Role selection with styled cards
 * Step 2: Role-specific form
 */

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import '../auth.css';

type Role = 'patient' | 'caregiver' | null;

interface FormData {
  name: string;
  age: string;
  diagnosisStage: string;
  locationLabel: string;
  preferredName: string;
  email: string;
}

export default function OnboardingPage() {
  const router = useRouter();
  const [role, setRole] = useState<Role>(null);
  const [formData, setFormData] = useState<FormData>({
    name: '',
    age: '',
    diagnosisStage: '',
    locationLabel: '',
    preferredName: '',
    email: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Client-side validation
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.name.trim()) {
      errors.name = 'Name is required';
    }

    if (role === 'patient') {
      if (!formData.age || formData.age.trim() === '') {
        errors.age = 'Age is required';
      } else {
        const ageNum = parseInt(formData.age, 10);
        if (isNaN(ageNum) || ageNum <= 0) {
          errors.age = 'Age must be a positive number';
        }
      }
    }

    if (role === 'caregiver') {
      if (formData.email && formData.email.trim() !== '') {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(formData.email)) {
          errors.email = 'Invalid email address';
        }
      }
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Submit handler
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setFieldErrors({});

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const payload: any = {
        role,
        name: formData.name.trim(),
      };

      if (role === 'patient') {
        payload.age = parseInt(formData.age, 10);
        if (formData.diagnosisStage) payload.diagnosisStage = formData.diagnosisStage;
        if (formData.locationLabel) payload.locationLabel = formData.locationLabel;
        if (formData.preferredName) payload.preferredName = formData.preferredName;
      } else if (role === 'caregiver') {
        if (formData.email) payload.email = formData.email;
      }

      const response = await fetch('/api/onboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 409) {
          setError('You have already completed onboarding. Redirecting...');
          setTimeout(() => {
            router.push(role === 'patient' ? '/patient' : '/dashboard.html');
          }, 2000);
          return;
        }

        if (response.status === 400) {
          setError(data.error || 'Validation failed. Please check your inputs.');
          return;
        }

        if (response.status === 401) {
          setError('You must be logged in to complete onboarding.');
          return;
        }

        setError(data.error || 'An error occurred. Please try again.');
        return;
      }

      if (data.warning) {
        console.warn('Onboarding warning:', data.warning);
      }

      router.push(role === 'patient' ? '/patient' : '/dashboard.html');
    } catch (err) {
      console.error('Onboarding error:', err);
      setError('Network error. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  // Demo account handler - creates fully functional account with demo data
  const handleDemoAccount = async (demoRole: 'patient' | 'caregiver') => {
    setLoading(true);
    setError(null);

    try {
      // Prepare demo payload with realistic data
      const payload: any = {
        role: demoRole,
        name: demoRole === 'patient' ? 'Demo Patient' : 'Demo Caregiver',
      };

      if (demoRole === 'patient') {
        payload.age = 70;
        payload.diagnosisStage = 'Early-stage dementia';
        payload.locationLabel = 'Home, San Francisco';
        payload.preferredName = 'Demo';
      } else {
        payload.email = 'demo@memora.care';
      }

      // Create real account via API
      const response = await fetch('/api/onboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 409) {
          // Already onboarded, redirect anyway
          router.push(demoRole === 'patient' ? '/patient' : '/caregiver');
          return;
        }

        setError(data.error || 'Failed to create demo account. Please try again.');
        return;
      }

      if (data.warning) {
        console.warn('Demo account warning:', data.warning);
      }

      // Success - redirect to app
      router.push(demoRole === 'patient' ? '/patient' : '/caregiver');
    } catch (err) {
      console.error('Demo account error:', err);
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Role selection screen (Step 1)
  if (!role) {
    return (
      <div className="authPage">
        <div className="authContainer">
          <Link href="/memora-cinematic.html" className="backLink">
            ← Back to Home
          </Link>

          <div className="authCard">
            <h1 className="authTitle">Welcome to Memora</h1>
            <p className="authSubtitle">Let's get started. Please select your role.</p>

            <div className="roleSelector">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: '100%' }}>
                <button
                  onClick={() => setRole('patient')}
                  className="roleCard"
                  style={{ all: 'unset', cursor: 'pointer', width: '100%' }}
                  disabled={loading}
                >
                  <div className="roleIcon">
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="48" height="48">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <h3 className="roleTitle">Patient Interface</h3>
                  <p className="roleDescription">
                    Simple voice companion with supportive interaction
                  </p>
                  <ul className="roleFeatures">
                    <li>Privacy controls dashboard</li>
                    <li>Voice-first interaction</li>
                    <li>Orientation cues</li>
                  </ul>
                  <div className="roleButton">Select Patient</div>
                </button>
                <button
                  onClick={() => handleDemoAccount('patient')}
                  disabled={loading}
                  style={{
                    fontFamily: 'Inconsolata, monospace',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                    padding: '0.875rem 1.5rem',
                    background: 'transparent',
                    color: '#d4a574',
                    border: '1px solid rgba(212, 165, 116, 0.3)',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    width: '100%',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = '#d4a574';
                    e.currentTarget.style.background = 'rgba(212, 165, 116, 0.05)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(212, 165, 116, 0.3)';
                    e.currentTarget.style.background = 'transparent';
                  }}
                >
                  {loading ? 'Creating demo account...' : '→ Try Demo as Patient'}
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: '100%' }}>
                <button
                  onClick={() => setRole('caregiver')}
                  className="roleCard"
                  style={{ all: 'unset', cursor: 'pointer', width: '100%' }}
                  disabled={loading}
                >
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
                  <div className="roleButton">Select Caregiver</div>
                </button>
                <button
                  onClick={() => handleDemoAccount('caregiver')}
                  disabled={loading}
                  style={{
                    fontFamily: 'Inconsolata, monospace',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                    padding: '0.875rem 1.5rem',
                    background: 'transparent',
                    color: '#d4a574',
                    border: '1px solid rgba(212, 165, 116, 0.3)',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    width: '100%',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = '#d4a574';
                    e.currentTarget.style.background = 'rgba(212, 165, 116, 0.05)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(212, 165, 116, 0.3)';
                    e.currentTarget.style.background = 'transparent';
                  }}
                >
                  {loading ? 'Creating demo account...' : '→ Try Demo as Caregiver'}
                </button>
              </div>
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

  // Form screen (Step 2)
  return (
    <div className="authPage">
      <div className="authContainer">
        <button
          onClick={() => {
            setRole(null);
            setError(null);
            setFieldErrors({});
          }}
          className="backLink"
          disabled={loading}
          style={{ all: 'unset', cursor: 'pointer', display: 'inline-block', marginBottom: '2rem' }}
        >
          ← Back to role selection
        </button>

        <div className="authCard">
          <h1 className="authTitle">
            {role === 'patient' ? 'Patient' : 'Caregiver'} Information
          </h1>
          <p className="authSubtitle">
            Please provide the following information to complete your account setup.
          </p>

          {error && (
            <div style={{
              padding: '1rem',
              marginBottom: '2rem',
              background: 'rgba(255, 152, 0, 0.1)',
              border: '2px solid #FF9800',
              color: '#FF9800',
              fontFamily: 'Literata, Georgia, serif',
            }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="authForm">
            {/* Name field */}
            <div className="formField">
              <label htmlFor="name">FULL NAME *</label>
              <input
                type="text"
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                disabled={loading}
                placeholder="John Smith"
              />
              {fieldErrors.name && (
                <span style={{ color: '#FF9800', fontSize: '0.875rem', fontFamily: 'Literata' }}>
                  {fieldErrors.name}
                </span>
              )}
            </div>

            {/* Patient-specific fields */}
            {role === 'patient' && (
              <>
                <div className="formField">
                  <label htmlFor="age">AGE *</label>
                  <input
                    type="number"
                    id="age"
                    value={formData.age}
                    onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                    disabled={loading}
                    min="1"
                    placeholder="72"
                  />
                  {fieldErrors.age && (
                    <span style={{ color: '#FF9800', fontSize: '0.875rem', fontFamily: 'Literata' }}>
                      {fieldErrors.age}
                    </span>
                  )}
                </div>

                <div className="formField">
                  <label htmlFor="diagnosisStage">DIAGNOSIS STAGE (OPTIONAL)</label>
                  <input
                    type="text"
                    id="diagnosisStage"
                    value={formData.diagnosisStage}
                    onChange={(e) => setFormData({ ...formData, diagnosisStage: e.target.value })}
                    disabled={loading}
                    placeholder="e.g., Early-stage Alzheimer's"
                  />
                </div>

                <div className="formField">
                  <label htmlFor="locationLabel">LOCATION LABEL (OPTIONAL)</label>
                  <input
                    type="text"
                    id="locationLabel"
                    value={formData.locationLabel}
                    onChange={(e) => setFormData({ ...formData, locationLabel: e.target.value })}
                    disabled={loading}
                    placeholder="e.g., Home, San Francisco"
                  />
                </div>

                <div className="formField">
                  <label htmlFor="preferredName">PREFERRED NAME (OPTIONAL)</label>
                  <input
                    type="text"
                    id="preferredName"
                    value={formData.preferredName}
                    onChange={(e) => setFormData({ ...formData, preferredName: e.target.value })}
                    disabled={loading}
                    placeholder="How would you like to be called?"
                  />
                </div>
              </>
            )}

            {/* Caregiver-specific fields */}
            {role === 'caregiver' && (
              <div className="formField">
                <label htmlFor="email">EMAIL (OPTIONAL)</label>
                <input
                  type="email"
                  id="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  disabled={loading}
                  placeholder="your.email@example.com"
                />
                {fieldErrors.email && (
                  <span style={{ color: '#FF9800', fontSize: '0.875rem', fontFamily: 'Literata' }}>
                    {fieldErrors.email}
                  </span>
                )}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="authButton"
            >
              {loading ? 'Creating your account...' : 'Complete Setup'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
