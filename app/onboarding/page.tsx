'use client';

/**
 * Onboarding Page
 *
 * Collects user role (Patient or Caregiver) and creates database record
 *
 * Flow:
 * 1. User authenticates with Clerk (middleware requirement)
 * 2. User selects role (Patient or Caregiver)
 * 3. User fills role-specific form fields
 * 4. Submit to POST /api/onboard
 * 5. Redirect to /patient or /caregiver on success
 */

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';

type Role = 'patient' | 'caregiver' | null;

interface FormData {
  // Common
  name: string;
  // Patient-specific
  age: string; // String for input, convert to number on submit
  diagnosisStage: string;
  locationLabel: string;
  preferredName: string;
  // Caregiver-specific
  email: string;
}

interface FieldError {
  field: string;
  message: string;
}

export default function OnboardingPage() {
  const router = useRouter();

  // State
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

    // Common validation
    if (!formData.name.trim()) {
      errors.name = 'Name is required';
    }

    // Role-specific validation
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
      // Email is optional, but if provided must be valid
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

    // Client-side validation
    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      // Prepare payload based on role
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

      // Submit to API
      const response = await fetch('/api/onboard', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        // Handle error responses
        if (response.status === 409) {
          // Already onboarded
          setError('You have already completed onboarding. Redirecting...');
          setTimeout(() => {
            router.push(role === 'patient' ? '/patient' : '/caregiver');
          }, 2000);
          return;
        }

        if (response.status === 400) {
          // Validation error
          setError(data.error || 'Validation failed. Please check your inputs.');
          return;
        }

        if (response.status === 401) {
          // Unauthorized - should not happen due to middleware
          setError('You must be logged in to complete onboarding.');
          return;
        }

        // Generic error
        setError(data.error || 'An error occurred. Please try again.');
        return;
      }

      // Success
      if (data.warning) {
        // Letta agent creation failed, but user was created
        console.warn('Onboarding warning:', data.warning);
      }

      // Redirect to role-appropriate page
      router.push(role === 'patient' ? '/patient' : '/caregiver');
    } catch (err) {
      console.error('Onboarding error:', err);
      setError('Network error. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  // Role selection screen
  if (!role) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a] text-white px-4">
        <div className="max-w-md w-full">
          <h1 className="text-4xl font-bold mb-2 text-center">Welcome to Memora</h1>
          <p className="text-gray-400 mb-12 text-center text-lg">
            Let's get started. Please select your role.
          </p>

          <div className="space-y-4">
            <button
              onClick={() => setRole('patient')}
              className="w-full py-6 px-8 bg-white text-black rounded-lg font-semibold text-xl hover:bg-gray-200 transition-colors focus:outline-none focus:ring-4 focus:ring-white focus:ring-opacity-50"
              style={{ minHeight: '72px' }}
            >
              I'm a Patient
            </button>

            <button
              onClick={() => setRole('caregiver')}
              className="w-full py-6 px-8 bg-transparent border-2 border-white text-white rounded-lg font-semibold text-xl hover:bg-white hover:bg-opacity-10 transition-colors focus:outline-none focus:ring-4 focus:ring-white focus:ring-opacity-50"
              style={{ minHeight: '72px' }}
            >
              I'm a Caregiver
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Form screen (patient or caregiver)
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a] text-white px-4 py-8">
      <div className="max-w-md w-full">
        <div className="mb-8">
          <button
            onClick={() => {
              setRole(null);
              setError(null);
              setFieldErrors({});
            }}
            className="text-gray-400 hover:text-white transition-colors mb-4 focus:outline-none focus:underline"
            disabled={loading}
          >
            ← Back to role selection
          </button>
          <h1 className="text-3xl font-bold mb-2">
            {role === 'patient' ? 'Patient' : 'Caregiver'} Information
          </h1>
          <p className="text-gray-400">
            Please provide the following information to complete your account setup.
          </p>
        </div>

        {/* Error message */}
        {error && (
          <div
            role="alert"
            className="mb-6 p-4 bg-[#FF9800] bg-opacity-10 border border-[#FF9800] rounded-lg text-[#FF9800]"
          >
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Name (common field) */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium mb-2">
              Full Name <span className="text-[#FF9800]">*</span>
            </label>
            <input
              type="text"
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-3 bg-[#1a1a1a] border border-[#333] rounded-lg text-white focus:outline-none focus:border-white transition-colors"
              style={{ minHeight: '52px' }}
              disabled={loading}
              aria-describedby={fieldErrors.name ? 'name-error' : undefined}
              aria-invalid={!!fieldErrors.name}
            />
            {fieldErrors.name && (
              <p id="name-error" className="mt-2 text-sm text-[#FF9800]">
                {fieldErrors.name}
              </p>
            )}
          </div>

          {/* Patient-specific fields */}
          {role === 'patient' && (
            <>
              <div>
                <label htmlFor="age" className="block text-sm font-medium mb-2">
                  Age <span className="text-[#FF9800]">*</span>
                </label>
                <input
                  type="number"
                  id="age"
                  value={formData.age}
                  onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                  className="w-full px-4 py-3 bg-[#1a1a1a] border border-[#333] rounded-lg text-white focus:outline-none focus:border-white transition-colors"
                  style={{ minHeight: '52px' }}
                  disabled={loading}
                  min="1"
                  aria-describedby={fieldErrors.age ? 'age-error' : undefined}
                  aria-invalid={!!fieldErrors.age}
                />
                {fieldErrors.age && (
                  <p id="age-error" className="mt-2 text-sm text-[#FF9800]">
                    {fieldErrors.age}
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="diagnosisStage" className="block text-sm font-medium mb-2">
                  Diagnosis Stage (Optional)
                </label>
                <input
                  type="text"
                  id="diagnosisStage"
                  value={formData.diagnosisStage}
                  onChange={(e) => setFormData({ ...formData, diagnosisStage: e.target.value })}
                  placeholder="e.g., Early-stage Alzheimer's"
                  className="w-full px-4 py-3 bg-[#1a1a1a] border border-[#333] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-white transition-colors"
                  style={{ minHeight: '52px' }}
                  disabled={loading}
                />
              </div>

              <div>
                <label htmlFor="locationLabel" className="block text-sm font-medium mb-2">
                  Location Label (Optional)
                </label>
                <input
                  type="text"
                  id="locationLabel"
                  value={formData.locationLabel}
                  onChange={(e) => setFormData({ ...formData, locationLabel: e.target.value })}
                  placeholder="e.g., Home, San Francisco"
                  className="w-full px-4 py-3 bg-[#1a1a1a] border border-[#333] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-white transition-colors"
                  style={{ minHeight: '52px' }}
                  disabled={loading}
                />
              </div>

              <div>
                <label htmlFor="preferredName" className="block text-sm font-medium mb-2">
                  Preferred Name (Optional)
                </label>
                <input
                  type="text"
                  id="preferredName"
                  value={formData.preferredName}
                  onChange={(e) => setFormData({ ...formData, preferredName: e.target.value })}
                  placeholder="How would you like to be called?"
                  className="w-full px-4 py-3 bg-[#1a1a1a] border border-[#333] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-white transition-colors"
                  style={{ minHeight: '52px' }}
                  disabled={loading}
                />
              </div>
            </>
          )}

          {/* Caregiver-specific fields */}
          {role === 'caregiver' && (
            <div>
              <label htmlFor="email" className="block text-sm font-medium mb-2">
                Email (Optional)
              </label>
              <input
                type="email"
                id="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="your.email@example.com"
                className="w-full px-4 py-3 bg-[#1a1a1a] border border-[#333] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-white transition-colors"
                style={{ minHeight: '52px' }}
                disabled={loading}
                aria-describedby={fieldErrors.email ? 'email-error' : undefined}
                aria-invalid={!!fieldErrors.email}
              />
              {fieldErrors.email && (
                <p id="email-error" className="mt-2 text-sm text-[#FF9800]">
                  {fieldErrors.email}
                </p>
              )}
            </div>
          )}

          {/* Submit button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 px-8 bg-white text-black rounded-lg font-semibold text-lg hover:bg-gray-200 transition-colors focus:outline-none focus:ring-4 focus:ring-white focus:ring-opacity-50 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ minHeight: '60px' }}
          >
            {loading ? 'Creating your account...' : 'Complete Setup'}
          </button>
        </form>
      </div>
    </div>
  );
}
