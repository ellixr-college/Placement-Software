import { Body, Controller, Get, Patch, Post } from '@nestjs/common';
import { UserRole } from '@ellixr/shared';
import type { JwtPayload } from '@ellixr/shared';
import { CurrentUser, Roles } from '../../common/decorators';
import { StudentsService } from './students.service';
import { UpdateOwnProfileDto } from './dto';

/**
 * Student self-service. Every route resolves the Student row from the
 * authenticated user's JWT (user.sub → Student.userId) — there is no :id, so a
 * student can only ever read/write their own record (no IDOR).
 */
@Controller('me/student')
@Roles(UserRole.STUDENT)
export class MeStudentController {
  constructor(private readonly students: StudentsService) {}

  @Get()
  async getOwn(@CurrentUser() user: JwtPayload) {
    return { data: await this.students.getOwn(user.sub) };
  }

  @Patch('profile')
  async updateProfile(@CurrentUser() user: JwtPayload, @Body() dto: UpdateOwnProfileDto) {
    return { data: await this.students.updateOwnProfile(user.sub, dto) };
  }

  @Post('submit')
  async submit(@CurrentUser() user: JwtPayload) {
    return { data: await this.students.submitOwn(user.sub) };
  }
}
