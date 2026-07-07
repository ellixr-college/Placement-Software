# Phase 3 — Companies, Jobs, Eligibility & ATS Tracking

[← Phase 2](./02-student-lifecycle.md) | [Overview](./00-overview.md) | Next: [Phase 4 →](./04-notifications-alumni.md)

## Goal

Build the core placement engine: company records, job postings with eligibility criteria, automatic
smart matching of eligible students, the application funnel, and full ATS stage tracking with
interview rounds. **This is the milestone where the end-to-end placement workflow goes live.**

## Scope

- Company management (records, multiple POCs, hiring history)
- Job lifecycle (draft → published → closed)
- Eligibility engine (course, branch, CGPA, backlogs, graduation year)
- Smart matching (compute eligible set on publish; surface jobs to eligible students only)
- Application + ATS stage tracking (Applied → … → Joined / Rejected)
- Interview round scheduling/results
- Student dashboard (applied jobs, timeline, offers) + Placement dashboard (funnel)

## Database Schema (Prisma)

```prisma
enum JobStatus {
  DRAFT
  PUBLISHED
  CLOSED
}

enum JobType {
  FULL_TIME
  INTERNSHIP
  INTERNSHIP_PPO
}

enum ApplicationStage {
  APPLIED
  VERIFIED
  SHORTLISTED
  ROUND_1
  ROUND_2
  ROUND_3
  HR
  OFFER_RELEASED
  OFFER_ACCEPTED
  JOINED
  REJECTED        // terminal — see overview §10.3
  WITHDRAWN       // student-initiated exit
}

enum InterviewResult {
  PENDING
  PASSED
  FAILED
  NO_SHOW
}

model Company {
  id            String   @id @default(uuid())
  collegeId     String
  name          String
  website       String?
  industry      String?
  description   String?
  logoUrl       String?
  city          String?
  isActive      Boolean  @default(true)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  contacts      CompanyContact[]
  jobs          Job[]

  @@unique([collegeId, name])
  @@index([collegeId])
  @@map("companies")
}

model CompanyContact {
  id          String   @id @default(uuid())
  companyId   String
  name        String
  designation String?
  email       String
  phone       String?
  isPrimary   Boolean  @default(false)
  company     Company  @relation(fields: [companyId], references: [id], onDelete: Cascade)

  @@index([companyId])
  @@map("company_contacts")
}

model Job {
  id                String   @id @default(uuid())
  collegeId         String
  companyId         String
  title             String
  description       String?
  jobType           JobType  @default(FULL_TIME)
  location          String?
  ctcMin            Decimal? @db.Decimal(12, 2)   // annual, in INR
  ctcMax            Decimal? @db.Decimal(12, 2)
  // Eligibility criteria
  eligibleCourses   String[]                       // e.g. ["B.Tech","M.Tech"]
  eligibleBranches  String[]
  minCgpa           Decimal? @db.Decimal(4, 2)
  maxActiveBacklogs Int?
  maxTotalBacklogs  Int?
  graduationYears   Int[]
  // Lifecycle
  status            JobStatus @default(DRAFT)
  applicationDeadline DateTime?
  publishedAt       DateTime?
  closedAt          DateTime?
  createdById       String
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  company           Company  @relation(fields: [companyId], references: [id])
  applications      Application[]

  @@index([collegeId, status])
  @@index([companyId])
  @@map("jobs")
}

model Application {
  id            String   @id @default(uuid())
  collegeId     String
  jobId         String
  studentId     String
  stage         ApplicationStage @default(APPLIED)
  appliedAt     DateTime @default(now())
  rejectedAt    DateTime?
  rejectionReason String?
  offerCtc      Decimal? @db.Decimal(12, 2)
  notes         String?
  updatedAt     DateTime @updatedAt

  job           Job      @relation(fields: [jobId], references: [id], onDelete: Cascade)
  stageHistory  ApplicationStageHistory[]
  interviews    InterviewRound[]

  @@unique([jobId, studentId])
  @@index([collegeId, stage])
  @@index([studentId])
  @@map("applications")
}

model ApplicationStageHistory {
  id            String   @id @default(uuid())
  applicationId String
  fromStage     ApplicationStage?
  toStage       ApplicationStage
  changedById   String
  note          String?
  createdAt     DateTime @default(now())

  application   Application @relation(fields: [applicationId], references: [id], onDelete: Cascade)

  @@index([applicationId])
  @@map("application_stage_history")
}

model InterviewRound {
  id            String   @id @default(uuid())
  applicationId String
  collegeId     String
  roundName     String              // "Technical Round 1", "HR", ...
  scheduledAt   DateTime?
  mode          String?             // ONLINE / OFFLINE
  location      String?             // venue or meeting link
  result        InterviewResult @default(PENDING)
  feedback      String?
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  application   Application @relation(fields: [applicationId], references: [id], onDelete: Cascade)

  @@index([applicationId])
  @@map("interview_rounds")
}
```

