import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { UserRole } from '@ellixr/shared';
import type { JwtPayload } from '@ellixr/shared';
import { CurrentUser, Roles } from '../../common/decorators';
import { JobsService } from './jobs.service';
import { ApplicationsService } from './applications.service';
import { ApplyDto, CreateJobDto, ListJobsQuery, UpdateJobDto } from './dto';

// No class-level @Roles: this controller mixes officer management routes and
// student feed/apply routes, each guarded with method-level @Roles.
@Controller('jobs')
export class JobsController {
  constructor(
    private readonly jobs: JobsService,
    private readonly applications: ApplicationsService,
  ) {}

  private collegeId(user: JwtPayload): string {
    if (!user.collegeId) throw new BadRequestException('No college context');
    return user.collegeId;
  }

  // GET /jobs — officer management list OR student eligible feed, by role.
  @Get()
  @Roles(UserRole.COLLEGE_ADMIN, UserRole.PLACEMENT_OFFICER, UserRole.STUDENT)
  async list(@CurrentUser() user: JwtPayload, @Query() query: ListJobsQuery) {
    if (user.role === UserRole.STUDENT) {
      return { data: await this.jobs.studentFeed(user.sub) };
    }
    const { items, meta } = await this.jobs.list(this.collegeId(user), query);
    return { data: items, meta };
  }

  @Post()
  @Roles(UserRole.COLLEGE_ADMIN, UserRole.PLACEMENT_OFFICER)
  async create(@CurrentUser() user: JwtPayload, @Body() dto: CreateJobDto) {
    return { data: await this.jobs.create(this.collegeId(user), user.sub, dto) };
  }

  @Get(':id')
  @Roles(UserRole.COLLEGE_ADMIN, UserRole.PLACEMENT_OFFICER, UserRole.STUDENT)
  async findOne(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    if (user.role === UserRole.STUDENT) {
      return { data: await this.jobs.studentJobDetail(user.sub, id) };
    }
    return { data: await this.jobs.findOne(this.collegeId(user), id) };
  }

  @Patch(':id')
  @Roles(UserRole.COLLEGE_ADMIN, UserRole.PLACEMENT_OFFICER)
  async update(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: UpdateJobDto,
  ) {
    return { data: await this.jobs.update(this.collegeId(user), id, dto) };
  }

  @Post(':id/publish')
  @Roles(UserRole.COLLEGE_ADMIN, UserRole.PLACEMENT_OFFICER)
  async publish(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return { data: await this.jobs.publish(this.collegeId(user), id) };
  }

  @Post(':id/close')
  @Roles(UserRole.COLLEGE_ADMIN, UserRole.PLACEMENT_OFFICER)
  async close(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return { data: await this.jobs.close(this.collegeId(user), id) };
  }

  @Get(':id/eligible-students')
  @Roles(UserRole.COLLEGE_ADMIN, UserRole.PLACEMENT_OFFICER)
  async eligibleStudents(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return { data: await this.jobs.eligibleStudents(this.collegeId(user), id) };
  }

  @Get(':id/applications')
  @Roles(UserRole.COLLEGE_ADMIN, UserRole.PLACEMENT_OFFICER)
  async pipeline(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return { data: await this.applications.pipeline(this.collegeId(user), id) };
  }

  @Post(':id/apply')
  @Roles(UserRole.STUDENT)
  async apply(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: ApplyDto,
  ) {
    return { data: await this.jobs.apply(user.sub, id, dto.formResponses) };
  }
}
