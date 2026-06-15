import { Controller, Get, HttpCode, Param, Post, Query } from '@nestjs/common';
import type { JwtPayload } from '@ellixr/shared';
import { CurrentUser } from '../../common/decorators';
import { NotificationsService } from './notifications.service';

/**
 * The signed-in user's own notification feed. No class-level @Roles — every
 * authenticated role has a feed — and every handler scopes to user.sub, so a
 * user can only ever read/modify their own notifications.
 */
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get()
  async list(
    @CurrentUser() user: JwtPayload,
    @Query('unreadOnly') unreadOnly?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const { items, meta } = await this.notifications.list(user.sub, {
      unreadOnly: unreadOnly === 'true',
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
    return { data: items, meta };
  }

  @Get('unread-count')
  async unreadCount(@CurrentUser() user: JwtPayload) {
    return { data: await this.notifications.unreadCount(user.sub) };
  }

  @Post(':id/read')
  @HttpCode(200)
  async markRead(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return { data: await this.notifications.markRead(user.sub, id) };
  }

  @Post('read-all')
  @HttpCode(200)
  async markAllRead(@CurrentUser() user: JwtPayload) {
    return { data: await this.notifications.markAllRead(user.sub) };
  }
}
