# Phase 2 — Student Lifecycle Management

[← Phase 1](./01-foundation-auth.md) | [Overview](./00-overview.md) | Next: [Phase 3 →](./03-companies-jobs-ats.md)

## Goal

Manage students end-to-end: onboarding (individual + bulk CSV), rich profiles, resume uploads to
Cloudflare R2, verification workflow, and profile-completion tracking. Introduces the **Student**
role's self-service experience.

## Scope

- Student records + structured profile (academics, skills, projects, certifications)
- Resume upload to R2 with version history (`packages/storage` built here)
- Bulk CSV import with validation + error reporting
- Student verification workflow (Placement Officer verifies submitted profiles)
- Placement Officer + Student dashboards (counts, completion %)
- Student self-service profile editing

## Database Schema (Prisma)

```prisma
enum StudentStatus {
  REGISTERED      // account created, profile incomplete
  VERIFIED        // profile verified by placement officer
  PLACED          // accepted/joined an offer (set in Phase 3 via ATS)
  NOT_PLACED      // graduated without placement
}

enum VerificationStatus {
  PENDING
  SUBMITTED       // student submitted profile for review
  VERIFIED
  REJECTED        // sent back for corrections (with reason)
}

model Student {
  id                 String   @id @default(uuid())
  collegeId          String
  userId             String   @unique   // links to User (role = STUDENT)
  rollNumber         String
  enrollmentNumber   String?
  course             String              // e.g. "B.Tech"
  branch             String              // e.g. "Computer Science"
  graduationYear     Int
  cgpa               Decimal? @db.Decimal(4, 2)
  activeBacklogs     Int      @default(0)
  totalBacklogs      Int      @default(0)
  status             StudentStatus      @default(REGISTERED)
  verificationStatus VerificationStatus @default(PENDING)
  verifiedById       String?
  verifiedAt         DateTime?
  rejectionReason    String?
  profileCompletion  Int      @default(0)   // 0-100, recomputed on profile change
  isActive           Boolean  @default(true)
  createdAt          DateTime @default(now())
  updatedAt          DateTime @updatedAt

  profile            StudentProfile?
  skills             StudentSkill[]
  projects           StudentProject[]
  certifications     StudentCertification[]
  resumes            Resume[]

  @@unique([collegeId, rollNumber])
  @@index([collegeId, status])
  @@index([collegeId, branch, graduationYear])
  @@map("students")
}

model StudentProfile {
  id              String   @id @default(uuid())
  studentId       String   @unique
  dateOfBirth     DateTime?
  gender          String?
  phone           String?
  alternateEmail  String?
  address         String?
  city            String?
  state           String?
  tenthPercentage Decimal? @db.Decimal(5, 2)
  twelfthPercentage Decimal? @db.Decimal(5, 2)
  linkedinUrl     String?
  githubUrl       String?
  portfolioUrl    String?
  bio             String?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  student         Student  @relation(fields: [studentId], references: [id], onDelete: Cascade)

  @@map("student_profiles")
}

model StudentSkill {
  id        String   @id @default(uuid())
  studentId String
  name      String
  level     String?  // Beginner / Intermediate / Advanced
  student   Student  @relation(fields: [studentId], references: [id], onDelete: Cascade)

  @@index([studentId])
  @@map("student_skills")
}

model StudentProject {
  id          String   @id @default(uuid())
  studentId   String
  title       String
  description String?
  techStack   String?
  url         String?
  student     Student  @relation(fields: [studentId], references: [id], onDelete: Cascade)

  @@index([studentId])
  @@map("student_projects")
}

model StudentCertification {
  id          String   @id @default(uuid())
  studentId   String
  name        String
  issuer      String?
  issueDate   DateTime?
  credentialUrl String?
  student     Student  @relation(fields: [studentId], references: [id], onDelete: Cascade)

  @@index([studentId])
  @@map("student_certifications")
}

model Resume {
  id         String   @id @default(uuid())
  studentId  String
  collegeId  String
  fileName   String
  r2Key      String   // object key in Cloudflare R2
  fileSize   Int
  mimeType   String
  version    Int      // increments per upload
  isPrimary  Boolean  @default(false)
  createdAt  DateTime @default(now())

  student    Student  @relation(fields: [studentId], references: [id], onDelete: Cascade)

  @@index([studentId])
  @@map("resumes")
}
```

> **Decision (see overview §10.4):** "Applying" / "Interviewing" are **not** stored on `Student.status`
> — they are derived from active `Application` records in Phase 3. This avoids dual sources of truth.

## Resume Storage Flow (Cloudflare R2)

`packages/storage` provides presigned-URL helpers so files never transit the API server:

1. **Upload**: client requests `POST /resumes/presign` → API validates MIME (`application/pdf`,
   `.docx`) + size (≤ 5 MB), generates a scoped object key
   (`colleges/{collegeId}/students/{studentId}/resumes/{uuid}.pdf`), returns a short-lived presigned
   PUT URL.
2. Client uploads directly to R2, then calls `POST /resumes` with the key to create the `Resume`
   row (version auto-increments; new upload becomes `isPrimary`).
3. **Download/preview**: `GET /resumes/:id/url` returns a short-lived presigned GET URL.

## API Endpoints

