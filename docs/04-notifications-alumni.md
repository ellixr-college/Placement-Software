# Phase 4 — Notifications, Email Automation & Alumni Engagement

[← Phase 3](./03-companies-jobs-ats.md) | [Overview](./00-overview.md) | Next: [Phase 5 →](./05-analytics-production.md)

## Goal

Build the communication layer: Resend-powered transactional email, an in-app notification center,
event-driven smart notifications, and the full Alumni Engagement Module (database, birthday
automation, segmented campaigns, dashboard).

## Scope

- `packages/notifications`: Resend client + React Email templates + senders
- In-app notification center (create/read/unread)
- Event-driven smart notifications wired to Phase 2/3 events
- Alumni records (CRUD + CSV/Excel import, search, filter, segmentation)
- Birthday automation (daily cron → personalized emails)
- Alumni group communications (event invites, campaigns) + communication history
- Alumni dashboard

## Database Schema (Prisma)

```prisma
enum NotificationType {
  WELCOME
  JOB_ALERT
  APPLICATION_UPDATE
  INTERVIEW_SCHEDULED
  OFFER_RELEASED
  REMINDER
  PASSWORD_RESET
  SYSTEM
  ADMIN_MESSAGE
}

enum EmailStatus {
  QUEUED
  SENT
  DELIVERED
  FAILED
  BOUNCED
}

enum AlumniStatus {
  ACTIVE
  INACTIVE
}

enum AlumniCommType {
  BIRTHDAY
  COLLEGE_FEST
  ALUMNI_MEET
  CAMPUS_EVENT
  CONVOCATION
  FOUNDERS_DAY
  DEPT_REUNION
  PLACEMENT_OUTREACH
  GENERAL
}

model Notification {
  id          String   @id @default(uuid())
  collegeId   String?
  userId      String              // recipient
  type        NotificationType
  title       String
  body        String
  linkUrl     String?
  isRead      Boolean  @default(false)
  readAt      DateTime?
  createdAt   DateTime @default(now())

  @@index([userId, isRead])
  @@map("notifications")
}

model EmailLog {
  id            String   @id @default(uuid())
  collegeId     String?
  toEmail       String
  toUserId      String?
  type          NotificationType
  subject       String
  status        EmailStatus @default(QUEUED)
  resendId      String?            // Resend message id
  errorMessage  String?
  sentAt        DateTime?
  createdAt     DateTime @default(now())

  @@index([collegeId, type])
  @@index([toEmail])
  @@map("email_logs")
}

model Alumni {
  id              String   @id @default(uuid())
  collegeId       String
  fullName        String
  email           String
  phone           String?
  dateOfBirth     DateTime?
  batchYear       Int
  course          String?
  currentCompany  String?
  designation     String?
  city            String?
  linkedinUrl     String?
  status          AlumniStatus @default(ACTIVE)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  communications  AlumniCommunicationRecipient[]

  @@unique([collegeId, email])
  @@index([collegeId, batchYear])
  @@index([collegeId, currentCompany])
  @@map("alumni")
}

model AlumniCommunication {
  id            String   @id @default(uuid())
  collegeId     String
  type          AlumniCommType
  subject       String
  body          String              // sanitized HTML
  segmentFilter Json?               // { batchYear?, course?, company?, designation?, city?, all? }
  recipientCount Int     @default(0)
  sentById      String
  sentAt        DateTime?
  createdAt     DateTime @default(now())

  recipients    AlumniCommunicationRecipient[]

  @@index([collegeId, type])
  @@map("alumni_communications")
}

model AlumniCommunicationRecipient {
  id              String   @id @default(uuid())
  communicationId String
  alumniId        String
  email           String
  status          EmailStatus @default(QUEUED)
  resendId        String?
  sentAt          DateTime?

  communication   AlumniCommunication @relation(fields: [communicationId], references: [id], onDelete: Cascade)
  alumni          Alumni  @relation(fields: [alumniId], references: [id], onDelete: Cascade)

  @@index([communicationId])
  @@index([alumniId])
  @@map("alumni_communication_recipients")
}
```

## Notification Engine Design

**Two delivery channels per event:** in-app (`Notification` row) + email (`EmailLog` + Resend).

- An internal `NotificationsService` exposes `notify(userId, type, payload)` and
  `sendEmail(to, template, data)`; all email goes through `packages/notifications` so Resend is
  called in exactly one place (logging + retry centralized).
- **Event-driven wiring** (consuming domain events emitted in earlier phases):

  | Event (source phase) | In-app | Email template |
  |---|---|---|
  | User created / bulk import (P2) | ✓ | Welcome |
  | Job published → eligible students (P3) | ✓ | Job Alert |
  | Application stage change (P3) | ✓ | Application Update |
  | Interview scheduled (P3) | ✓ | Interview Schedule |
  | Offer released (P3) | ✓ | Offer |
  | Forgot password (P1) | — | Password Reset |
  | Deadline reminder (cron) | ✓ | Reminder |

