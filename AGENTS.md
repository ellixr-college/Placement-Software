# Ellixr — Agent Guide

This file is for AI coding agents working on the Ellixr Placement Intelligence & Career Success Platform. It assumes you know nothing about the repo. Use it alongside the planning docs in [`docs/`](./docs) and the root [`README.md`](./README.md).

---

## 1. Project Overview

Ellixr is a multi-tenant SaaS platform for colleges and universities to manage placements, recruiters, jobs, student applications, interviews, alumni, analytics, and reports.

- **Students** use a mobile-first / PWA shell (`/me/*`).
- **Placement Officers, College Admins, and Platform Admins** use a desktop web shell (`/dashboard`, `/students`, `/jobs`, `/platform/*`, etc.).
- Both shells live in a single Next.js app and share one auth session and one component library.
- Multi-tenancy is row-level isolation via a `collegeId` column on tenant-scoped tables. The Platform Admin has `collegeId = null`.
- Security model is **deny-by-default**: every frontend and backend route requires authentication and an explicit role, except a tiny public allowlist.
- All documentation, code comments, and commit messages are in English.

---

## 2. Technology Stack

| Layer      | Choice                                                                                                                            |
| ---------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Monorepo   | pnpm 9.12.0 workspaces + Turborepo 2.1.3                                                                                          |
| Node       | >= 20                                                                                                                             |
| Frontend   | Next.js 15 (App Router), React 18, TypeScript 5.6, Tailwind CSS 3.4                                                               |
| Backend    | NestJS 10 modular monolith, REST API under `/api/v1`                                                                              |
| Database   | Supabase Postgres (`provider = "postgresql"` in Prisma)                                                                           |
| ORM        | Prisma 5.20                                                                                                                       |
| Validation | `class-validator` + `class-transformer` DTOs on API; zod schemas in `packages/shared`                                             |
| Storage    | Vercel Blob (`@vercel/blob`) for PDFs/resumes in current code; Cloudflare R2 stub lives in `packages/storage` but is not wired up |
| Email      | Deferred in V1; per-college SMTP planned for Phase 4                                                                              |
| Deployment | Render (API) + Vercel (web), see `render.yaml` and `apps/web/vercel.json`                                                         |

---

## 3. Repository Structure

```text
.
├── apps/
│   ├── api/               NestJS REST API
│   └── web/               Next.js 15 app (student + admin shells)
├── packages/
│   ├── auth/              Shared auth constants (roles, TTLs, cookie name, home paths)
│   ├── database/          Prisma schema, seed, singleton client
│   ├── shared/            Shared enums, zod schemas, API envelope types, validation helpers
│   ├── storage/           Dormant R2/S3 storage interface stub
│   └── ui/                Shared Tailwind preset + base React components
├── docs/                  Planning documents (overview, design system, role modules, phases 1–5)
├── scripts/               Utility scripts (currently empty)
├── .env.example           Single source of env docs
├── turbo.json             Turborepo task graph
├── pnpm-workspace.yaml    Workspace definition
├── tsconfig.base.json     Shared TypeScript base
└── render.yaml            Render Blueprint for the API
```

### Key app files

| Concern                       | File                                                                           |
| ----------------------------- | ------------------------------------------------------------------------------ |
| API entry                     | `apps/api/src/main.ts`                                                         |
| API root module               | `apps/api/src/app.module.ts`                                                   |
| API global guards             | `apps/api/src/common/guards/*.ts`                                              |
| API request/response envelope | `apps/api/src/common/interceptors.ts`                                          |
| API decorators                | `apps/api/src/common/decorators.ts`                                            |
| Prisma schema                 | `packages/database/prisma/schema.prisma`                                       |
| Seed script                   | `packages/database/prisma/seed.ts`                                             |
| Web middleware                | `apps/web/middleware.ts`                                                       |
| Web BFF proxy                 | `apps/web/next.config.mjs`                                                     |
| Web fetch wrapper             | `apps/web/lib/api.ts`                                                          |
| Web session provider          | `apps/web/lib/session.tsx`                                                     |
| Shared auth constants         | `packages/auth/src/index.ts`                                                   |
| Shared zod schemas            | `packages/shared/src/auth.schemas.ts`, `packages/shared/src/resume.schemas.ts` |
| UI preset                     | `packages/ui/tailwind-preset.ts`                                               |

### How packages are consumed

All `packages/*` export TypeScript source directly from `src/index.ts` (no build step). The NestJS API bundles `@ellixr/*` workspace packages into its webpack output via a custom config (`apps/api/webpack.config.js`). Next.js transpiles the packages listed in `transpilePackages` in `apps/web/next.config.mjs`.

