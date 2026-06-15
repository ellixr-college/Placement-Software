import { Body, Controller, Get, Param, Put } from '@nestjs/common';
import { UserRole } from '@ellixr/shared';
import type { JwtPayload } from '@ellixr/shared';
import { CurrentUser, Public, Roles } from '../../common/decorators';
import { ResumesService } from './resumes.service';
import { UpdateResumeDto } from './dto';

// No class-level @Roles: the public render route must stay open. Student routes
// carry method-level @Roles(STUDENT).
@Controller()
export class ResumesController {
  constructor(private readonly resumes: ResumesService) {}

  @Get('me/resume')
  @Roles(UserRole.STUDENT)
  async getMine(@CurrentUser() user: JwtPayload) {
    return { data: await this.resumes.getMine(user.sub) };
  }

  @Put('me/resume')
  @Roles(UserRole.STUDENT)
  async updateMine(@CurrentUser() user: JwtPayload, @Body() dto: UpdateResumeDto) {
    return { data: await this.resumes.updateMine(user.sub, dto) };
  }

  @Get('public/resumes/:slug')
  @Public()
  async getPublic(@Param('slug') slug: string) {
    return { data: await this.resumes.getPublic(slug) };
  }
}
