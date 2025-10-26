/**
 * Minimal Middleware Test
 * Testing if basic middleware works on Vercel
 */

import { NextResponse, type NextRequest } from 'next/server';
import { clerkMiddleware } from '@clerk/nextjs/server';

export default clerkMiddleware(async (auth, request: NextRequest) => {
  // Simply allow all requests for now
  return NextResponse.next();
});

export const config = {
  matcher: [
    // Match all routes except static assets
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
