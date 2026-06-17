import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { UserRole } from '@ellixr/shared';
import type { JwtPayload } from '@ellixr/shared';
import { CurrentUser, Public, Roles } from '../../common/decorators';
import { AlumniService } from './alumni.service';
import {
  CreateAlumniDto,
  ListAlumniQuery,
  SelfRegisterAlumniDto,
  UpdateAlumniDto,
} from './dto';

@Controller('alumni')
@Roles(UserRole.COLLEGE_ADMIN, UserRole.PLACEMENT_OFFICER)
export class AlumniController {
  constructor(private readonly alumni: AlumniService) {}

  private collegeId(user: JwtPayload): string {
    if (!user.collegeId) throw new BadRequestException('No college context');
    return user.collegeId;
  }

  @Get()
  async list(@CurrentUser() user: JwtPayload, @Query() query: ListAlumniQuery) {
    const { items, meta } = await this.alumni.list(this.collegeId(user), query);
    return { data: items, meta };
  }

  @Get('stats')
  async stats(@CurrentUser() user: JwtPayload) {
    return { data: await this.alumni.stats(this.collegeId(user)) };
  }

  @Get(':id')
  async findOne(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return { data: await this.alumni.findOne(this.collegeId(user), id) };
  }

  @Post()
  async create(@CurrentUser() user: JwtPayload, @Body() dto: CreateAlumniDto) {
    return { data: await this.alumni.create(this.collegeId(user), dto) };
  }

  @Post(':id/approve')
  async approve(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return { data: await this.alumni.approve(this.collegeId(user), id) };
  }

  @Patch(':id')
  async update(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: UpdateAlumniDto,
  ) {
    return { data: await this.alumni.update(this.collegeId(user), id, dto) };
  }

  @Delete(':id')
  async remove(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return { data: await this.alumni.remove(this.collegeId(user), id) };
  }
}

/** Public alumni self-registration portal (no auth). Identified by college slug. */
@Controller('public/alumni')
export class PublicAlumniController {
  constructor(private readonly alumni: AlumniService) {}

  @Public()
  @Get(':slug')
  async college(@Param('slug') slug: string) {
    return { data: await this.alumni.publicCollege(slug) };
  }

  @Public()
  @Post(':slug/register')
  async register(@Param('slug') slug: string, @Body() dto: SelfRegisterAlumniDto) {
    return { data: await this.alumni.selfRegister(slug, dto) };
  }
}
