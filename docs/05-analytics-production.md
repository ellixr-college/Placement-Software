# Phase 5 — Analytics, Reports, Audit & Production Readiness

[← Phase 4](./04-notifications-alumni.md) | [Overview](./00-overview.md)

## Goal

Make Ellixr deployable to real colleges: analytics dashboards, exportable reports, audit logging,
monitoring, the cron scheduler (powering Phase 4's birthday/reminder jobs), and full deployment to
Vercel + Render + Supabase + Vercel Blob.

## Scope

- `packages/analytics`: aggregation/query helpers feeding dashboards + reports
- Analytics dashboards (placement, job, student metrics)
- Reports with CSV / Excel / PDF export
- Audit logging (cross-cutting; table introduced here, events emitted since Phase 1)
- Cron scheduler (birthday automation, deadline reminders)
- Sentry monitoring (web + api)
- Production deployment + hardening

## Database Schema (Prisma)

```prisma
enum AuditAction {
  CREATE
  UPDATE
  DELETE
  VERIFY
  STAGE_CHANGE
  PUBLISH
  STATUS_CHANGE
  LOGIN
}

model AuditLog {
  id          String   @id @default(uuid())
  collegeId   String?
  actorId     String?             // user who performed the action (null for system/cron)
  action      AuditAction
  entityType  String              // "Student" | "Job" | "Application" | "User" | "College" | ...
  entityId    String
  before      Json?               // prior values (sensitive fields scrubbed)
  after       Json?               // new values
  ipAddress   String?
  createdAt   DateTime @default(now())

  @@index([collegeId, entityType])
  @@index([actorId])
  @@index([createdAt])
  @@map("audit_logs")
}
```

> Audit events for student verification, application stage changes, user role/status changes, job
> publish, and college status changes were **emitted as domain events in Phases 1–4**; this phase
> adds the consumer that persists them to `audit_logs` (or persists synchronously via an interceptor).

## Analytics

Computed via `packages/analytics` (parameterized aggregate queries, all tenant-scoped). Cache
expensive aggregates (short TTL) if needed.

### Placement metrics

- Placement % = placed students / eligible (registered+verified) students
- Average package, highest package, median package (from `Application.offerCtc` where stage ≥ OFFER_ACCEPTED)
- Placement count over time

### Job metrics

- Jobs posted, jobs published, applications received, offers released, conversion (apply→offer) rate

### Student metrics

- Profile completion distribution, active students, placed vs unplaced

### Breakdowns

- Company-wise placements, branch-wise placement %, batch/graduation-year-wise, application funnel
  (count at each ATS stage)

## Reports & Export

| Report             | Contents                                         | Formats         |
| ------------------ | ------------------------------------------------ | --------------- |
| Student Report     | Roster + profile completion + status + placement | CSV, Excel, PDF |
| Company Report     | Companies, jobs posted, hires                    | CSV, Excel, PDF |
| Placement Report   | Placement %, packages, branch/company breakdowns | CSV, Excel, PDF |
| Offer Report       | All offers: student, company, CTC, stage, date   | CSV, Excel, PDF |
| Branch Report      | Per-branch placement stats                       | CSV, Excel, PDF |
| Application Funnel | Counts per ATS stage for a job/period            | CSV, Excel, PDF |

- CSV/Excel generated server-side (`exceljs`); PDF via a server renderer (e.g. Puppeteer or a PDF
  lib). Large exports written to R2 and returned as a presigned download URL.
- Every report respects the requester's tenant scope; PII access is itself audited.

## API Endpoints

| Method | Path                                                       | Roles          | Description                                       |
| ------ | ---------------------------------------------------------- | -------------- | ------------------------------------------------- |
| GET    | `/api/v1/analytics/placement`                              | CA, PO         | Placement metrics                                 |
| GET    | `/api/v1/analytics/jobs`                                   | CA, PO         | Job metrics                                       |
| GET    | `/api/v1/analytics/students`                               | CA, PO         | Student metrics                                   |
| GET    | `/api/v1/analytics/funnel`                                 | CA, PO         | Application funnel                                |
| GET    | `/api/v1/analytics/breakdowns`                             | CA, PO         | Company/branch/batch breakdowns                   |
| POST   | `/api/v1/reports/:reportType/export?format=csv\|xlsx\|pdf` | CA, PO         | Generate export → presigned URL                   |
| GET    | `/api/v1/audit-logs`                                       | COLLEGE_ADMIN  | College audit trail (filter by entity/actor/date) |
| GET    | `/api/v1/platform/analytics`                               | PLATFORM_ADMIN | Cross-college platform metrics                    |

## UI Screens

| Route                 | Access         | Notes                                                      |
| --------------------- | -------------- | ---------------------------------------------------------- |
| `/analytics`          | CA, PO         | Dashboard: placement %, packages, funnel, breakdown charts |
| `/reports`            | CA, PO         | Pick report + format, generate, download                   |
| `/audit-logs`         | COLLEGE_ADMIN  | Filterable audit trail table                               |
| `/platform/analytics` | PLATFORM_ADMIN | Cross-college overview, subscription status                |

## Cron / Scheduled Jobs

Scheduler (Railway cron or `@nestjs/schedule`):

- **Daily birthday check** → triggers Phase 4 birthday automation.
- **Deadline reminders** → notify students of jobs whose `applicationDeadline` is near.
- **Trial expiry check** → flag colleges whose `trialEndsAt` has passed for Platform Admin.

## Production Readiness Checklist

### Deployment targets

- **Web** → Vercel (Next.js 15). Env: `NEXT_PUBLIC_API_URL`, Sentry DSN.
- **API** → Render (NestJS). Env: `DATABASE_URL`, JWT secrets, `BLOB_READ_WRITE_TOKEN`, Sentry DSN.
- **Database** → Supabase Postgres (connection limit capped to 3 per API instance).
- **Storage** → Vercel Blob (public blobs gated by the app).
- **Email** → Deferred in V1; per-college SMTP planned for Phase 4.

### Hardening / ops

- [ ] Sentry on web + api; PII/secret scrubbing configured.
- [ ] Prisma migrations run on deploy (`migrate deploy`); no `db push` in prod.
- [ ] DB backups (Supabase point-in-time) verified; documented restore.
- [ ] Production secrets in platform env stores (not in repo); rotate JWT secrets procedure documented.
- [ ] CORS locked to production web origin; `helmet`, rate limiting, HTTPS-only cookies confirmed.
- [ ] Health-check endpoints (`/health`) for Railway; uptime monitoring.
- [ ] Structured request logging (no secrets/PII in logs).
- [ ] Load sanity check: 1000+ students, indexed queries, pagination everywhere; N+1 review on
      dashboards/reports.
- [ ] Audit logging verified on all sensitive mutations.

### Final repository structure

```text
ellixr/
├── apps/
│   ├── web/        (Vercel)
│   └── api/        (Railway)
└── packages/
    ├── auth/
    ├── database/   (Supabase Postgres / Prisma)
    ├── storage/    (Vercel Blob)
    ├── ui/
    ├── analytics/
    ├── notifications/  (Resend)
    └── shared/
```

## Open Questions

1. **PDF rendering** approach — Puppeteer (heavier, pixel-accurate) vs a lighter PDF lib (faster,
   more layout work)? Default: lightweight lib for tabular reports.
2. Audit log **retention** period? Default: keep indefinitely in V1; revisit if volume grows.
3. Platform-level analytics depth for V1 — just college/subscription counts, or aggregate placement
   stats across colleges? Default: counts + subscription status only.

## Deliverable

- Analytics dashboards live (placement %, packages, funnel, breakdowns).
- Reports exportable to CSV / Excel / PDF.
- Audit logs capturing sensitive changes.
- Cron jobs (birthdays, reminders) running.
- Sentry monitoring active.
- **Production-ready multi-tenant SaaS** deployed across Vercel + Render + Supabase + Vercel Blob,
  scalable to multiple colleges with 1000+ students each.
