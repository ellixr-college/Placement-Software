import { Module } from '@nestjs/common';
import { AnalyticsController } from './analytics.controller';
import { PlatformAnalyticsController } from './platform-analytics.controller';
import { AnalyticsService } from './analytics.service';

@Module({
  controllers: [AnalyticsController, PlatformAnalyticsController],
  providers: [AnalyticsService],
})
export class AnalyticsModule {}
