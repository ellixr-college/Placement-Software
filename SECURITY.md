# Ellixr — Security Notes & Production Hardening Checklist

This documents the security model and the **must-do steps before any non-local
deployment**. The biggest real-world risk is misconfiguration, not the code.

## Production environment checklist (do ALL of these)

| Variable | Dev | **Production** | Why it matters |
|---|---|---|---|
| `NODE_ENV` | `development` | **`production`** | In dev, password-reset tokens are printed to the server log (`auth.service.ts`). In prod this MUST be off or reset tokens leak into logs → account takeover. |
| `COOKIE_SECURE` | `false` | **`true`** | Marks the refresh cookie `Secure` so it is only sent over HTTPS. If false on a real domain, the refresh token can be intercepted on plain HTTP. |
| `JWT_ACCESS_SECRET` | any | **unique 48+ byte random** | `openssl rand -base64 48`. Never reuse the refresh secret or a placeholder. |
| `JWT_REFRESH_SECRET` | any | **different unique 48+ byte random** | Must differ from the access secret. |
| `WEB_ORIGIN` | `http://localhost:3000` | **exact deployed web origin** | CORS allowlist. Credentials require an exact origin (no wildcard). |
| `DATABASE_URL` | local/cloud | cloud, `sslmode=verify-full` | TLS to the DB. |
| `SEED_ADMIN_PASSWORD` | weak ok | **strong, rotated after first login** | Seeds the Platform Admin. Change it immediately after first login. |

Also:
- **Serve everything over HTTPS / TLS.** The refresh cookie (`SameSite=strict`) and Bearer access tokens assume a secure transport.
- **`.env` is gitignored** — never commit real secrets. Only `.env.example` (placeholders) is tracked.
- Keep the web app's BFF proxy same-origin (`NEXT_PUBLIC_API_URL="/api/v1"`) so the refresh cookie stays first-party.

## What is already enforced in code

- **Deny-by-default**: global `JwtAuthGuard` + `RolesGuard` (APP_GUARD). Every route needs a valid JWT and an explicit role unless marked `@Public()`.
- **Multi-tenant isolation**: `collegeId` is always taken from the verified JWT, never from the request body. Cross-tenant analytics is `PLATFORM_ADMIN`-only.
- **Tokens**: access JWT ~15m (in browser memory, not localStorage). Refresh token is opaque, **SHA-256 hashed at rest, single-use, rotating, expiring**, in an `httpOnly + SameSite=strict + Secure` cookie. Reuse of a rotated token revokes the whole session family (theft containment).
- **Sessions revoked** on password change/reset, user deactivation, and college suspension.
- **Passwords**: bcrypt cost 12. Forgot-password is anti-enumeration (always returns success); reset tokens are hashed, single-use, expiring.
- **Rate limiting**: global 100 req/min + tighter on auth (login 5/min, forgot-password 3/min).
- **Input validation**: global `ValidationPipe` (`whitelist` + `forbidNonWhitelisted` + `transform`); shared email/phone validators on DTOs.
- **Headers**: `helmet`. **CORS** locked to `WEB_ORIGIN` with credentials.
- **Audit log**: privileged actions and PII exports are recorded (see `AuditLog` model / `AuditService`).
- **No XSS sink**: user content (résumés) renders through React (auto-escaped); no `dangerouslySetInnerHTML`/`eval`.

## Accepted observations (reviewed, intentionally not changed)

From the 2026-06-14 tenant-isolation audit (result: clean — every tenant query is
scoped by JWT `collegeId`, every `:id` mutation is guarded before a bare
`where:{id}` write). Two low-severity items were reviewed and **accepted as-is**:

- **Public résumé links have no expiry** — *needed for now.* A résumé is shared via
  an unguessable capability URL (~72-bit `publicSlug`) and only renders when
  `isPublished`. There is no time-based expiry; revocation is by toggling
  `isPublished` off. Acceptable for the shareable-link feature; revisit if links
  ever need TTL/rotation.
- **Cross-tenant email enumeration** — *no concern.* Emails are globally unique, so
  "Email already in use" reveals an email exists somewhere on the platform (not
  which college). Accepted; could switch to a generic message later.

## Known gaps / roadmap (track these)

- **Email delivery deferred** — credentials/reset links are shown once in the UI and shared out-of-band. Until per-college email sending lands, treat temp-password sharing as a manual, sensitive step.
- **`ellixr_role` routing cookie is client-readable** — used by the Next.js middleware for routing only; all authorization is re-checked server-side. Hardening: move auth behind the BFF proxy so role is never client-trusted.
- **Dependency scanning** — add `npm audit` / Dependabot (or equivalent) to CI to catch vulnerable transitive deps.
- **Audit-log coverage** — currently logs the highest-value events (PII exports, user/role management, student verification, college lifecycle). Extend to more reads as compliance needs grow.
- Production observability (Sentry) and a cron scheduler are Phase 5.

## Reporting

Security-relevant data here is student PII (names, emails, phones, CGPA, offers).
Handle exports accordingly and keep the audit trail.
