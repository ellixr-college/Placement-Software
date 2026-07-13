# Ellixr

Multi-tenant **Placement Intelligence & Career Success Platform** for colleges and universities.

- **Students** get a mobile-first / PWA experience.
- **Placement Officers, College Admins, Platform Admins** get a desktop web app.
- One coral theme, deny-by-default security, multi-tenant isolation by `collegeId`.

See [`docs/`](./docs) for the full plan: [overview](./docs/00-overview.md),
[design system](./docs/design-system.md), [role → modules](./docs/role-modules.md), and the five
phase documents.

## Stack

Next.js 15 · NestJS · Supabase Postgres · Prisma · Vercel Blob · pnpm + Turborepo.

## Structure

```text
apps/
  web/        Next.js 15 — both shells (mobile student + desktop admin)
  api/        NestJS REST API (/api/v1)
packages/
  shared/     enums, API envelope, zod schemas (FE + BE)
  auth/       RBAC constants, token TTLs, role→home routing
  database/   Prisma schema, client, seed
  ui/         coral Tailwind preset + base components
  storage/    Cloudflare R2 helpers (impl in Phase 2)
  notifications/ analytics/  (added in Phases 4–5)
```

## Getting Started

Prerequisites: Node ≥ 20, pnpm 9.

```bash
pnpm install

# 1. Configure env — ONE file holds every connection (DB, JWT, R2, Resend, web).
cp .env.example .env
# then edit .env and fill in the values.
# Prisma, the API, and the web app all read from this single root .env.

# 2. Database
pnpm db:generate         # generate Prisma client
pnpm db:migrate          # create tables (needs DATABASE_URL)
pnpm db:seed             # create the Platform Admin (from SEED_ADMIN_*)

# 3. Run everything (Turbo runs web + api)
pnpm dev
# web → http://localhost:3000   api → http://localhost:4000/api/v1
```

## Phase 1 status — done

Monorepo, multi-tenant foundation, JWT auth (rotating refresh cookie), RBAC, global security
(helmet, CORS, validation, throttling, deny-by-default guards), college onboarding, team
management, and both web shells with the coral theme. Phases 2–5 build on this — see the docs.

## Useful scripts

| Command          | What                        |
| ---------------- | --------------------------- |
| `pnpm dev`       | Run web + api in watch mode |
| `pnpm build`     | Build all packages/apps     |
| `pnpm typecheck` | Typecheck the workspace     |
| `pnpm db:studio` | Open Prisma Studio          |
