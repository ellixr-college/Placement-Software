import { BadRequestException, Controller, Get } from '@nestjs/common';
import { UserRole } from '@ellixr/shared';
import type { JwtPayload } from '@ellixr/shared';
import { CurrentUser, Roles } from '../../common/decorators';
import { AnalyticsService } from './analytics.service';

@Controller('analytics')
@Roles(UserRole.COLLEGE_ADMIN, UserRole.PLACEMENT_OFFICER)
export class AnalyticsController {
  constructor(private readonly analytics: AnalyticsService) {}

  private collegeId(user: JwtPayload): string {
    if (!user.collegeId) throw new BadRequestException('No college context');
    return user.collegeId;
  }

  @Get('placement')
  async placement(@CurrentUser() user: JwtPayload) {
    return { data: await this.analytics.placement(this.collegeId(user)) };
  }

  @Get('jobs')
  async jobs(@CurrentUser() user: JwtPayload) {
    return { data: await this.analytics.jobs(this.collegeId(user)) };
  }

  @Get('students')
  async students(@CurrentUser() user: JwtPayload) {
    return { data: await this.analytics.students(this.collegeId(user)) };
  }

  @Get('funnel')
  async funnel(@CurrentUser() user: JwtPayload) {
    return { data: await this.analytics.funnel(this.collegeId(user)) };
  }

  @Get('breakdowns')
  async breakdowns(@CurrentUser() user: JwtPayload) {
    return { data: await this.analytics.breakdowns(this.collegeId(user)) };
  }
}
