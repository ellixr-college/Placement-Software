# Ellixr — Project Overview & Build Plan

> Planning index for the Ellixr Placement Intelligence & Career Success Platform.
> Read this first, then follow the phase docs in order: [01](./01-foundation-auth.md) → [02](./02-student-lifecycle.md) → [03](./03-companies-jobs-ats.md) → [04](./04-notifications-alumni.md) → [05](./05-analytics-production.md).
> Design tokens, theme, and the mobile/web platform split live in [design-system.md](./design-system.md).

## 1. Product Vision

Ellixr is a multi-tenant Placement Intelligence & Career Success Platform for colleges and
universities. It helps placement teams manage students, recruiters, jobs, applications,
interview rounds, communication, analytics, reports, and alumni engagement from a single system.

## 2. User Roles & Access Model

| Role                  | Scope                          | Key Capabilities                                                                                 |
| --------------------- | ------------------------------ | ------------------------------------------------------------------------------------------------ |
| **Platform Admin**    | Global (Ellixr team)           | Create/manage colleges, manage subscriptions, global oversight, no tenant data access by default |
| **College Admin**     | Single college                 | Oversee placement operations, manage Placement Officer accounts, college settings, alumni        |
| **Placement Officer** | Single college                 | Manage students, companies, jobs, applications/ATS, notifications, alumni                        |
| **Student**           | Single college (self)          | Maintain own profile, upload resume, browse/apply jobs, track application status                 |
| _Company Recruiter_   | _Phase 2 of roadmap (post-V1)_ | _Out of scope for all 5 phases below_                                                            |

Every authenticated page is role-gated. A user only ever sees screens/data permitted for their role
and (except Platform Admin) scoped to their own college.

**Platform split (see [design-system.md](./design-system.md)):** one Next.js app, two experiences —
the **Student** experience is **mobile-first / PWA-installable** (`app/(student)/*`, app-like card &
timeline UI, floating bottom nav), while **Placement Officer / College Admin / Platform Admin** use a
**desktop web** experience (`app/(admin)/*`, sidebar + topbar, data tables, dashboards). Both share
one auth/session, one coral theme, and one `packages/ui` component library.

## 3. Multi-Tenancy Model

- **Shared database, shared schema**, row-level isolation via a `collegeId` column on every
  tenant-scoped table.
- **Platform Admin** users have `collegeId = null` and operate outside tenant scope (they manage
  `College` records and subscriptions, not student/job data).
