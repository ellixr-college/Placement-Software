import { UserRole } from '@ellixr/shared';

/** Metadata keys used by the API guards (kept here so FE/BE share one source). */
export const ROLES_KEY = 'ellixr:roles';
export const IS_PUBLIC_KEY = 'ellixr:isPublic';

/** Token lifetimes (seconds). */
export const ACCESS_TOKEN_TTL = 15 * 60; // 15 min
export const REFRESH_TOKEN_TTL = 30 * 24 * 60 * 60; // 30 days
export const PASSWORD_RESET_TTL = 60 * 60; // 1 hour

export const REFRESH_COOKIE_NAME = 'ellixr_rt';

/** Re-export role constants for convenience. */
export { UserRole, ADMIN_ROLES, isAdminRole, isStudentRole } from '@ellixr/shared';

/** Default landing path per role (used by web middleware + login redirect). */
export function homePathForRole(role: UserRole): string {
  switch (role) {
    case UserRole.PLATFORM_ADMIN:
      return '/platform/colleges';
    case UserRole.COLLEGE_ADMIN:
    case UserRole.PLACEMENT_OFFICER:
      return '/dashboard';
    case UserRole.STUDENT:
      return '/me';
    default:
      return '/login';
  }
}
