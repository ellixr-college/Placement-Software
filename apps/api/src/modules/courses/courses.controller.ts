import { BadRequestException, Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { UserRole } from '@ellixr/shared';
import type { JwtPayload } from '@ellixr/shared';
import { CurrentUser, Roles } from '../../common/decorators';
import { CoursesService } from './courses.service';
import { CreateCourseDto, UpdateCourseDto } from './dto';

/** Tenant read: the caller's own college catalog (to populate student/job forms). */
@Controller('courses')
@Roles(UserRole.COLLEGE_ADMIN, UserRole.PLACEMENT_OFFICER)
export class CoursesController {
  constructor(private readonly courses: CoursesService) {}

  @Get()
  async list(@CurrentUser() user: JwtPayload) {
    if (!user.collegeId) throw new BadRequestException('No college context');
    return { data: await this.courses.listForCollege(user.collegeId) };
  }
}

/** Platform Admin: manage a college's course catalog. */
@Controller('colleges/:collegeId/courses')
@Roles(UserRole.PLATFORM_ADMIN)
export class CollegeCoursesController {
  constructor(private readonly courses: CoursesService) {}

  @Get()
  async list(@Param('collegeId') collegeId: string) {
    return { data: await this.courses.listForCollege(collegeId) };
  }

  @Post()
  async create(@Param('collegeId') collegeId: string, @Body() dto: CreateCourseDto) {
    return { data: await this.courses.create(collegeId, dto) };
  }

  @Patch(':id')
  async update(
    @Param('collegeId') collegeId: string,
    @Param('id') id: string,
    @Body() dto: UpdateCourseDto,
  ) {
    return { data: await this.courses.update(collegeId, id, dto) };
  }

  @Delete(':id')
  async remove(@Param('collegeId') collegeId: string, @Param('id') id: string) {
    return { data: await this.courses.remove(collegeId, id) };
  }
}