| Package            | `apps/api`                         | `apps/web`                       |
| ------------------ | ---------------------------------- | -------------------------------- |
| `@ellixr/auth`     | guards, decorators, auth module    | login redirect, middleware       |
| `@ellixr/database` | services/controllers/Prisma client | —                                |
| `@ellixr/shared`   | DTOs, roles, validation, types     | forms, validation, resume, roles |
| `@ellixr/ui`       | —                                  | components + Tailwind preset     |
| `@ellixr/storage`  | —                                  | — (dormant)                      |

### API module organization

Feature modules live under `apps/api/src/modules/`:

- `auth` — login, refresh, logout, forgot/reset/change password, `/me`
- `users` — college staff (placement officers/admins) management
- `colleges` — platform-admin college lifecycle, subscriptions, reset admin password
- `students` — student CRUD, import, verification, graduation, self-service profile
- `resumes` — student resume builder, public résumé link, officer preview
- `companies` — recruiter directory, contacts, hiring history
- `courses` — college course/branch catalog
- `jobs` — job postings, applications, ATS funnel, rounds, placements
- `analytics` — college dashboards + platform-wide overview
- `reports` — CSV/XLSX exports
- `notifications` — in-app notification feed, unread counts
- `alumni` — alumni CRM + public self-registration portal
- `internships` — student internship reporting
- `health` — public health check (`/api/v1/health`)

Each module typically contains `{module,controller,service,dto}.ts`.

### Web route organization

Next.js App Router with three route groups:

- `(public)` — unauthenticated pages: `/login`, `/forgot-password`, `/reset-password/[token]`, `/alumni-register/[slug]`
- `(student)` — mobile student shell: `/me`, `/me/jobs`, `/me/applications`, `/me/internships`, `/me/notifications`, `/me/profile`, `/me/resume`, etc.
- `(admin)` — desktop admin/officer shell: `/dashboard`, `/platform/*`, `/students`, `/companies`, `/jobs`, `/applications`, `/analytics`, `/reports`, `/alumni`, `/notifications`, `/settings/team`
- `/r/[slug]` — public résumé capability pages, outside all groups

---

## 4. Build, Test, and Development Commands

Run all commands from the repository root.

```bash
# Install dependencies
pnpm install

# Configure environment (one root .env for everything)
cp .env.example .env
# edit .env and fill in values

# Database setup
pnpm db:generate          # generate Prisma client
pnpm db:migrate           # create tables via Prisma Migrate (dev, needs DATABASE_URL)
pnpm db:push              # push schema without migrations (currently used in practice)
pnpm db:seed              # create the Platform Admin from SEED_ADMIN_*
pnpm db:studio            # open Prisma Studio

# Run web + api in watch mode
pnpm dev
# web → http://localhost:3000
# api → http://localhost:4000/api/v1

# Build everything
pnpm build

# Lint everything
pnpm lint

# Typecheck everything
pnpm typecheck

# Format code
pnpm format
```

### Package-specific scripts

- `apps/api`: `build`, `dev`, `start`, `lint`, `typecheck`
- `apps/web`: `dev`, `build`, `start`, `lint`, `typecheck`
- `packages/database`: `generate`, `push`, `migrate`, `migrate:deploy`, `seed`, `studio`, `typecheck`
- `packages/shared`: `lint`, `typecheck`
- `packages/auth`, `packages/ui`, `packages/storage`: `typecheck`

### Important notes

- The project uses `prisma db push` in practice; migration files do not currently exist under `packages/database/prisma/migrations`.
- pnpm is configured with `node-linker=hoisted` (see `.npmrc`) so the bundled API and Prisma client resolve correctly on deploy.
- The Prisma Client generator in `packages/database/prisma/schema.prisma` pins `output = "../../../node_modules/.prisma/client"` so the generated client always lands in the monorepo root. If you move the schema file, update that relative path.
- The NestJS build uses a custom webpack config (`apps/api/webpack.config.js`) that bundles `@ellixr/*` workspace packages but keeps all other dependencies external.
- There are no automated tests in the repository (see Section 6).

---

## 5. Code Style Guidelines

### Formatting

Prettier config (`.prettierrc`):

```json
{
  "semi": true,
  "singleQuote": true,
  "trailingComma": "all",
  "printWidth": 100,
  "tabWidth": 2
}
```

Run `pnpm format` to format `**/*.{ts,tsx,md,json}`.

### TypeScript

- Base config: `tsconfig.base.json`
  - `target: ES2022`
  - `module: ESNext`
  - `moduleResolution: Bundler`
  - `strict: true`
  - `noUncheckedIndexedAccess: true`
  - `isolatedModules: true`