| Method | Path                             | Roles                            | Description                                             |
| ------ | -------------------------------- | -------------------------------- | ------------------------------------------------------- |
| POST   | `/api/v1/students`               | PLACEMENT_OFFICER                | Create a single student (also creates STUDENT user)     |
| POST   | `/api/v1/students/import`        | PLACEMENT_OFFICER                | Bulk CSV import (multipart)                             |
| GET    | `/api/v1/students/import/:jobId` | PLACEMENT_OFFICER                | Import job status + row-level error report              |
| GET    | `/api/v1/students`               | PLACEMENT_OFFICER, COLLEGE_ADMIN | List/search/filter (branch, year, status, verification) |
| GET    | `/api/v1/students/:id`           | PLACEMENT_OFFICER, COLLEGE_ADMIN | Student detail                                          |
| PATCH  | `/api/v1/students/:id`           | PLACEMENT_OFFICER                | Edit academic fields                                    |
| POST   | `/api/v1/students/:id/verify`    | PLACEMENT_OFFICER                | Verify (→ VERIFIED) or reject (→ REJECTED + reason)     |
| GET    | `/api/v1/me/student`             | STUDENT                          | Own student record + profile                            |
| PATCH  | `/api/v1/me/student/profile`     | STUDENT                          | Update own profile/skills/projects/certs                |
| POST   | `/api/v1/me/student/submit`      | STUDENT                          | Submit profile for verification                         |
| POST   | `/api/v1/resumes/presign`        | STUDENT, PLACEMENT_OFFICER       | Get presigned upload URL                                |
| POST   | `/api/v1/resumes`                | STUDENT, PLACEMENT_OFFICER       | Register uploaded resume                                |
| GET    | `/api/v1/resumes/:id/url`        | STUDENT (own), PLACEMENT_OFFICER | Presigned download URL                                  |
| GET    | `/api/v1/students/:id/resumes`   | PLACEMENT_OFFICER                | Resume version history                                  |

All endpoints are tenant-scoped via the JWT `collegeId`. Students can only ever read/write their
**own** record (enforced server-side by matching `request.user.sub` to `Student.userId`).

## Bulk CSV Import Design

- Template columns: `rollNumber, fullName, email, course, branch, graduationYear, cgpa,
activeBacklogs, phone`.
- Validation: required fields, email format/uniqueness, numeric ranges (cgpa 0–10, year sane),
  duplicate `rollNumber` within college.
- Processed row-by-row; result returns `{ created, skipped, errors: [{ row, field, message }] }`.
- Creates both `Student` and linked `User` (STUDENT role) with a temporary password + welcome
  email trigger (welcome email itself wired up in Phase 4; Phase 2 can stub or queue it).
- Large files processed via the R2 upload pattern (upload CSV to R2, process async) to avoid
  request timeouts; status pollable via the import status endpoint.

## UI Screens

| Route                          | Access                           | Notes                                                                      |
| ------------------------------ | -------------------------------- | -------------------------------------------------------------------------- |
| `/students`                    | PLACEMENT_OFFICER, COLLEGE_ADMIN | Table: search, filters (branch/year/status), pagination                    |
| `/students/new`                | PLACEMENT_OFFICER                | Add single student form                                                    |
| `/students/import`             | PLACEMENT_OFFICER                | CSV upload, template download, error report view                           |
| `/students/[id]`               | PLACEMENT_OFFICER, COLLEGE_ADMIN | Detail: profile, resumes, verify/reject actions                            |
| `/me/profile`                  | STUDENT                          | Multi-section profile editor (personal, academic, skills, projects, certs) |
| `/me/resume`                   | STUDENT                          | Upload resume, view version history, set primary                           |
| `/dashboard` (PO widgets)      | PLACEMENT_OFFICER                | Total / verified / pending / avg profile completion                        |
| `/dashboard` (student widgets) | STUDENT                          | Profile completion %, resume status, verification status                   |

## Profile Completion Logic

`profileCompletion` recomputed on every profile mutation — weighted checklist, e.g.: personal
details (20%), academic details (20%), ≥3 skills (15%), ≥1 project (15%), ≥1 certification (10%),
primary resume uploaded (20%). Drives student dashboard nudges and PO reporting.

## Security Notes (Phase 2)

- Resume MIME/size validated **before** issuing presigned URL; R2 keys namespaced per college+student.
- Presigned URLs short-lived (e.g. 5 min) and single-object scoped.
- Student endpoints hard-scope to the authenticated user's own `studentId` — no IDOR via `:id`.
- CSV import sanitizes/validates every field; emails de-duplicated against existing users.
- All mutations that change verification status are audited (audit_logs land in Phase 5; emit events now).

## Open Questions

1. **`Student.status` enum** simplified to `REGISTERED / VERIFIED / PLACED / NOT_PLACED` — confirm
   you don't need "Eligible" stored (it's job-specific and computed in Phase 3).
2. Should students **self-register** (with PO approval) or are accounts **only** created by PO /
   bulk import? Current assumption: **PO/bulk-only** in V1 (no public student signup).
3. Resume file types: PDF only, or PDF + DOCX? Assumed **PDF + DOCX**, 5 MB cap.

## Deliverable

- 1000+ students onboardable per college (single + bulk CSV).
- Students complete profiles and upload resumes (versioned, in R2).
- Placement Officers verify/reject profiles with reasons.
- Dashboards show live counts and profile-completion metrics.
