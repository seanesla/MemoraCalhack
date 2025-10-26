/**
 * Next.js Middleware
 *
 * Handles routing logic based on:
 * 1. Authentication status (Clerk)
 * 2. Onboarding status (Patient/Caregiver record in database)
 * 3. User role (Patient or Caregiver)
 *
 * Flow:
 * 1. Check if user is authenticated (Clerk)
 *    - If NO: redirect unauthenticated routes to /sign-in
 * 2. Check if user has onboarded (Patient or Caregiver record exists)
 *    - If NO: redirect to /onboarding
 * 3. Check user role and route appropriately
 *    - Patient: can access /patient
 *    - Caregiver: can access /caregiver
 * 4. Prevent cross-role access (patient accessing /caregiver, etc)
 */

import { NextResponse, type NextRequest } from 'next/server';
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { supabase } from '@/lib/supabase';

// Public routes that don't require authentication
const isPublicRoute = createRouteMatcher([
  '/',
  '/onboarding',  // Onboarding is entry point - must be accessible before auth
  '/sign-in',
  '/sign-up',
  '/memora-cinematic.html',
  '/favicon.ico',
  '/manifest.json',
  '/service-worker.js',
  '/api/demo-onboard',  // Demo account creation (uses hardcoded demo Clerk IDs)
  '/_next(.*)',
  '/public(.*)',
]);

// Routes that require authentication + onboarding
const isProtectedRoute = createRouteMatcher([
  '/patient(.*)',
  '/caregiver(.*)',
  '/dashboard.html',  // Caregiver dashboard - requires authentication
  '/api/onboard',  // Onboarding submission endpoint (requires auth for database writes)
  '/api/conversation',
  '/api/patients(.*)',
  '/api/caregivers(.*)',
]);

export default clerkMiddleware(async (auth, request: NextRequest) => {
  const { userId } = await auth();
  const { pathname } = request.nextUrl;

  // Allow public routes without authentication
  if (isPublicRoute(request)) {
    return;
  }

  // Redirect unauthenticated users from protected routes to sign-in
  if (!userId) {
    // Redirect to /sign-in with callback URL
    const signInUrl = new URL('/sign-in', request.url);
    signInUrl.searchParams.set('redirect_url', pathname);
    return NextResponse.redirect(signInUrl);
  }

  // Check if this is a demo user
  const isDemoPatient = userId === 'clerk_demo_patient_global';
  const isDemoCaregiver = userId === 'clerk_demo_caregiver_global';
  const isDemo = isDemoPatient || isDemoCaregiver;

  // User is authenticated. Check onboarding status.
  // Query database to see if user has Patient or Caregiver record
  let userRole: 'patient' | 'caregiver' | null = null;

  try {
    // Check if user is a patient
    const { data: patient, error: patientError } = await supabase
      .from('patients')
      .select('id, clerkId')
      .eq('clerkId', userId)
      .single();

    if (!patientError && patient) {
      userRole = 'patient';
    } else {
      // Check if user is a caregiver
      const { data: caregiver, error: caregiverError } = await supabase
        .from('caregivers')
        .select('id, clerkId')
        .eq('clerkId', userId)
        .single();

      if (!caregiverError && caregiver) {
        userRole = 'caregiver';
      }
    }
  } catch (error) {
    // Database error - log and allow access to /onboarding
    // (user will see onboarding page and can retry)
    console.error('Middleware: Database error checking onboarding status:', error);
  }

  // Allow patient API endpoints - authentication is checked in the endpoint itself
  if (pathname.startsWith('/api/patients') || pathname.startsWith('/api/caregivers') || pathname.startsWith('/api/conversation') || pathname.startsWith('/api/audio') || pathname.startsWith('/api/livekit')) {
    return;
  }

  // Handle /onboarding route
  if (pathname.startsWith('/onboarding')) {
    // If user is authenticated and already onboarded, redirect to role-appropriate page
    if (userId && userRole === 'patient') {
      return NextResponse.redirect(new URL('/patient', request.url));
    }
    if (userId && userRole === 'caregiver') {
      return NextResponse.redirect(new URL('/dashboard.html', request.url));
    }
    // Allow access: either unauthenticated (Step 1: role selection)
    // or authenticated but not onboarded (Step 2: complete form)
    return;
  }

  // Handle /api/onboard route (requires authentication)
  if (pathname === '/api/onboard') {
    // Already checked authentication above - only allow if authenticated
    return;
  }

  // Not onboarded - allow access to /patient and /dashboard.html for demo mode
  // (pages will check localStorage for demo mode and fetch appropriate data)
  // Otherwise redirect to /onboarding
  if (!userRole && !isDemo) {
    // Allow these routes even without onboarding (demo mode via localStorage)
    if (pathname.startsWith('/patient') || pathname === '/dashboard.html') {
      return;
    }

    const onboardingUrl = new URL('/onboarding', request.url);
    onboardingUrl.searchParams.set('from', pathname);
    return NextResponse.redirect(onboardingUrl);
  }

  // Onboarded - check role-based access
  if (pathname.startsWith('/patient') && userRole !== 'patient') {
    // Non-patient trying to access /patient (unless they're the demo patient or in demo mode)
    if (isDemoPatient) {
      return;
    }
    // Allow if user just wants to view demo, will be handled by page
    if (!userRole) {
      return;
    }
    const redirectUrl = userRole === 'caregiver' ? '/dashboard.html' : '/onboarding';
    return NextResponse.redirect(new URL(redirectUrl, request.url));
  }

  if (pathname.startsWith('/caregiver') && userRole !== 'caregiver') {
    // Non-caregiver trying to access /caregiver
    if (isDemoCaregiver) {
      return;
    }
    const redirectUrl = userRole === 'patient' ? '/patient' : '/onboarding';
    return NextResponse.redirect(new URL(redirectUrl, request.url));
  }

  if (pathname === '/dashboard.html' && userRole !== 'caregiver') {
    // Non-caregiver trying to access dashboard (unless they're demo caregiver)
    if (isDemoCaregiver) {
      return;
    }
    // Allow if user is in demo mode, will be handled by page
    if (!userRole) {
      return;
    }
    const redirectUrl = userRole === 'patient' ? '/patient' : '/onboarding';
    return NextResponse.redirect(new URL(redirectUrl, request.url));
  }

  // Allow access - user is authenticated, onboarded, and accessing correct role route
});

export const config = {
  matcher: [
    // Match all routes except static assets and Next.js internals
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
