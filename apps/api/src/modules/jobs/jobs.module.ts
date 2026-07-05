import { Module } from '@nestjs/common';
import { JobsController } from './jobs.controller';
import { PlatformJobsController } from './platform-jobs.controller';
import { MeApplicationsController } from './me-applications.controller';
import { ApplicationsController } from './applications.controller';
import { RoundsController } from './rounds.controller';
import { JobsService } from './jobs.service';
import { ApplicationsService } from './applications.service';
import { RoundsService } from './rounds.service';

@Module({
  // RoundsController first so its specific 'jobs/rounds/pending' + 'jobs/:jobId/funnel'
  // routes resolve ahead of the generic 'jobs/:id' handler.
  controllers: [
    RoundsController,
    JobsController,
    PlatformJobsController,
    MeApplicationsController,
    ApplicationsController,
  ],
  providers: [JobsService, ApplicationsService, RoundsService],
})
export class JobsModule {}
