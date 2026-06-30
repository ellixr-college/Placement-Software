import { ExecutionContext, Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { REFRESH_COOKIE_NAME } from '@ellixr/auth';

/**
 * Rate-limit per identity, not per IP.
 *
 * A whole college NATs through one or a few public IPs, so an IP-based limit
 * throttles every student at once the moment a class logs in together. We key on:
 *   1. the authenticated user (per-account limit — the common case), else
 *   2. the login email in the request body (so 800 students on one campus IP get
 *      800 separate buckets, while a single account is still brute-force capped), else
 *   3. the real client IP (proxy-corrected via `trust proxy`).
 *
 * Requires JwtAuthGuard to run BEFORE this guard so `req.user` is populated.
 */
@Injectable()
export class IdentityThrottlerGuard extends ThrottlerGuard {
  protected async getTracker(
    req: Record<string, unknown> & {
      user?: { sub?: string };
      body?: { email?: unknown };
      cookies?: Record<string, string>;
      ips?: string[];
      ip?: string;
    },
    _context?: ExecutionContext,
  ): Promise<string> {
    if (req.user?.sub) return `user:${req.user.sub}`;
    const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    if (email) return `email:${email}`;
    // Unauthenticated refresh carries no email — key per session cookie so 800
    // students refreshing behind one campus IP don't share a bucket.
    const rt = req.cookies?.[REFRESH_COOKIE_NAME];
    if (typeof rt === 'string' && rt) return `rt:${rt.slice(0, 24)}`;
    const ip = Array.isArray(req.ips) && req.ips.length ? req.ips[0] : req.ip;
    return `ip:${ip ?? 'unknown'}`;
  }
}
