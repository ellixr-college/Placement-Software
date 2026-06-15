/**
 * Shared enums mirrored across the API (NestJS) and web (Next.js) apps.
 * These MUST stay in sync with the Prisma schema in @ellixr/database.
 */

export const UserRole = {
  PLATFORM_ADMIN: 'PLATFORM_ADMIN',
  COLLEGE_ADMIN: 'COLLEGE_ADMIN',
  PLACEMENT_OFFICER: 'PLACEMENT_OFFICER',
  STUDENT: 'STUDENT',
} as const;
export type UserRole = (typeof UserRole)[keyof typeof UserRole];

/** Roles that use the desktop web (admin) shell. Students use the mobile shell. */
export const ADMIN_ROLES: UserRole[] = [
  UserRole.PLATFORM_ADMIN,
  UserRole.COLLEGE_ADMIN,
  UserRole.PLACEMENT_OFFICER,
];

export const isAdminRole = (role: UserRole): boolean => ADMIN_ROLES.includes(role);
export const isStudentRole = (role: UserRole): boolean => role === UserRole.STUDENT;

export const SubscriptionPlan = {
  TRIAL: 'TRIAL',
  BASIC: 'BASIC',
  PRO: 'PRO',
  ENTERPRISE: 'ENTERPRISE',
} as const;
export type SubscriptionPlan = (typeof SubscriptionPlan)[keyof typeof SubscriptionPlan];

export const SubscriptionStatus = {
  TRIAL: 'TRIAL',
  ACTIVE: 'ACTIVE',
  SUSPENDED: 'SUSPENDED',
  CANCELLED: 'CANCELLED',
} as const;
export type SubscriptionStatus = (typeof SubscriptionStatus)[keyof typeof SubscriptionStatus];