## Eligibility Engine

On **publish** (and re-runnable on demand), evaluate every active, **verified** student in the
college against the job's criteria:

```text
eligible(student, job) =
     student.verificationStatus == VERIFIED
  && student.status != PLACED                      // (configurable: allow already-placed to apply?)
  && job.eligibleCourses   ∋ student.course
  && job.eligibleBranches  ∋ student.branch
  && job.graduationYears   ∋ student.graduationYear
  && (job.minCgpa            is null || student.cgpa >= job.minCgpa)
  && (job.maxActiveBacklogs  is null || student.activeBacklogs <= job.maxActiveBacklogs)
  && (job.maxTotalBacklogs   is null || student.totalBacklogs  <= job.maxTotalBacklogs)
```

- Eligible students see the job in their `/jobs` feed; **ineligible students don't see it at all**
  (overview §10.5).
- Publishing emits a `JobPublished` event → notifications (Phase 4) email/in-app the eligible set.
- Eligibility is **checked again server-side at apply time** (a student's data may have changed),
  so the feed is a convenience, not the security boundary.

## ATS Workflow

```text
Job Published
   ↓
Student applies → Application(stage = APPLIED)
   ↓  Placement Officer advances stage (writes ApplicationStageHistory)
APPLIED → VERIFIED → SHORTLISTED → ROUND_1 → ROUND_2 → ROUND_3 → HR
   → OFFER_RELEASED → OFFER_ACCEPTED → JOINED
   ↘ REJECTED (any stage)      ↘ WITHDRAWN (student)
```

- Every stage change writes an `ApplicationStageHistory` row (actor + from/to + note) — this is the
  interview timeline shown to students and the funnel data for analytics.
- Reaching **OFFER_ACCEPTED / JOINED** sets the linked `Student.status = PLACED` and records
  `offerCtc` (feeds Phase 5 package analytics).
- Stage transitions validated against an allowed-transition map (no skipping to JOINED from APPLIED,
  no advancing a REJECTED/WITHDRAWN application).

## API Endpoints

| Method                | Path                                               | Roles                                    | Description                                      |
| --------------------- | -------------------------------------------------- | ---------------------------------------- | ------------------------------------------------ |
| POST/GET/PATCH/DELETE | `/api/v1/companies` `…/:id`                        | PLACEMENT_OFFICER                        | Company CRUD (soft delete)                       |
| POST/PATCH/DELETE     | `/api/v1/companies/:id/contacts` `…/:contactId`    | PLACEMENT_OFFICER                        | Manage POCs                                      |
| GET                   | `/api/v1/companies/:id/hiring-history`             | PLACEMENT_OFFICER                        | Jobs + hires for a company                       |
| POST/GET/PATCH        | `/api/v1/jobs` `…/:id`                             | PLACEMENT_OFFICER                        | Job CRUD (create as DRAFT)                       |
| POST                  | `/api/v1/jobs/:id/publish`                         | PLACEMENT_OFFICER                        | Publish → compute eligible set + notify          |
| POST                  | `/api/v1/jobs/:id/close`                           | PLACEMENT_OFFICER                        | Close job                                        |
| GET                   | `/api/v1/jobs/:id/eligible-students`               | PLACEMENT_OFFICER                        | Preview eligible set                             |
| GET                   | `/api/v1/jobs`                                     | STUDENT                                  | Eligible+published jobs feed for current student |
| GET                   | `/api/v1/jobs/:id`                                 | STUDENT (if eligible), PLACEMENT_OFFICER | Job detail                                       |
| POST                  | `/api/v1/jobs/:id/apply`                           | STUDENT                                  | Apply (re-checks eligibility + deadline)         |
| GET                   | `/api/v1/me/applications`                          | STUDENT                                  | Own applications + timelines                     |
| POST                  | `/api/v1/me/applications/:id/withdraw`             | STUDENT                                  | Withdraw                                         |
| GET                   | `/api/v1/jobs/:id/applications`                    | PLACEMENT_OFFICER                        | Applicant pipeline (kanban by stage)             |
| PATCH                 | `/api/v1/applications/:id/stage`                   | PLACEMENT_OFFICER                        | Advance/reject stage (writes history)            |
| POST/PATCH            | `/api/v1/applications/:id/interviews` `…/:roundId` | PLACEMENT_OFFICER                        | Schedule/record interview rounds                 |

## UI Screens

| Route                                       | Access            | Notes                                                  |
| ------------------------------------------- | ----------------- | ------------------------------------------------------ |
| `/companies`, `/companies/[id]`             | PLACEMENT_OFFICER | List + detail (POCs, hiring history)                   |
| `/jobs` (manage), `/jobs/new`, `/jobs/[id]` | PLACEMENT_OFFICER | Job CRUD, publish, eligible preview                    |
| `/jobs/[id]/pipeline`                       | PLACEMENT_OFFICER | Kanban board of applications by stage; drag to advance |
| `/applications/[id]`                        | PLACEMENT_OFFICER | Applicant detail, interview rounds, stage history      |
| `/me/jobs`                                  | STUDENT           | Eligible jobs feed + apply                             |
| `/me/applications`                          | STUDENT           | Applied jobs, interview timeline, offers               |
| `/dashboard` (PO funnel)                    | PLACEMENT_OFFICER | Applications / shortlisted / offers counts             |
| `/dashboard` (student)                      | STUDENT           | Active applications, upcoming interviews, offers       |

## Security Notes (Phase 3)

- Apply endpoint re-validates eligibility + deadline server-side (feed visibility is not authorization).
- Students can only read jobs they're eligible for and applications they own (no IDOR on `:id`).
- Stage transitions restricted to PLACEMENT_OFFICER and validated against the allowed-transition map.
- All company/job/application data tenant-scoped by JWT `collegeId`.
- Stage changes + offer events emitted for audit (Phase 5).

## Open Questions

1. **`REJECTED` / `WITHDRAWN` stages** added beyond the PRD's list — confirm wanted (recommended).
2. Can **already-PLACED** students apply to more jobs (dream/higher offers)? Default: **no** (one
   placement per student in V1). Flag if you want a configurable "placement policy" per college.
3. Multiple offers for one student across jobs — allowed simultaneously until one is accepted?
   Default: allowed to hold multiple `OFFER_RELEASED`, accepting one auto-closes others (configurable).

## Deliverable

- Placement Officers manage companies, POCs, and jobs.
- Publishing a job computes the eligible student set and notifies them (Phase 4 wires the send).
- Students see only eligible jobs, apply, and track their pipeline.
- Full ATS stage tracking with interview rounds and stage history.
- **End-to-end placement workflow operational.**
