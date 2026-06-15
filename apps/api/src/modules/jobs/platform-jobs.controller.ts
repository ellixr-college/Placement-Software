import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { UserRole } from '@ellixr/shared';
import type { JwtPayload } from '@ellixr/shared';
import { CurrentUser, Roles } from '../../common/decorators';
import { JobsService } from './jobs.service';
import { CreatePlatformJobDto, ListJobsQuery, UpdatePlatformJobDto } from './dto';

// Platform-Admin-only management of cross-college broadcast jobs. These appear in
// the eligible feed of every targeted college's students; each college manages
// its own applicants via the normal officer pipeline (tenant-scoped).
@Controller('platform/jobs')
@Roles(UserRole.PLATFORM_ADMIN)
export class PlatformJobsController {
  constructor(private readonly jobs: JobsService) {}

  @Get()
  async list(@Query() query: ListJobsQuery) {
    const { items, meta } = await this.jobs.listPlatform(query);
    return { data: items, meta };
  }

  @Post()
  async create(@CurrentUser() user: JwtPayload, @Body() dto: CreatePlatformJobDto) {
    return { data: await this.jobs.createPlatform(user.sub, dto) };
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return { data: await this.jobs.findOnePlatform(id) };
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdatePlatformJobDto) {
    return { data: await this.jobs.updatePlatform(id, dto) };
  }

  @Post(':id/publish')
  async publish(@Param('id') id: string) {
    return { data: await this.jobs.publishPlatform(id) };
  }

  @Post(':id/close')
  async close(@Param('id') id: string) {
    return { data: await this.jobs.closePlatform(id) };
  }
}
