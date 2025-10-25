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
import { prisma } from '@/lib/prisma';

// Public routes that don't require authentication
const isPublicRoute = createRouteMatcher([
  '/',
  '/sign-in',
  '/sign-up',
  '/memora-cinematic.html',
  '/dashboard.html',
  '/favicon.ico',
  '/manifest.json',
  '/service-worker.js',
  '/_next(.*)',
  '/public(.*)',
]);

// Routes that require authentication + onboarding
const isProtectedRoute = createRouteMatcher([
  '/patient(.*)',
  '/caregiver(.*)',
  '/onboarding(.*)',
  '/api/onboard',
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

  // User is authenticated. Check onboarding status.
  // Query database to see if user has Patient or Caregiver record
  let userRole: 'patient' | 'caregiver' | null = null;

  try {
    // Check if user is a patient
    const patient = await prisma.patient.findUnique({
      where: { clerkId: userId },
      select: { id: true, clerkId: true },
    });

    if (patient) {
      userRole = 'patient';
    } else {
      // Check if user is a caregiver
      const caregiver = await prisma.caregiver.findUnique({
        where: { clerkId: userId },
        select: { id: true, clerkId: true },
      });

      if (caregiver) {
        userRole = 'caregiver';
      }
    }
  } catch (error) {
    // Database error - log and allow access to /onboarding
    // (user will see onboarding page and can retry)
    console.error('Middleware: Database error checking onboarding status:', error);
  }

  // Handle /onboarding and /api/onboard routes
  if (pathname.startsWith('/onboarding') || pathname === '/api/onboard') {
    // If already onboarded, redirect to role-appropriate page
    if (userRole === 'patient') {
      return NextResponse.redirect(new URL('/patient', request.url));
    }
    if (userRole === 'caregiver') {
      return NextResponse.redirect(new URL('/caregiver', request.url));
    }
    // Not onboarded - allow access to onboarding
    return;
  }

  // Not onboarded - redirect to /onboarding
  if (!userRole) {
    const onboardingUrl = new URL('/onboarding', request.url);
    onboardingUrl.searchParams.set('from', pathname);
    return NextResponse.redirect(onboardingUrl);
  }

  // Onboarded - check role-based access
  if (pathname.startsWith('/patient') && userRole !== 'patient') {
    // Non-patient trying to access /patient
    const redirectUrl = userRole === 'caregiver' ? '/caregiver' : '/onboarding';
    return NextResponse.redirect(new URL(redirectUrl, request.url));
  }

  if (pathname.startsWith('/caregiver') && userRole !== 'caregiver') {
    // Non-caregiver trying to access /caregiver
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