- API override: CommonJS, Node resolution, decorators enabled, `outDir: ./dist`.
- Web override: DOM libs, JSX preserve, Next plugin, path alias `@/*`.

### Naming and organization

- Prisma models: PascalCase; tables/columns mapped to `snake_case` via `@@map` / `@map`.
- Every tenant-scoped table has `collegeId`, `createdAt`, `updatedAt`.
- Soft-delete via `isActive` rather than hard delete where possible.
- UUID v4 primary keys throughout.
- API endpoints return a standard envelope:
  - Success: `{ data: ..., meta: {...} }` (paginated lists include `meta.total`, `meta.page`, `meta.limit`)
  - Error: `{ error: { code, message, details? } }`
- Controllers handle HTTP concerns; services handle business logic and Prisma queries.

### Linting

- Root: `pnpm lint` runs `turbo run lint`.
- API: `eslint "src/**/*.ts" --max-warnings 0`
- `packages/shared`: `eslint src --max-warnings 0`
- There is **no committed ESLint config file** in the repo root or packages; the lint scripts rely on a default or uncommitted config. Running lint may fail in a fresh checkout if ESLint config is missing.

---

## 6. Testing Instructions

**There are currently no automated tests in this repository.**

- No `*.test.ts`, `*.test.tsx`, `*.spec.ts`, or `*.spec.tsx` files exist under `apps/` or `packages/`.
- No Jest, Vitest, or Playwright configuration exists.
- The only test files anywhere are dependency tests inside `packages/*/node_modules`.

If you add tests, follow the existing package structure and add the corresponding script to the relevant `package.json` and root `turbo.json`.

---

## 7. Authentication and Multi-Tenancy

### Authentication flow

- **Access token**: JWT, 15-minute TTL (`ACCESS_TOKEN_TTL = 15 * 60`), signed with `JWT_ACCESS_SECRET`. Payload: `{ sub, collegeId, role }`. Sent in `Authorization: Bearer` header and held in browser memory only (never `localStorage`).
- **Refresh token**: opaque random token (48 bytes hex), SHA-256 hashed at rest, single-use and rotated on every refresh, 30-day TTL, delivered as `httpOnly`, `Secure` (when `COOKIE_SECURE=true`), `SameSite=Strict` cookie named `ellixr_rt`. Reuse of a rotated token outside a short grace window revokes the whole session family (theft containment).
- **Password reset tokens** are single-use, expiring (1 hour), and SHA-256 hashed.
- **Sessions are revoked** on logout, password change/reset, user deactivation, and college suspension.

### Multi-tenant scoping

- Tenant isolation is enforced in the API layer, not by DB RLS.
- `collegeId` comes only from the verified JWT (`req.user.collegeId`), never from client input.
- Every tenant-scoped Prisma query includes `where: { collegeId }`.
- Platform Admin (`collegeId === null`) uses separate controllers and never touches tenant data tables directly.
- Cross-tenant access attempts should return 404 (not 403) to avoid confirming record existence.

### RBAC

Roles (from `packages/shared/src/enums.ts`):

- `PLATFORM_ADMIN` — global, manages colleges and subscriptions
- `COLLEGE_ADMIN` — own college, team management + oversight
- `PLACEMENT_OFFICER` — own college, operational driver
- `STUDENT` — self-service, mobile shell

Enforcement:

- API: global `JwtAuthGuard` (registered in `AppModule` via `APP_GUARD`) → `IdentityThrottlerGuard` → `RolesGuard` + `@Roles(...)` + `@Public()`.
- Web: `apps/web/middleware.ts` checks a routing-only `ellixr_role` cookie and redirects unauthenticated or wrong-shell users.

---

## 8. Security Considerations

Read [`SECURITY.md`](./SECURITY.md) before any production deployment.

### Must-do production checklist

| Variable              | Dev                     | Production                       |
| --------------------- | ----------------------- | -------------------------------- |
| `NODE_ENV`            | `development`           | `production`                     |
| `COOKIE_SECURE`       | `false`                 | `true`                           |
| `JWT_ACCESS_SECRET`   | any                     | unique 48+ byte random           |
| `JWT_REFRESH_SECRET`  | any                     | different unique 48+ byte random |
| `WEB_ORIGIN`          | `http://localhost:3000` | exact deployed origin            |
| `DATABASE_URL`        | local/cloud             | cloud, `sslmode=require`         |
| `SEED_ADMIN_PASSWORD` | weak ok                 | strong, rotate after first login |

### Already enforced in code