- **Tenant isolation is enforced in the API layer**, not just the UI: every authenticated request
  carries `collegeId` in the JWT, and a request-scoped Prisma helper / guard injects
  `where: { collegeId }` automatically for tenant-scoped queries. See [Security Architecture](#7-security-architecture)
  and [Phase 1](./01-foundation-auth.md) for implementation details.

## 4. Technology Stack

| Layer      | Choice                                                       |
| ---------- | ------------------------------------------------------------ |
| Frontend   | Next.js 15 (App Router), TypeScript, Tailwind CSS, Shadcn UI |
| Backend    | NestJS (modular monolith)                                    |
| Database   | Supabase Postgres                                            |
| ORM        | Prisma (schema, migrations, generated client)                |
| Storage    | Cloudflare R2 (resumes, alumni import files, export files)   |
| Email      | Resend                                                       |
| Hosting    | Vercel (web) + Railway (api)                                 |
| Monitoring | Sentry (web + api)                                           |
| Monorepo   | pnpm workspaces + Turborepo                                  |

## 5. Repository Structure

```text
ellixr/
├── apps/
│   ├── web/                  Next.js 15 app (App Router), Tailwind, Shadcn UI
│   └── api/                  NestJS REST API
├── packages/
│   ├── database/             Prisma schema, migrations, generated client, seed scripts
│   ├── auth/                 Shared role/permission enums, JWT payload types, RBAC constants
│   ├── storage/               Cloudflare R2 client + presigned URL helpers (NEW — see §9)
│   ├── ui/                    Shared Shadcn-based component library
│   ├── shared/                Shared TS types, DTOs, zod schemas, constants, API response types
│   ├── notifications/        Resend client, email templates (React Email), senders
│   └── analytics/             Shared aggregation/query helpers for reports & dashboards
├── docs/                      Planning documents (this folder)
├── turbo.json
├── pnpm-workspace.yaml
└── package.json
```

> `apps/docs` (an end-user documentation site) from the master architecture doc is **deferred** —
> not part of any of the 5 phases below. Planning docs live in root `/docs`.

## 6. Cross-Cutting Conventions

- **API**: REST, all routes prefixed `/api/v1`. JSON responses use a standard envelope:
  `{ "data": ..., "meta": {...} }` for success, `{ "error": { "code", "message", "details" } }` for errors.
- **Pagination**: `?page=1&limit=20`, response includes `meta.total`, `meta.page`, `meta.limit`.
- **DB naming**: Prisma models in PascalCase / fields in camelCase, mapped to `snake_case` tables/columns
  via `@@map` / `@map`.
- **Common columns**: every tenant-scoped table has `collegeId`, `createdAt`, `updatedAt`. Soft-delete
  via `isActive` (users, students, companies) rather than hard delete, to preserve audit history.
- **Validation**: NestJS `class-validator` DTOs on the API; mirrored `zod` schemas in `packages/shared`
  consumed by `react-hook-form` on the frontend.
- **IDs**: UUID v4 primary keys throughout.

## 7. Security Architecture

Security is a cross-cutting concern across all 5 phases, anchored in Phase 1 but enforced everywhere.
Core principle: **every page and every API route requires authentication by default**; only a tiny,
explicit allowlist (login, forgot/reset password) is public.

### 7.1 Authentication & Session Security

- Passwords hashed with **bcrypt** (cost factor ≥ 12).
- **Short-lived JWT access tokens** (~15 min), signed with `JWT_ACCESS_SECRET`, carrying
  `sub` (userId), `collegeId`, `role`.
- **Refresh tokens** (7–30 days) stored **hashed** in DB, delivered as an **httpOnly, secure,
  sameSite=strict** cookie; rotated on every refresh; revocable (logout, password change, admin
  deactivation invalidates all sessions for a user).
- Forgot/reset password uses single-use, time-limited (e.g. 1 hour), hashed tokens emailed via Resend.

### 7.2 Frontend Route Protection (Next.js)

- A global `middleware.ts` checks for a valid session on **every route** except an explicit public
  allowlist (`/login`, `/forgot-password`, `/reset-password/*`). Unauthenticated requests redirect
  to `/login`.
- Role-based route groups (e.g. `(platform)`, `(college-admin)`, `(placement-officer)`, `(student)`)
  with layout-level role checks; a logged-in Student hitting a Placement Officer route gets a
  403/redirect, not a data leak.

### 7.3 Backend Access Control (NestJS)

- `JwtAuthGuard` registered **globally** via `APP_GUARD` — every endpoint requires a valid access
  token unless explicitly decorated `@Public()`.
- `RolesGuard` + `@Roles(UserRole.X, ...)` decorator for role-based authorization.
- `TenantScopeGuard` / request-scoped Prisma wrapper: for all non-Platform-Admin requests,
  `collegeId` is taken **only from the verified JWT**, never from client-supplied input, and is
  injected into every tenant-scoped query/mutation. Cross-tenant access attempts return 404 (not 403,
  to avoid confirming record existence).
- `helmet` for secure HTTP headers; CORS restricted to the deployed web app origin(s).
- Rate limiting (`@nestjs/throttler`) on auth endpoints (`/auth/login`, `/auth/forgot-password`,
  `/auth/reset-password`) to mitigate brute force / credential stuffing.

### 7.4 Data & Input Security

- All DB access via Prisma (parameterized queries) — no raw string-concatenated SQL.
- `class-validator` DTOs validate/whitelist every request body, query, and param
  (`whitelist: true, forbidNonWhitelisted: true`).
- File uploads (resumes, CSV imports) validated for MIME type and size **before** issuing R2
  presigned URLs; presigned URLs are short-lived and scoped to a single object key.
- Alumni/communication HTML bodies are sanitized server-side before storage and send (prevent
  stored XSS via templates that later render in-app).

### 7.5 Audit & Monitoring

- Sensitive mutations (student verification, application stage changes, user role changes, college
  status changes) are written to `audit_logs` (see [Phase 5](./05-analytics-production.md)) with actor,
  before/after values, and timestamp.
- Sentry captures backend and frontend errors; secrets/PII are scrubbed from error payloads.

### 7.6 Secrets Management

- Per-environment `.env` files (never committed); `.env.example` documents required keys for
  `apps/api` (`DATABASE_URL`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `RESEND_API_KEY`,
  `R2_*`) and `apps/web` (`NEXT_PUBLIC_API_URL`).

## 8. Build Order & Phase Index

| Phase | Doc                                                        | Focus                                                                         | Depends On |
| ----- | ---------------------------------------------------------- | ----------------------------------------------------------------------------- | ---------- |
| 1     | [01-foundation-auth.md](./01-foundation-auth.md)           | Monorepo setup, multi-tenant SaaS foundation, auth, RBAC, security middleware | —          |
| 2     | [02-student-lifecycle.md](./02-student-lifecycle.md)       | Student management, profiles, resumes (R2), bulk import                       | Phase 1    |
| 3     | [03-companies-jobs-ats.md](./03-companies-jobs-ats.md)     | Companies, jobs, eligibility/smart matching, ATS tracking                     | Phases 1–2 |
| 4     | [04-notifications-alumni.md](./04-notifications-alumni.md) | Resend email automation, in-app notifications, alumni engagement              | Phases 1–3 |
| 5     | [05-analytics-production.md](./05-analytics-production.md) | Analytics, reports/exports, audit logs, deployment & monitoring               | Phases 1–4 |

This sequence gets the **core placement workflow live by Phase 3**, with communication, alumni
engagement, and analytics layered on as enhancements.

## 9. Decisions Made This Planning Session

- **Monorepo**: pnpm workspaces + Turborepo.
- **ORM**: Prisma.
- **Planning docs**: this overview + one doc per phase, living in root `/docs`.
- **New package**: `packages/storage` added to the repo structure for Cloudflare R2 presigned-URL
  helpers (not explicitly named in the master architecture doc, but required starting Phase 2 for
  resume uploads and reused in Phases 4–5 for CSV/report files).
- **Security**: all authenticated pages/routes are protected by default (deny-by-list, not
  allow-by-list); details in §7 and Phase 1.

## 10. Open Questions / Assumptions Flagged for Review

These are simplifications or additions made while turning the PRDs into concrete schemas. Flag any
you'd like changed before Phase 1 starts:

1. **RBAC model**: V1 uses a single `role` enum (4 values) on `User` rather than separate
   `roles`/`permissions` tables from the master architecture doc. A `permissions` table is deferred
   to V2 unless you need per-user/per-officer fine-grained permission overrides sooner.
2. **Subscription/billing**: V1 tracks `subscriptionPlan` / `subscriptionStatus` / `trialEndsAt` as
   fields on `College` only — **no payment gateway integration**. Platform Admin updates these
   manually. Confirm this is sufficient for V1.
3. **ATS stage list**: recommend adding a **`REJECTED`** terminal stage (not in the original PRD
   list) so applications that fail a round have an explicit end state, rather than being stuck at
   "Round 2" forever. See [Phase 3](./03-companies-jobs-ats.md#open-questions).
4. **Student placement status**: recommend simplifying the stored `Student.status` enum to
   `REGISTERED / VERIFIED / PLACED / NOT_PLACED`, with "Applying" / "Interviewing" derived from the
   student's active `Application` records rather than stored redundantly. See
   [Phase 2](./02-student-lifecycle.md#open-questions).
5. **Eligible-but-not-yet-applied jobs**: the PRD says eligible students are notified when a job is
   published. Assumption: eligible students see the job in their `/jobs` feed; ineligible students do
   not see it at all (rather than seeing a disabled "not eligible" state). Confirm this matches intent.
6. **`apps/docs`**: the end-user documentation site from the master repo structure is out of scope for
   Phases 1–5; can be added later without affecting this plan.
