import { Controller, Get } from '@nestjs/common';
import { UserRole } from '@ellixr/shared';
import { Roles } from '../../common/decorators';
import { AnalyticsService } from './analytics.service';

/**
 * Cross-college analytics for the Platform Admin dashboard. PLATFORM_ADMIN only;
 * intentionally NOT tenant-scoped (aggregates over every college).
 */
@Controller('platform/analytics')
@Roles(UserRole.PLATFORM_ADMIN)
export class PlatformAnalyticsController {
  constructor(private readonly analytics: AnalyticsService) {}

  @Get('overview')
  async overview() {
    return { data: await this.analytics.platformOverview() };
  }
}
