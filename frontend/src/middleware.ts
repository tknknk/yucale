import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Protected paths that require authentication
const PROTECTED_PATHS = ['/admin', '/user'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Check if the path requires authentication
  const isProtectedPath = PROTECTED_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`)
  );

  if (!isProtectedPath) {
    return NextResponse.next();
  }

  // Check for session cookie (SESSION from Spring Session JDBC, or JSESSIONID)
  const sessionCookie = request.cookies.get('SESSION') || request.cookies.get('JSESSIONID');

  if (!sessionCookie) {
    // Redirect to login with return URL
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Session exists - allow request to proceed
  // Note: Role-based access control is handled client-side since
  // the session cookie is httpOnly and we cannot decode it here
  return NextResponse.next();
}

export const config = {
  matcher: ['/admin', '/admin/:path*', '/user', '/user/:path*'],
};
