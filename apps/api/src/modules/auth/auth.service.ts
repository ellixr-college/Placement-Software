import { BadRequestException, Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import bcrypt from 'bcrypt';
import { createHash, randomBytes } from 'crypto';
import { PASSWORD_RESET_TTL } from '@ellixr/auth';
import type { JwtPayload } from '@ellixr/shared';
import { PRISMA } from '../../common/prisma.module';
import type { PrismaClient } from '@ellixr/database';
import { TokenService } from './token.service';

@Injectable()
export class AuthService {
  constructor(
    @Inject(PRISMA) private readonly prisma: PrismaClient,
    private readonly tokens: TokenService,
    private readonly config: ConfigService,
  ) {}

  async validateUser(email: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user || !user.isActive) throw new UnauthorizedException('Invalid credentials');
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) throw new UnauthorizedException('Invalid credentials');
    return user;
  }

  async login(email: string, password: string) {
    const user = await this.validateUser(email, password);
    const payload: JwtPayload = { sub: user.id, collegeId: user.collegeId, role: user.role };
    const accessToken = await this.tokens.signAccessToken(payload);
    const refreshToken = await this.tokens.issueRefreshToken(user.id);
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });
    return { accessToken, refreshToken, user: this.publicUser(user) };
  }

  async refresh(rawRefresh: string) {
    const rotated = await this.tokens.rotateRefreshToken(rawRefresh);
    if (!rotated) throw new UnauthorizedException('Invalid refresh token');
    const user = await this.prisma.user.findUnique({ where: { id: rotated.userId } });
    if (!user || !user.isActive) throw new UnauthorizedException('Account inactive');
    const payload: JwtPayload = { sub: user.id, collegeId: user.collegeId, role: user.role };
    const accessToken = await this.tokens.signAccessToken(payload);
    return { accessToken, refreshToken: rotated.token, user: this.publicUser(user) };
  }

  async logout(rawRefresh?: string) {
    if (rawRefresh) await this.tokens.revokeRefreshToken(rawRefresh);
    return { success: true };
  }

  /** Always returns success to avoid leaking which emails exist. */
  async forgotPassword(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (user && user.isActive) {
      const raw = randomBytes(32).toString('hex');
      const tokenHash = createHash('sha256').update(raw).digest('hex');
      await this.prisma.passwordResetToken.create({
        data: {
          userId: user.id,
          tokenHash,
          expiresAt: new Date(Date.now() + PASSWORD_RESET_TTL * 1000),
        },
      });
      // Phase 4: send `raw` via Resend. For now, log in dev only.
      if (this.config.get('NODE_ENV') === 'development') {
        // eslint-disable-next-line no-console
        console.log(`[dev] password reset token for ${email}: ${raw}`);
      }
    }
    return { success: true };
  }

  async resetPassword(rawToken: string, newPassword: string) {
    const tokenHash = createHash('sha256').update(rawToken).digest('hex');
    const record = await this.prisma.passwordResetToken.findFirst({
      where: { tokenHash, usedAt: null, expiresAt: { gt: new Date() } },
    });
    if (!record) throw new UnauthorizedException('Invalid or expired reset token');

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await this.prisma.$transaction([
      this.prisma.user.update({ where: { id: record.userId }, data: { passwordHash } }),
      this.prisma.passwordResetToken.update({
        where: { id: record.id },
        data: { usedAt: new Date() },
      }),
    ]);
    // Invalidate existing sessions on password change.
    await this.tokens.revokeAllForUser(record.userId);
    return { success: true };
  }

  /**
   * Self-service password change. Used for the forced first-login change after a
   * Placement Officer registers a student with a temporary password. Clears the
   * `mustChangePassword` flag; the current session stays valid.
   */
  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException();
    const ok = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!ok) throw new BadRequestException('Current password is incorrect');
    if (await bcrypt.compare(newPassword, user.passwordHash)) {
      throw new BadRequestException('New password must differ from the current one');
    }
    const passwordHash = await bcrypt.hash(newPassword, 12);
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash, mustChangePassword: false },
    });
    return { success: true };
  }

  async me(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { college: { select: { id: true, name: true, slug: true, logoUrl: true } } },
    });
    if (!user) throw new UnauthorizedException();
    return { ...this.publicUser(user), college: user.college };
  }

  private publicUser(user: {
    id: string;
    email: string;
    fullName: string;
    role: string;
    collegeId: string | null;
    avatarUrl: string | null;
    mustChangePassword: boolean;
    isCollegeHead: boolean;
  }) {
    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      collegeId: user.collegeId,
      avatarUrl: user.avatarUrl,
      mustChangePassword: user.mustChangePassword,
      isCollegeHead: user.isCollegeHead,
    };
  }
}
