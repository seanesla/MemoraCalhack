/**
 * Simple Auth Helper (Replaces Clerk)
 *
 * For demo/hackathon use - returns demo patient ID
 * In production, this would integrate with your actual auth system
 */

export async function auth() {
  // For demo mode, always return demo patient Clerk ID
  // This allows all API endpoints to work without Clerk
  return {
    userId: 'clerk_demo_patient_global',
  };
}

export function useAuth() {
  // For client-side components, always return demo user as signed in
  return {
    userId: 'clerk_demo_patient_global',
    isSignedIn: true,
  };
}
