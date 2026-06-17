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
import { CurrentUser, Roles } from '../../common/decorators';
import { InternshipsService } from './internships.service';
import { CreateInternshipDto, UpdateInternshipDto, VerifyInternshipDto } from './dto';

/** Officer/Admin: review and verify student internship records. */
@Controller('internships')
@Roles(UserRole.COLLEGE_ADMIN, UserRole.PLACEMENT_OFFICER)
export class InternshipsController {
  constructor(private readonly internships: InternshipsService) {}

  private collegeId(user: JwtPayload): string {
    if (!user.collegeId) throw new BadRequestException('No college context');
    return user.collegeId;
  }

  @Get()
  async list(@CurrentUser() user: JwtPayload, @Query('status') status?: string) {
    return { data: await this.internships.list(this.collegeId(user), status) };
  }

  @Get(':id')
  async get(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return { data: await this.internships.get(this.collegeId(user), id) };
  }

  @Patch(':id/verify')
  async verify(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: VerifyInternshipDto,
  ) {
    return { data: await this.internships.verify(this.collegeId(user), id, user.sub, dto) };
  }
}

/** Student: manage own internship submissions. */
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

  @Delete(':id')
  async remove(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return { data: await this.internships.removeOwn(user.sub, id) };
  }
}
