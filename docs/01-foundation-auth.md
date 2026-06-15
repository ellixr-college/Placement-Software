# Phase 1 — Foundation, Multi-Tenant Architecture & Authentication

[← Overview](./00-overview.md) | Next: [Phase 2 →](./02-student-lifecycle.md)

## Goal

Stand up the monorepo, the multi-tenant SaaS foundation, and a fully secured authentication +
RBAC system. By the end of this phase: users can log in, colleges can be created, roles work, and
**every route — frontend and backend — is protected by default**.

## Scope

- pnpm + Turborepo monorepo scaffold
- `packages/database` (Prisma schema, migrations, seed)
- `packages/shared`, `packages/auth`, `packages/ui` skeletons
- NestJS API: auth module, users module, colleges module, global security middleware
- Next.js web: login/forgot/reset pages, auth-aware layout shell, role-based route groups
- College onboarding (Platform Admin creates College + initial College Admin)

## Out of Scope (later phases)

- Student/company/job data models
- Email sending (forgot-password email can use a direct Resend call as a stub; full
  `packages/notifications` build-out is Phase 4)

## Database Schema (Prisma)

```prisma
enum UserRole {
  PLATFORM_ADMIN
  COLLEGE_ADMIN
  PLACEMENT_OFFICER
  STUDENT
}

enum SubscriptionPlan {
  TRIAL
  BASIC
  PRO
  ENTERPRISE
}

enum SubscriptionStatus {
  TRIAL
  ACTIVE
  SUSPENDED
  CANCELLED
}

model College {
  id                 String   @id @default(uuid())
  name               String
  slug               String   @unique
  domain             String?
  logoUrl            String?
  contactEmail       String
  contactPhone       String?
  address            String?
  city               String?
  state              String?
  country            String   @default("India")
  subscriptionPlan   SubscriptionPlan   @default(TRIAL)
  subscriptionStatus SubscriptionStatus @default(TRIAL)
  trialEndsAt        DateTime?
  isActive           Boolean  @default(true)
  createdAt          DateTime @default(now())
  updatedAt          DateTime @updatedAt

  users              User[]

  @@map("colleges")
}

model User {
  id              String    @id @default(uuid())
  collegeId       String?   // null for PLATFORM_ADMIN
  email           String    @unique
  passwordHash    String
  fullName        String
  role            UserRole
  phone           String?
  avatarUrl       String?
  isActive        Boolean   @default(true)
  emailVerifiedAt DateTime?
  lastLoginAt     DateTime?
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  college         College?  @relation(fields: [collegeId], references: [id])
  refreshTokens   RefreshToken[]
  passwordResets  PasswordResetToken[]

  @@index([collegeId])
  @@map("users")
}

model RefreshToken {
  id         String    @id @default(uuid())
  userId     String
  tokenHash  String
  expiresAt  DateTime
  revokedAt  DateTime?
  createdAt  DateTime  @default(now())

  user       User      @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@map("refresh_tokens")
}

model PasswordResetToken {
  id         String    @id @default(uuid())
  userId     String
  tokenHash  String
  expiresAt  DateTime
  usedAt     DateTime?
  createdAt  DateTime  @default(now())

  user       User      @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@map("password_reset_tokens")
}
```

## Authentication & Authorization Design

### Token lifecycle
- **Access token**: JWT, 15 min TTL, payload `{ sub: userId, collegeId, role }`, signed with
  `JWT_ACCESS_SECRET`. Sent in `Authorization: Bearer` header, held in memory on the client
  (not localStorage) to limit XSS exfiltration risk.
- **Refresh token**: opaque random string, 7–30 day TTL, **hashed** before storing in
  `refresh_tokens`. Delivered as `httpOnly, secure, sameSite=strict` cookie. Rotated on every
  `/auth/refresh` call (old row marked `revokedAt`, new row inserted) — detects token reuse/theft.
- **Logout**: revokes the current refresh token row; "logout everywhere" revokes all rows for the user.
- **Password change / admin deactivation**: revokes all refresh tokens for that user immediately.

### RBAC implementation
- `@Roles(UserRole.COLLEGE_ADMIN, UserRole.PLACEMENT_OFFICER)` decorator + `RolesGuard` reads
  `request.user.role` (from verified JWT) and rejects with 403 if not permitted.
- `@Public()` decorator marks the small allowlist of unauthenticated endpoints
  (`/auth/login`, `/auth/refresh`, `/auth/forgot-password`, `/auth/reset-password`).
- `JwtAuthGuard` is registered globally via `APP_GUARD` — **every other endpoint requires auth by default**.

### Multi-tenant scoping
- `TenantScopeGuard` (or a request-scoped `TenantContext` service) reads `collegeId` from the
  verified JWT and exposes it to services.
- All tenant-scoped Prisma queries go through repository methods that **require** `collegeId` as a
  parameter — there is no "unscoped" query path for tenant tables, preventing accidental
  cross-tenant leaks.
- Platform Admin (`collegeId === null`) uses a separate set of endpoints (`/colleges/*`) that never
  touch tenant data tables directly.

## API Endpoints

