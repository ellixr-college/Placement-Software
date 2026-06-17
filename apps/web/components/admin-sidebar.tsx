'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@ellixr/ui';
import { UserRole } from '@ellixr/shared';
import { useSession } from '../lib/session';

interface NavItem {
  href: string;
  label: string;
}

// Platform Admin only provisions tenants — create a college + its super-admin.
// All student/company/job/alumni data lives inside each college, managed by
// that college's own admins/officers (never the platform).
const PLATFORM_NAV: NavItem[] = [
  { href: '/platform/dashboard', label: 'Dashboard' },
  { href: '/platform/colleges', label: 'Colleges' },
  { href: '/platform/jobs', label: 'Jobs' },
];

// College Admin + Placement Officer share the operational shell.
const COLLEGE_NAV: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/students', label: 'Students' },
  { href: '/companies', label: 'Companies' },
  { href: '/jobs', label: 'Jobs' },
  { href: '/alumni', label: 'Alumni' },
  { href: '/internships', label: 'Internships' },
  { href: '/training', label: 'Training' },
  { href: '/analytics', label: 'Analytics' },
  { href: '/reports', label: 'Reports' },
];

// Team (user management) is College Admin only.
const TEAM_NAV: NavItem = { href: '/settings/team', label: 'Team' };

function navFor(role: UserRole | undefined): NavItem[] {
  if (role === UserRole.PLATFORM_ADMIN) return PLATFORM_NAV;
  if (role === UserRole.COLLEGE_ADMIN) return [...COLLEGE_NAV, TEAM_NAV];
  if (role === UserRole.PLACEMENT_OFFICER) return COLLEGE_NAV;
  return []; // unknown / still bootstrapping — render no role-specific links
}

export function AdminSidebar() {
  const pathname = usePathname();
  const { user, loading } = useSession();
  // Until the session resolves we don't know the role. Falling back to a default
  // nav here flashes the wrong menu on every reload (e.g. a Platform Admin
  // briefly sees college links). Show neutral placeholders until role is known.
  const ready = !loading && !!user;
  const nav = ready ? navFor(user.role) : [];
  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r border-border bg-white px-4 py-6 md:flex">
      <div className="px-3 pb-8">
        <span className="bg-gradient-primary bg-clip-text text-2xl font-bold text-transparent">
          Ellixr
        </span>
      </div>
      <nav className="flex flex-col gap-1">
        {!ready &&
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="mx-1 my-1 h-7 animate-pulse rounded-md bg-primary-50" />
          ))}
        {nav.map(({ href, label }) => {
          const active = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'rounded-md px-3 py-2.5 text-sm font-medium text-body transition hover:bg-primary-50',
                active && 'bg-primary-50 text-primary-700',
              )}
            >
              {label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