### Email templates (React Email in `packages/notifications`)
`Welcome`, `JobAlert`, `Reminder`, `InterviewSchedule`, `Offer`, `PasswordReset`,
`AlumniBirthday`, `AlumniEventInvite`, `AlumniCampaign`. All share a branded layout with
per-college name/logo.

## Alumni Module Design

### Management
- Full CRUD + CSV/Excel import (same R2-upload-then-process pattern as student import in Phase 2).
- Search (name/email/company) + filters (batch, course, company, year, status).
- Import template: `fullName,email,phone,dateOfBirth,batchYear,course,currentCompany,designation,city,linkedinUrl`.

### Birthday automation
- **Daily cron** (Phase 5 hosts the scheduler; the job logic lives here) finds alumni whose
  `dateOfBirth` month/day = today and `status = ACTIVE`, sends `AlumniBirthday` email, logs to
  `EmailLog` + creates an `AlumniCommunication`(type=BIRTHDAY) record per run for history.
- Idempotent: guarded so a given alumnus gets at most one birthday email per year.

### Segmented campaigns
- Officer composes a communication, picks a segment (`batchYear` / `course` / `company` /
  `designation` / `city` / `all`), previews recipient count, sends.
- Body sanitized server-side (anti-XSS) before storage/send.
- Each send fans out to `AlumniCommunicationRecipient` rows; delivery status updated from Resend
  webhooks (optional) or send response.

## API Endpoints

| Method | Path | Roles | Description |
|---|---|---|---|
| GET | `/api/v1/notifications` | any auth | Own notifications (paginated, unread filter) |
| PATCH | `/api/v1/notifications/:id/read` | any auth | Mark read |
| POST | `/api/v1/notifications/read-all` | any auth | Mark all read |
| GET | `/api/v1/notifications/unread-count` | any auth | Badge count |
| GET | `/api/v1/email-logs` | COLLEGE_ADMIN | Email history for college (audit/debug) |
| POST/GET/PATCH/DELETE | `/api/v1/alumni` `…/:id` | COLLEGE_ADMIN, PLACEMENT_OFFICER | Alumni CRUD |
| POST | `/api/v1/alumni/import` | COLLEGE_ADMIN, PLACEMENT_OFFICER | CSV/Excel import |
| GET | `/api/v1/alumni/segment/preview` | COLLEGE_ADMIN, PLACEMENT_OFFICER | Recipient count for a segment filter |
| POST | `/api/v1/alumni/communications` | COLLEGE_ADMIN, PLACEMENT_OFFICER | Compose + send campaign |
| GET | `/api/v1/alumni/communications` | COLLEGE_ADMIN, PLACEMENT_OFFICER | Communication history |
| GET | `/api/v1/alumni/dashboard` | COLLEGE_ADMIN, PLACEMENT_OFFICER | Alumni dashboard metrics |

## UI Screens

| Route | Access | Notes |
|---|---|---|
| Notification bell + dropdown (global) | any auth | Unread badge, recent list, mark read |
| `/notifications` | any auth | Full notification history |
| `/alumni` | CA, PO | Table: search, filters, status |
| `/alumni/new`, `/alumni/[id]` | CA, PO | Add/edit alumnus |
| `/alumni/import` | CA, PO | CSV/Excel upload + error report |
| `/alumni/communications` | CA, PO | Compose campaign, segment picker, recipient preview, history |
| `/alumni/dashboard` | CA, PO | Total alumni, by batch, by company, upcoming birthdays, recent comms, active/inactive |

## Security Notes (Phase 4)

- Resend API key server-side only; all sends routed through `packages/notifications`.
- Campaign/email HTML bodies sanitized server-side before storage and send (stored-XSS prevention).
- Alumni data tenant-scoped; import validates + de-dupes by `(collegeId, email)`.
- Notification reads hard-scoped to `request.user.sub` (no reading others' notifications).
- Rate-limit campaign sends to protect Resend quota and prevent accidental mass-send loops.
- Consider unsubscribe handling / suppression list for alumni emails (compliance) — flag below.

## Open Questions

1. **Unsubscribe / suppression**: should alumni emails include an unsubscribe link + honor a
   suppression list? Recommended for deliverability/compliance even in V1. Confirm scope.
2. **Resend webhooks** for delivery/bounce status — wire them now, or just store the send-time
   status? Default: store send response now, webhooks optional.
3. In-app notifications for **Placement Officers/Admins** (e.g. "new application received") in
   addition to students — in scope? Assumed yes for key events.

## Deliverable

- Transactional emails (welcome, job alert, interview, offer, reminders, password reset) sending via Resend.
- In-app notification center with unread counts, wired to Phase 2/3 events.
- Alumni database with import, search, segmentation.
- Automated birthday emails + segmented event/campaign communications with full history.
- Alumni dashboard live.