| Method | Path | Auth | Roles | Description |
|---|---|---|---|---|
| POST | `/api/v1/auth/login` | Public | — | Email/password login → access token + refresh cookie |
| POST | `/api/v1/auth/refresh` | Public (refresh cookie) | — | Rotate refresh token, issue new access token |
| POST | `/api/v1/auth/logout` | Authenticated | any | Revoke current refresh token |
| POST | `/api/v1/auth/forgot-password` | Public | — | Send reset email (rate-limited) |
| POST | `/api/v1/auth/reset-password` | Public | — | Reset password via emailed token |
| GET | `/api/v1/auth/me` | Authenticated | any | Current user profile + college info |
| POST | `/api/v1/colleges` | Authenticated | PLATFORM_ADMIN | Create college + initial College Admin user |
| GET | `/api/v1/colleges` | Authenticated | PLATFORM_ADMIN | List colleges (paginated, searchable) |
| GET | `/api/v1/colleges/:id` | Authenticated | PLATFORM_ADMIN, COLLEGE_ADMIN (own) | College detail |
| PATCH | `/api/v1/colleges/:id` | Authenticated | PLATFORM_ADMIN | Update college profile / subscription |
| PATCH | `/api/v1/colleges/:id/status` | Authenticated | PLATFORM_ADMIN | Activate / suspend college (revokes all sessions for that college) |
| POST | `/api/v1/users` | Authenticated | COLLEGE_ADMIN | Create Placement Officer / College Admin user (scoped to own college) |
| GET | `/api/v1/users` | Authenticated | COLLEGE_ADMIN | List users in own college |
| GET | `/api/v1/users/:id` | Authenticated | COLLEGE_ADMIN | User detail (own college only) |
| PATCH | `/api/v1/users/:id` | Authenticated | COLLEGE_ADMIN | Update role / active status |
| DELETE | `/api/v1/users/:id` | Authenticated | COLLEGE_ADMIN | Deactivate user (soft delete, revokes sessions) |

## UI Screens

| Route | Access | Notes |
|---|---|---|
| `/login` | Public | Email/password form |
| `/forgot-password` | Public | Request reset email |
| `/reset-password/[token]` | Public | Set new password |
| `/platform/colleges` | PLATFORM_ADMIN | List + create college modal |
| `/platform/colleges/[id]` | PLATFORM_ADMIN | College detail, subscription management |
| `/settings/team` | COLLEGE_ADMIN | Manage Placement Officer / Admin accounts for own college |
| `/dashboard` | All authenticated | Placeholder shell, role-based widgets added in later phases |

### Route protection (Next.js)

```text
middleware.ts
  PUBLIC_PATHS = ["/login", "/forgot-password", "/reset-password"]
  - if path not in PUBLIC_PATHS and no valid session → redirect to /login
  - if path in (platform) group and role !== PLATFORM_ADMIN → redirect to /dashboard
  - if path in (college-admin) group and role !== COLLEGE_ADMIN → redirect to /dashboard
  ...
```

Route groups: `app/(public)/login`, `app/(public)/forgot-password`, `app/(platform)/...`,
`app/(college-admin)/...`, `app/(placement-officer)/...`, `app/(student)/...`, with a shared
`(authenticated)` layout providing the app shell (sidebar/topbar/logout) and role-aware nav.

## Security Implementation Checklist (Phase 1)

- [ ] `helmet` enabled on NestJS app; CORS locked to web app origin(s) + credentials.
- [ ] `JwtAuthGuard` registered as global `APP_GUARD`; `@Public()` allowlist only for the 4 auth endpoints.
- [ ] `RolesGuard` + `@Roles()` on every Platform Admin and College Admin endpoint.
- [ ] `ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true })` registered globally.
- [ ] `@nestjs/throttler` on `/auth/login`, `/auth/forgot-password`, `/auth/reset-password`
      (e.g. 5 attempts / 15 min per IP+email).
- [ ] bcrypt cost factor ≥ 12 for password hashing.
- [ ] Refresh tokens: httpOnly + secure + sameSite=strict cookie, hashed at rest, rotated on use.
- [ ] `middleware.ts` in `apps/web` protects all routes except the public allowlist.
- [ ] Seed script creates exactly one Platform Admin (credentials from env, not hardcoded).
- [ ] `.env.example` files for `apps/api` and `apps/web` committed; real `.env` gitignored.

## Workspace Setup Tasks

1. `pnpm init` + `pnpm-workspace.yaml` (`apps/*`, `packages/*`) + root `turbo.json`.
2. Scaffold `apps/web`: `create-next-app` (App Router, TS, Tailwind), `shadcn` init.
3. Scaffold `apps/api`: Nest CLI, configure `ConfigModule`, `helmet`, global pipes/guards.
4. `packages/database`: `prisma init`, schema above, first migration, `seed.ts` (1 Platform Admin).
5. `packages/shared`: `UserRole` enum, JWT payload type, API response envelope types, zod auth schemas.
6. `packages/auth`: shared role/permission constants, `@Roles`/`@Public` decorator types re-exported for FE/BE.
7. `packages/ui`: shadcn component re-exports, base theme.
8. `.env.example` for both apps (`DATABASE_URL`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`,
   `RESEND_API_KEY` placeholder, `R2_*` placeholders, `NEXT_PUBLIC_API_URL`).

## Deliverable

- Users can log in (access + refresh tokens working end-to-end).
- Platform Admin can create a College + initial College Admin.
- College Admin can create Placement Officer accounts.
- Roles enforced on both API and UI; cross-tenant/cross-role access blocked.
- Every page redirects unauthenticated users to `/login`.
- Multi-tenant foundation (`collegeId` scoping) ready for Phase 2 onward.
