import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PRISMA } from '../../common/prisma.module';
import type { NotificationType, PrismaClient } from '@ellixr/database';

export interface NotifyParams {
  userId: string;
  collegeId?: string | null;
  type: NotificationType;
  title: string;
  body?: string;
  link?: string;
}

/**
 * In-app notification feed. `notify*` helpers are called by other modules after
 * a domain action succeeds — they never throw into the caller (a failed
 * notification must not roll back the action that triggered it). Read APIs are
 * always scoped to the authenticated user's own id (no cross-user access).
 */
@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(@Inject(PRISMA) private readonly prisma: PrismaClient) {}

  /** Create one notification for a single recipient. Best-effort. */
  async notify(params: NotifyParams): Promise<void> {
    try {
      await this.prisma.notification.create({
        data: {
          userId: params.userId,
          collegeId: params.collegeId ?? null,
          type: params.type,
          title: params.title,
          body: params.body,
          link: params.link,
        },
      });
    } catch (err) {
      this.logger.error(`Failed to create notification for ${params.userId}`, err as Error);
    }
  }

  /** Fan a notification out to every College Admin + Placement Officer of a college. */
  async notifyOfficers(
    collegeId: string,
    params: Omit<NotifyParams, 'userId' | 'collegeId'>,
  ): Promise<void> {
    try {
      const officers = await this.prisma.user.findMany({
        where: {
          collegeId,
          role: { in: ['COLLEGE_ADMIN', 'PLACEMENT_OFFICER'] },
          isActive: true,
        },
        select: { id: true },
      });
      if (officers.length === 0) return;
      await this.prisma.notification.createMany({
        data: officers.map((o) => ({
          userId: o.id,
          collegeId,
          type: params.type,
          title: params.title,
          body: params.body,
          link: params.link,
        })),
      });
    } catch (err) {
      this.logger.error(`Failed to notify officers of ${collegeId}`, err as Error);
    }
  }

  // ─────────────── Recipient-facing reads (own only) ───────────────

  async list(userId: string, opts: { unreadOnly?: boolean; page?: number; limit?: number }) {
    const page = opts.page ?? 1;
    const limit = Math.min(opts.limit ?? 20, 50);
    const where = { userId, ...(opts.unreadOnly ? { readAt: null } : {}) };

    const [total, unread, items] = await this.prisma.$transaction([
      this.prisma.notification.count({ where }),
      this.prisma.notification.count({ where: { userId, readAt: null } }),
      this.prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return {
      items,
      meta: { total, unread, page, limit, pages: Math.ceil(total / limit) },
    };
  }

  async unreadCount(userId: string) {
    const unread = await this.prisma.notification.count({ where: { userId, readAt: null } });
    return { unread };
  }

  async markRead(userId: string, id: string) {
    // Scope the update by userId so a user can only mark their own as read.
    const result = await this.prisma.notification.updateMany({
      where: { id, userId, readAt: null },
      data: { readAt: new Date() },
    });
    if (result.count === 0) {
      // Either it doesn't exist, isn't theirs, or was already read.
      const exists = await this.prisma.notification.findFirst({
        where: { id, userId },
        select: { id: true },
      });
      if (!exists) throw new NotFoundException('Notification not found');
    }
    return { success: true };
  }

  async markAllRead(userId: string) {
    const result = await this.prisma.notification.updateMany({
      where: { userId, readAt: null },
      data: { readAt: new Date() },
    });
    return { success: true, marked: result.count };
  }
}
