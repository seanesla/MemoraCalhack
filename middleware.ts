/**
 * Ultra-minimal middleware test
 * NO CLERK - testing raw Next.js middleware
 */

import { NextResponse, type NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
