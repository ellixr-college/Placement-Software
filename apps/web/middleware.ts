import { NextRequest, NextResponse } from 'next/server';
import { UserRole, isAdminRole } from '@ellixr/shared';

/**
 * Deny-by-default route protection.
 *
 * Only the public allowlist is reachable unauthenticated; everything else
 * requires a session. Role decides which shell the user is routed to:
 *   STUDENT        → mobile shell  (/me, /jobs, ...)
 *   admin roles    → desktop shell (/dashboard, /platform/*, /settings/*)
 *
 * NOTE (scaffold): the readable `ellixr_role` cookie is used only for routing.
 * Real authorization is enforced server-side by the API (verified JWT). A
 * production hardening step is to move auth behind a same-origin BFF proxy.
 */
const PUBLIC_PATHS = ['/login', '/forgot-password', '/reset-password', '/alumni-register'];

function isPublic(pathname: string): boolean {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

// Student routes all live under /me (incl. /me/notifications). Everything else
// is the desktop admin/officer shell.
const STUDENT_PREFIXES = ['/me'];
const ADMIN_PREFIXES = [
  '/dashboard',
  '/platform',
  '/students',
  '/companies',
  '/jobs',
  '/applications',
  '/settings',
  '/analytics',
  '/reports',
  '/alumni',
  '/notifications',
];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/r/') || // public, no-auth resume pages (capability link)
    pathname.includes('.') // static assets, manifest, icons
  ) {
    return NextResponse.next();
  }

  const role = req.cookies.get('ellixr_role')?.value as UserRole | undefined;

  if (isPublic(pathname)) {
    // Already signed in → bounce to the role's home.
    if (role) return NextResponse.redirect(new URL(homeFor(role), req.url));
    return NextResponse.next();
  }

  if (!role) {
    const url = new URL('/login', req.url);
    url.searchParams.set('next', pathname);
    return NextResponse.redirect(url);
  }

  // Wrong shell for this role → redirect to its home.
  const wantsStudent = STUDENT_PREFIXES.some((p) => pathname.startsWith(p));
  const wantsAdmin = ADMIN_PREFIXES.some((p) => pathname.startsWith(p));
  if (wantsStudent && isAdminRole(role))
    return NextResponse.redirect(new URL(homeFor(role), req.url));
  if (wantsAdmin && role === UserRole.STUDENT)
    return NextResponse.redirect(new URL(homeFor(role), req.url));
  if (pathname.startsWith('/platform') && role !== UserRole.PLATFORM_ADMIN) {
    return NextResponse.redirect(new URL(homeFor(role), req.url));
  }

  return NextResponse.next();
}

function homeFor(role: UserRole): string {
  if (role === UserRole.STUDENT) return '/me';
  if (role === UserRole.PLATFORM_ADMIN) return '/platform/dashboard';
  return '/dashboard';
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
