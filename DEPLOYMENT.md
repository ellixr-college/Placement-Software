# Ellixr — Deployment (Free Stack)

Host the whole app for **$0/month**. Three pieces, tied together by the same-origin
BFF proxy (the browser only ever talks to the web origin; Next.js forwards
`/api/v1/*` to the API server-side, so the auth cookie stays first-party).

| Piece | Host | Cost | Catch |
|---|---|---|---|
| Database | **CockroachDB Cloud** (Basic/free) | $0 | 50M Request Units/month free |
| API (NestJS) | **Render** free Web Service | $0, no card | sleeps after ~15 min idle (cold start ~30–50s) |
| Web (Next.js) | **Vercel** Hobby | $0, no card | none |

Config files in this repo: [`render.yaml`](render.yaml) (API), [`apps/web/vercel.json`](apps/web/vercel.json) (web).
Pre-flight requirements live in [`SECURITY.md`](SECURITY.md).

---

## Step 1 — Database (CockroachDB Cloud)

1. Use your existing cluster (or create a free Basic one). **Connect → General connection string** → copy it (`...sslmode=verify-full`).
2. From your machine, point the root `.env` `DATABASE_URL` at the **production** cluster, then create the schema + first admin **once**:
   ```bash
   pnpm db:push     # creates all tables (incl. audit_logs)
   pnpm db:seed     # creates the Platform Admin from SEED_ADMIN_* in .env
   ```
3. Keep the cluster's spend limit at **$0** so it pauses (never bills) if you ever exceed the free 50M RU.

> Tip: for day-to-day local dev, run CockroachDB locally so cloud RUs are only spent by real traffic:
> `docker run -d -p 26257:26257 cockroachdb/cockroach start-single-node --insecure`
> then `DATABASE_URL="postgresql://root@localhost:26257/defaultdb?sslmode=disable"`.

## Step 2 — API → Render

1. Render Dashboard → **New → Blueprint** → select this repo. It reads [`render.yaml`](render.yaml) and creates the `ellixr-api` web service (free plan, Singapore region — closest to the Mumbai DB).
2. The blueprint **generates** `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` for you. Set the two `sync:false` vars in the dashboard:
   - `DATABASE_URL` → the production CockroachDB string
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
| `DATABASE_URL` | prod CockroachDB string |
| `WEB_ORIGIN` | the Vercel URL |
| `PORT` | injected by Render |

**Web (Vercel)**
| Var | Value |
|---|---|
| `API_PROXY_TARGET` | the Render API URL |
| `NEXT_PUBLIC_API_URL` | `/api/v1` |

## Keeping it free & fast

- **Cold starts:** Render free sleeps after ~15 min idle. To keep it warm, add a free cron at **cron-job.org** hitting `https://<api>/api/v1/health` every 10 min (fits within Render's ~750 free instance-hours/month).
- **DB Request Units:** the notification bell polls **hourly**, **pauses while the tab is hidden**, and **goes quiet 8pm–6am**, so idle tabs barely touch the DB. The other big RU spenders are **schema pushes** and `prisma db push --force-reset` (full wipe) — avoid running those against the cloud cluster casually; use a local cluster for dev.
- **HTTPS** is on by default on both Vercel and Render — required by `COOKIE_SECURE=true`.
