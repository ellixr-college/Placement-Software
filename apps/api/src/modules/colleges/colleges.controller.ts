import { Body, Controller, Get, Ip, Param, Patch, Post, Query } from '@nestjs/common';
import { UserRole } from '@ellixr/shared';
import type { JwtPayload } from '@ellixr/shared';
import { CurrentUser, Roles } from '../../common/decorators';
import { AuditService } from '../../common/audit.module';
import { CollegesService } from './colleges.service';
import { CreateCollegeDto, ResetAdminPasswordDto, UpdateCollegeDto } from './dto';

@Controller('colleges')
@Roles(UserRole.PLATFORM_ADMIN)
export class CollegesController {
  constructor(
    private readonly colleges: CollegesService,
    private readonly audit: AuditService,
  ) {}

  @Post()
  async create(@CurrentUser() actor: JwtPayload, @Body() dto: CreateCollegeDto, @Ip() ip: string) {
    const result = await this.colleges.create(dto);
    await this.audit.record(actor, {
      action: 'COLLEGE_CREATE',
      targetType: 'college',
      targetId: result.college.id,
      collegeId: result.college.id,
      metadata: { name: dto.name, slug: dto.slug, adminEmail: dto.adminEmail },
      ip,
    });
    return { data: result };
  }

  @Get()
  async list(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
  ) {
    const result = await this.colleges.list(Number(page) || 1, Number(limit) || 20, search);
    return {
      data: result.items,
      meta: { total: result.total, page: result.page, limit: result.limit },
    };
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return { data: await this.colleges.findOne(id) };
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateCollegeDto) {
    return { data: await this.colleges.update(id, dto) };
  }

  @Post(':id/reset-admin-password')
  async resetAdminPassword(
    @CurrentUser() actor: JwtPayload,
    @Param('id') id: string,
    @Body() dto: ResetAdminPasswordDto,
    @Ip() ip: string,
  ) {
    const result = await this.colleges.resetAdminPassword(id, dto.password);
    await this.audit.record(actor, {
      action: 'ADMIN_PASSWORD_RESET',
      targetType: 'user',
      targetId: result.adminId,
      collegeId: id,
      metadata: { adminEmail: result.adminEmail, passwordGenerated: result.passwordGenerated },
      ip,
    });
    return { data: result };
  }

  @Patch(':id/status')
  async setStatus(
    @CurrentUser() actor: JwtPayload,
    @Param('id') id: string,
    @Body('isActive') isActive: boolean,
    @Ip() ip: string,
  ) {
    const result = await this.colleges.setStatus(id, isActive);
    await this.audit.record(actor, {
      action: isActive ? 'COLLEGE_REACTIVATE' : 'COLLEGE_SUSPEND',
      targetType: 'college',
      targetId: id,
      collegeId: id,
      ip,
    });
    return { data: result };
  }
}
