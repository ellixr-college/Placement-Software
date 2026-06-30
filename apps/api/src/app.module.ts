import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { JwtModule } from '@nestjs/jwt';
import { PrismaModule } from './common/prisma.module';
import { AuditModule } from './common/audit.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { CollegesModule } from './modules/colleges/colleges.module';
import { StudentsModule } from './modules/students/students.module';
import { ResumesModule } from './modules/resumes/resumes.module';
import { CompaniesModule } from './modules/companies/companies.module';
import { CoursesModule } from './modules/courses/courses.module';
import { JobsModule } from './modules/jobs/jobs.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { ReportsModule } from './modules/reports/reports.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { AlumniModule } from './modules/alumni/alumni.module';
import { TrainingModule } from './modules/training/training.module';
import { InternshipsModule } from './modules/internships/internships.module';
import { HealthController } from './modules/health/health.controller';

@Module({
  imports: [
    // Reads the single root .env (../../.env) first, then any local apps/api/.env override.
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ['../../.env', '.env'] }),
    // Per-IP rate limit. Env-tunable so we can loosen it for a classroom/demo
    // where many students hit login at once. Requires `trust proxy` (see main.ts)
    // so the limiter keys on each client's real IP, not the upstream proxy's.
    ThrottlerModule.forRoot([
      {
        ttl: Number(process.env.THROTTLE_TTL) || 60_000,
        limit: Number(process.env.THROTTLE_LIMIT) || 600,
      },
    ]),
    // The global JwtAuthGuard (APP_GUARD) is resolved in AppModule context,
    // so JwtService must be available here too.
    JwtModule.register({}),
    PrismaModule,
    AuditModule,
    AuthModule,
    UsersModule,
    CollegesModule,
    StudentsModule,
    ResumesModule,
    CompaniesModule,
    CoursesModule,
    JobsModule,
    AnalyticsModule,
    ReportsModule,
    NotificationsModule,
    AlumniModule,
    TrainingModule,
    InternshipsModule,
  ],
  controllers: [HealthController],
  providers: [
    // Order matters: throttler → auth (sets req.user) → roles.
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
