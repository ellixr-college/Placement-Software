# Ellixr — Role → Module Map

[← Overview](./00-overview.md) | [Design System](./design-system.md)

Defines, per role, which **modules/features** are accessible, which **shell** (mobile vs desktop web)
they use, and how that maps to **web route groups** and **API (NestJS) modules**. This is the
authority for RBAC: if a role isn't listed for a module, its endpoints/screens are denied for that role.

## Shells

- **Student → mobile shell** (`app/(student)/*`, PWA-installable). Self-service only.
- **Platform Admin / College Admin / Placement Officer → desktop web shell** (`app/(admin)/*`).

## Module Ownership Matrix

Legend: ✅ full · 👁️ read/oversight · ✋ self-only · — no access

| Module                             | Platform Admin | College Admin | Placement Officer |        Student         |
| ---------------------------------- | :------------: | :-----------: | :---------------: | :--------------------: |
| Auth (login/logout/reset)          |       ✅       |      ✅       |        ✅         |           ✅           |
| College Management                 |       ✅       |       —       |         —         |           —            |
| Subscription Management            |       ✅       |       —       |         —         |           —            |
| Platform Analytics (cross-college) |       ✅       |       —       |         —         |           —            |
| Team / User Management             |       —        |      ✅       |         —         |           —            |
| College Settings / Branding        |       —        |      ✅       |         —         |           —            |
| Student Management                 |       —        |      👁️       |        ✅         |    ✋ (own profile)    |
| Resume Management                  |       —        |      👁️       |        ✅         |        ✋ (own)        |
| Company Management                 |       —        |      👁️       |        ✅         |           —            |
| Job Management                     |       —        |      👁️       |        ✅         |           —            |
| Smart Matching / Eligibility       |       —        |      👁️       |        ✅         | 👁️ (own eligible feed) |
| ATS Tracking                       |       —        |      👁️       |        ✅         | ✋ (own applications)  |
| Interview Rounds                   |       —        |      👁️       |        ✅         |   ✋ (own timeline)    |
| Notifications (in-app)             |       ✅       |      ✅       |        ✅         |           ✅           |
| Email / Comms sending              |       —        |      ✅       |        ✅         |           —            |
| Alumni Engagement                  |       —        |      ✅       |        ✅         |           —            |
| Analytics & Reports (college)      |       —        |      ✅       |        ✅         |           —            |
| Audit Logs                         | 👁️ (platform)  | ✅ (college)  |         —         |           —            |

## Per-Role Module Lists

### 1. Platform Admin — desktop web · `collegeId = null` · global, no tenant data

- **Auth**
- **College Management** — create colleges, configure, activate/suspend
- **Subscription Management** — plan, status, trial windows
- **Platform Analytics** — college counts, subscription status, (optional) aggregate placement stats
- **Audit** — platform-level audit trail
  > Never touches tenant tables (students/jobs/etc.) directly.

### 2. College Admin — desktop web · scoped to own college

- **Auth**
- **Team / User Management** — create & manage Placement Officers and other College Admins
- **College Settings** — college profile, branding/logo
- **Oversight (read)** across Students, Companies, Jobs, ATS
- **Alumni Engagement** — full
- **Notifications & Email logs**
- **Analytics & Reports** — full college-wide
- **Audit Logs** — college trail

### 3. Placement Officer — desktop web · scoped to own college · the operational driver

- **Auth**
- **Student Management** — add, bulk CSV import, edit, verify/reject
- **Resume Management** — view/manage student resumes
- **Company Management** — companies, POCs, hiring history
- **Job Management** — create, edit, publish, close; define eligibility
- **Smart Matching** — preview eligible set; publish triggers notifications
- **ATS Tracking** — applicant pipeline, stage changes, interview rounds
- **Notifications** — send/in-app
- **Alumni Engagement** — manage records, campaigns, birthday automation
- **Analytics & Reports** — view & export
  > No user management, no college settings, no platform/subscription access.

### 4. Student — mobile / PWA · scoped to self within college · self-service only

- **Auth** — login, forgot/reset password (no public signup in V1)
- **My Profile** — personal, academic, skills, projects, certifications; submit for verification
- **My Resume** — upload, version history, set primary
- **Jobs** — eligible jobs feed, job detail, apply
- **My Applications** — ATS stage tracking, interview timeline, offers, withdraw
- **Notifications** — in-app notification center / bell
  > Only ever reads/writes own data; sees only jobs they're eligible for.

## API (NestJS) Module → Allowed Roles

| NestJS module   | Roles                                                       | Phase |
| --------------- | ----------------------------------------------------------- | ----- |
| `auth`          | all (+ public login/reset)                                  | 1     |
| `colleges`      | PLATFORM_ADMIN (CA read own)                                | 1     |
| `users`         | COLLEGE_ADMIN                                               | 1     |
| `settings`      | COLLEGE_ADMIN                                               | 1/5   |
| `students`      | PLACEMENT_OFFICER (CA read); STUDENT self via `me`          | 2     |
| `resumes`       | PLACEMENT_OFFICER; STUDENT self                             | 2     |
| `companies`     | PLACEMENT_OFFICER (CA read)                                 | 3     |
| `jobs`          | PLACEMENT_OFFICER (CA read); STUDENT eligible feed          | 3     |
| `applications`  | PLACEMENT_OFFICER; STUDENT self                             | 3     |
| `interviews`    | PLACEMENT_OFFICER; STUDENT self timeline                    | 3     |
| `notifications` | all (own)                                                   | 4     |
| `alumni`        | COLLEGE_ADMIN, PLACEMENT_OFFICER                            | 4     |
| `analytics`     | COLLEGE_ADMIN, PLACEMENT_OFFICER; PLATFORM_ADMIN (platform) | 5     |
| `reports`       | COLLEGE_ADMIN, PLACEMENT_OFFICER                            | 5     |
| `audit`         | COLLEGE_ADMIN (college); PLATFORM_ADMIN (platform)          | 5     |
| `dashboard`     | role-specific aggregation for each shell                    | 2+    |

Enforcement: global `JwtAuthGuard` + `@Roles()`/`RolesGuard` per controller, plus tenant scoping
(`collegeId` from JWT) and self-scoping for STUDENT (`me/*` routes match `request.user.sub`).

## Web Route Groups → Roles

| Route group                                                                  | Shell   | Roles                                 |
| ---------------------------------------------------------------------------- | ------- | ------------------------------------- |
| `app/(public)/*`                                                             | minimal | unauthenticated (login, forgot/reset) |
| `app/(student)/*`                                                            | mobile  | STUDENT                               |
| `app/(admin)/platform/*`                                                     | desktop | PLATFORM_ADMIN                        |
| `app/(admin)/*` (students, companies, jobs, ats, alumni, analytics, reports) | desktop | PLACEMENT_OFFICER, COLLEGE_ADMIN      |
| `app/(admin)/settings/team`                                                  | desktop | COLLEGE_ADMIN                         |

`middleware.ts` redirects: unauthenticated → `/login`; wrong-shell role → that role's home
(`STUDENT` → `/me`, admins → `/dashboard`, platform → `/platform/colleges`).