- Deny-by-default global guards.
- bcrypt cost factor 12.
- `helmet` and CORS locked to `WEB_ORIGIN` with credentials.
- Global `ValidationPipe` with `whitelist: true, forbidNonWhitelisted: true, transform: true`.
- Rate limiting via `@nestjs/throttler`:
  - Default: `THROTTLE_LIMIT=600` requests per `THROTTLE_TTL=60000ms` per identity.
  - Login: 10/min per email.
  - Forgot password: 3/min per email.
  - Reset password: 5/min per email.
  - Identity-aware throttling in `apps/api/src/common/guards/identity-throttler.guard.ts` keys on user id → email → refresh cookie → IP, so a campus NAT does not throttle all students at once.
- Audit logging for privileged actions and PII exports (`AuditLog` model + `AuditService`).
- No `dangerouslySetInnerHTML` or `eval` sinks for user content.

### Accepted risks (documented, intentionally not changed)

- Public résumé links use an unguessable `publicSlug` and have no time-based expiry; revocation is by toggling `isPublished`.
- Emails are globally unique, so "Email already in use" can reveal an email exists somewhere on the platform.

### Gaps to be aware of

- Email delivery is deferred; treat password/temp-password sharing as a manual, sensitive step.
- The `ellixr_role` cookie used by Next.js middleware is client-readable and used for routing only; real authorization is re-checked API-side.
- No CI/CD, dependency scanning, or automated security scanning is currently configured.
- `@nestjs/throttler` stores counters in memory, so per-identity limits are per server instance. If you horizontally scale the API, move to a shared Redis store.

---

## 9. Deployment

The free deployment stack is documented in [`DEPLOYMENT.md`](./DEPLOYMENT.md).

| Piece    | Host                          | Config file            |
| -------- | ----------------------------- | ---------------------- |
| Database | Supabase Postgres (free tier) | `.env` `DATABASE_URL`  |
| API      | Render free Web Service       | `render.yaml`          |
| Web      | Vercel Hobby                  | `apps/web/vercel.json` |

### Render build/start (from `render.yaml`)

```bash
NODE_ENV=development pnpm install --frozen-lockfile && pnpm --filter @ellixr/database generate && pnpm --filter @ellixr/api build
node apps/api/dist/main.js
```

### Vercel build (from `apps/web/vercel.json`)

```bash
pnpm install --frozen-lockfile
pnpm --filter @ellixr/web build
```

### BFF proxy

The web app proxies `/api/v1/*` to the API server-side so the browser stays same-origin and the refresh cookie remains first-party. See `apps/web/next.config.mjs`:

```js
async rewrites() {
  return [{ source: '/api/v1/:path*', destination: `${API_PROXY_TARGET}/api/v1/:path*` }];
}
```

`API_PROXY_TARGET` is server-only; `NEXT_PUBLIC_API_URL` defaults to `/api/v1`.

---

## 10. Known Discrepancies Between Docs and Code

When reading `docs/`, be aware the implementation has diverged in places:

| Topic         | Docs say        | Code does                                                          |
| ------------- | --------------- | ------------------------------------------------------------------ |
| Database      | PostgreSQL/Neon | Supabase Postgres (`provider = "postgresql"`)                      |
| API hosting   | Railway         | Render                                                             |
| Storage       | Cloudflare R2   | Vercel Blob (`@vercel/blob`); `packages/storage` is a dormant stub |
| Email         | Resend          | Deferred; per-college SMTP planned                                 |
| Theme palette | Coral/peach     | Blue/cool-gray (`packages/ui/tailwind-preset.ts`)                  |
| Border radius | 24px/16px cards | Uniform 10px                                                       |
| ESLint config | —               | Scripts exist but no committed config file                         |
| Migrations    | —               | None committed; project uses `prisma db push`                      |
| Tests         | —               | None exist                                                         |

Always trust the actual code, not the planning docs, when making changes.

---

## 11. Quick Reference: Most Important Files for Common Tasks

| Task                             | Start here                                                        |
| -------------------------------- | ----------------------------------------------------------------- |
| Add an API endpoint              | `apps/api/src/modules/<feature>/`                                 |
| Change auth behavior             | `apps/api/src/modules/auth/`, `packages/auth/src/index.ts`        |
| Change database schema           | `packages/database/prisma/schema.prisma`, then `pnpm db:generate` |
| Add a shared type/schema         | `packages/shared/src/`                                            |
| Add a UI primitive               | `packages/ui/src/`                                                |
| Change route protection          | `apps/web/middleware.ts`                                          |
| Change how the web calls the API | `apps/web/lib/api.ts`                                             |
| Change theme/colors              | `packages/ui/tailwind-preset.ts`                                  |
| Change production build/deploy   | `render.yaml`, `apps/web/vercel.json`, `apps/web/next.config.mjs` |

---

## 12. Communication and Documentation Language

All project documentation, comments, and commit messages are in English. Keep it that way.
