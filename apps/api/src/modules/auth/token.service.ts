import { Inject, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { randomBytes, createHash } from 'crypto';
import { ACCESS_TOKEN_TTL, REFRESH_TOKEN_TTL } from '@ellixr/auth';
import type { JwtPayload } from '@ellixr/shared';
import { PRISMA } from '../../common/prisma.module';
import type { PrismaClient } from '@ellixr/database';

// A just-rotated token may legitimately be presented once more within this window
// (e.g. two browser tabs refreshing at once). Replays older than this indicate
// theft and trigger full session revocation.
const REFRESH_REUSE_GRACE_MS = 30_000;

@Injectable()
export class TokenService {
  constructor(
    @Inject(PRISMA) private readonly prisma: PrismaClient,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async signAccessToken(payload: JwtPayload): Promise<string> {
    return this.jwt.signAsync(payload, {
      secret: this.config.getOrThrow<string>('JWT_ACCESS_SECRET'),
      expiresIn: ACCESS_TOKEN_TTL,
    });
  }

  /** Issues a new opaque refresh token, stores its hash, returns the raw token. */
  async issueRefreshToken(userId: string): Promise<string> {
    const raw = randomBytes(48).toString('hex');
    const tokenHash = this.hash(raw);
    await this.prisma.refreshToken.create({
      data: {
        userId,
        tokenHash,
        expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL * 1000),
      },
    });
    return raw;
  }

  /** Validates a refresh token, rotates it (revoke old + issue new), returns userId + new token. */
  async rotateRefreshToken(raw: string): Promise<{ userId: string; token: string } | null> {
    const tokenHash = this.hash(raw);
    const record = await this.prisma.refreshToken.findFirst({ where: { tokenHash } });
    if (!record) return null; // unknown token

    // Reuse/theft detection: an already-rotated (revoked) token is being presented
    // again. A benign multi-tab race re-presents it within milliseconds, so only
    // treat replays older than the grace window as theft — then revoke the whole
    // session family (containment). Either way this stale token is rejected.
    if (record.revokedAt) {
      if (Date.now() - record.revokedAt.getTime() > REFRESH_REUSE_GRACE_MS) {
        await this.revokeAllForUser(record.userId);
      }
      return null;
    }
    if (record.expiresAt <= new Date()) return null; // expired

    // Valid → rotate (single-use).
    await this.prisma.refreshToken.update({
      where: { id: record.id },
      data: { revokedAt: new Date() },
    });
    const token = await this.issueRefreshToken(record.userId);
    return { userId: record.userId, token };
  }

  async revokeRefreshToken(raw: string): Promise<void> {
    const tokenHash = this.hash(raw);
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async revokeAllForUser(userId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  private hash(value: string): string {
    return createHash('sha256').update(value).digest('hex');
  }
}
