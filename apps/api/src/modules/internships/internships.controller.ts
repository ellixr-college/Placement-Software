import { BadRequestException, Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { UserRole } from '@ellixr/shared';
import type { JwtPayload } from '@ellixr/shared';
import { CurrentUser, Roles } from '../../common/decorators';
import { InternshipsService } from './internships.service';
import { CreateInternshipDto, UpdateInternshipDto } from './dto';

/** Officer/Admin: view student-reported internships (read-only, grouped by batch
 * in the UI). Students self-report; there is no verification step. */
@Controller('internships')
@Roles(UserRole.COLLEGE_ADMIN, UserRole.PLACEMENT_OFFICER)
export class InternshipsController {
  constructor(private readonly internships: InternshipsService) {}

  private collegeId(user: JwtPayload): string {
    if (!user.collegeId) throw new BadRequestException('No college context');
    return user.collegeId;
  }

  @Get()
  async list(@CurrentUser() user: JwtPayload) {
    return { data: await this.internships.list(this.collegeId(user)) };
  }
}

/** Student: manage own internship submissions (create/edit only; no delete). */
@Controller('me/internships')
@Roles(UserRole.STUDENT)
export class MeInternshipsController {
  constructor(private readonly internships: InternshipsService) {}

  @Get()
  async list(@CurrentUser() user: JwtPayload) {
    return { data: await this.internships.listOwn(user.sub) };
  }

  @Post()
  async create(@CurrentUser() user: JwtPayload, @Body() dto: CreateInternshipDto) {
    return { data: await this.internships.createOwn(user.sub, dto) };
  }

  @Patch(':id')
  async update(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: UpdateInternshipDto,
  ) {
    return { data: await this.internships.updateOwn(user.sub, id, dto) };
  }
}
