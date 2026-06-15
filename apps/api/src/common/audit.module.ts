import { Global, Inject, Injectable, Module } from '@nestjs/common';
import { PRISMA } from './prisma.module';
import type { PrismaClient } from '@ellixr/database';
import type { JwtPayload } from '@ellixr/shared';

export interface AuditEntry {
  action: string;
  targetType?: string;
  targetId?: string;
  metadata?: Record<string, unknown>;
  /** collegeId override (defaults to the actor's). */
  collegeId?: string | null;
  ip?: string;
}

/**
 * Append-only audit trail for privileged actions and PII exports. Writes are
 * best-effort and never throw into the request path — an audit failure must not
 * break the user's action.
 */
@Injectable()
export class AuditService {
  constructor(@Inject(PRISMA) private readonly prisma: PrismaClient) {}

  async record(actor: JwtPayload, entry: AuditEntry): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          collegeId: entry.collegeId !== undefined ? entry.collegeId : actor.collegeId,
          actorId: actor.sub,
          actorRole: actor.role,
          action: entry.action,
          targetType: entry.targetType,
          targetId: entry.targetId,
          metadata: entry.metadata as never,
          ip: entry.ip,
        },
      });
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[audit] failed to write entry', entry.action, err);
    }
  }
}

@Global()
@Module({
  providers: [AuditService],
  exports: [AuditService],
})
export class AuditModule {}
