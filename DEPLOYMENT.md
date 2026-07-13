# Ellixr — Deployment (Free Stack)

Host the whole app for **$0/month**. Three pieces, tied together by the same-origin
BFF proxy (the browser only ever talks to the web origin; Next.js forwards
`/api/v1/*` to the API server-side, so the auth cookie stays first-party).

| Piece         | Host                              | Cost        | Catch                                          |
| ------------- | --------------------------------- | ----------- | ---------------------------------------------- |
| Database      | **Supabase Postgres** (free tier) | $0          | 500 MB storage / 60 connections                |
| API (NestJS)  | **Render** free Web Service       | $0, no card | sleeps after ~15 min idle (cold start ~30–50s) |
| Web (Next.js) | **Vercel** Hobby                  | $0, no card | none                                           |

Config files in this repo: [`render.yaml`](render.yaml) (API), [`apps/web/vercel.json`](apps/web/vercel.json) (web).
Pre-flight requirements live in [`SECURITY.md`](SECURITY.md).

---

## Step 1 — Database (Supabase Postgres)

1. Create a free Supabase project at [supabase.com](https://supabase.com). Pick a region close to your users (e.g. `ap-south-1` / Mumbai).
2. Project Settings → Database → Connection string → **URI**. Copy the Postgres URI.
3. Paste it into the root `.env` as `DATABASE_URL`. Add these query params if they are not already in the URI:
   - `sslmode=require`
   - `connection_limit=3`
   - `pool_timeout=10`
     Example:
   ```
   DATABASE_URL="postgresql://postgres:PASSWORD@db.xxxxx.supabase.co:5432/postgres?sslmode=require&connection_limit=3&pool_timeout=10"
   ```
4. From your machine, create the schema + first admin **once**:
   ```bash
   pnpm db:push     # creates all tables (incl. audit_logs)
   pnpm db:seed     # creates the Platform Admin from SEED_ADMIN_* in .env
   ```

> Tip: for day-to-day local dev you can keep using the same Supabase project, or run Postgres locally with Docker:
> `docker run -d -p 5432:5432 -e POSTGRES_PASSWORD=postgres postgres:16`
> then `DATABASE_URL="postgresql://postgres:postgres@localhost:5432/postgres?schema=public"`.

## Step 2 — API → Render

1. Render Dashboard → **New → Blueprint** → select this repo. It reads [`render.yaml`](render.yaml) and creates the `ellixr-api` web service (free plan, Singapore region — closest to the Mumbai DB).
2. The blueprint **generates** `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` for you. Set the two `sync:false` vars in the dashboard:
   - `DATABASE_URL` → the production Supabase Postgres URI
   - `WEB_ORIGIN` → leave blank for now; fill in after Step 3
3. Deploy. Note the API URL, e.g. `https://ellixr-api.onrender.com`. Confirm `https://ellixr-api.onrender.com/api/v1/health` returns `{ "data": ... }`.

Build/start (already in the blueprint):

- Build: `corepack enable && pnpm install --frozen-lockfile && pnpm --filter @ellixr/database generate && pnpm --filter @ellixr/api build`
- Start: `node apps/api/dist/main.js`

## Step 3 — Web → Vercel

1. Vercel → **Add New → Project** → import this repo.
2. **Root Directory: `apps/web`** (Vercel detects the pnpm workspace and Next.js).
3. Environment variables:
   - `API_PROXY_TARGET` → the Render API URL from Step 2 (the proxy + résumé page forward here)
   - `NEXT_PUBLIC_API_URL` → `/api/v1`
4. Deploy. Note the URL, e.g. `https://ellixr.vercel.app`.

## Step 4 — Tie them together

1. Back in **Render** → set `WEB_ORIGIN` = the Vercel URL → save (redeploys the API).
2. Open the Vercel URL → log in as the seeded Platform Admin. Done. 🎉

---

## Production env var reference

**API (Render)**
| Var | Value |
|---|---|
| `NODE_ENV` | `production` |
| `COOKIE_SECURE` | `true` |
| `JWT_ACCESS_SECRET` | generated (48+ byte random) |
| `JWT_REFRESH_SECRET` | generated, **different** |
| `DATABASE_URL` | prod Supabase Postgres URI |
| `WEB_ORIGIN` | the Vercel URL |
| `PORT` | injected by Render |

**Web (Vercel)**
| Var | Value |
|---|---|
| `API_PROXY_TARGET` | the Render API URL |
| `NEXT_PUBLIC_API_URL` | `/api/v1` |

## Keeping it free & fast

- **Cold starts:** Render free sleeps after ~15 min idle. To keep it warm, add a free cron at **cron-job.org** hitting `https://<api>/api/v1/health` every 10 min (fits within Render's ~750 free instance-hours/month).
- **DB connections:** Supabase free gives ~60 connections. The app caps Prisma to 3 per instance (`connection_limit=3`), so one API instance uses very few. If you ever scale horizontally, keep total instances × 3 well under 60.
- **Storage:** JD PDFs, offer letters, and résumés are stored as **public** Vercel Blobs. Access is gated by the app — the URLs are unguessable.
- **HTTPS** is on by default on both Vercel and Render — required by `COOKIE_SECURE=true`.

## Rate limiting & scaling out

- Rate limits are **per identity, not per IP** (user → login email → refresh cookie → IP), because a college NATs hundreds of students through a single public IP. Tune via env: `THROTTLE_LIMIT` (default 600/min per identity) and `THROTTLE_TTL` (default 60000ms). Login is capped separately at 10/min **per email**.
- ⚠️ **Multi-instance caveat:** `@nestjs/throttler` counts **in memory**, so the limits above are per-server-instance. This is fine on Render free (one instance). **If you ever run more than one API instance** (horizontal scaling / autoscaling), each instance counts independently — the effective limit multiplies and brute-force protection weakens. Before scaling out, move the throttler to a **shared Redis store** (e.g. `@nest-lab/throttler-storage-redis`) in `ThrottlerModule`. Not needed until then.
