import { BadRequestException, Body, Controller, Get, Param, Put } from '@nestjs/common';
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

  // Officer/admin: view any of their college's students' resumes (uncompleted too).
  @Get('students/:studentId/resume')
  @Roles(UserRole.PLACEMENT_OFFICER, UserRole.COLLEGE_ADMIN)
  async getForStudent(@CurrentUser() user: JwtPayload, @Param('studentId') studentId: string) {
    if (!user.collegeId) throw new BadRequestException('No college context');
    return { data: await this.resumes.getForOfficer(user.collegeId, studentId) };
  }
}
