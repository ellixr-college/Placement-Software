import { Module } from '@nestjs/common';
import { JobsController } from './jobs.controller';
import { PlatformJobsController } from './platform-jobs.controller';
import { MeApplicationsController } from './me-applications.controller';
import { ApplicationsController } from './applications.controller';
import { JobsService } from './jobs.service';
import { ApplicationsService } from './applications.service';

@Module({
  controllers: [
    JobsController,
    PlatformJobsController,
    MeApplicationsController,
    ApplicationsController,
  ],
  providers: [JobsService, ApplicationsService],
})
export class JobsModule {}
