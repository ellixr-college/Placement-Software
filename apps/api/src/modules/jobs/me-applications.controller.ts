import { Controller, Get, Param, Post } from '@nestjs/common';
import { UserRole } from '@ellixr/shared';
import type { JwtPayload } from '@ellixr/shared';
import { CurrentUser, Roles } from '../../common/decorators';
import { ApplicationsService } from './applications.service';

// Student's own applications. Resolved from the JWT (user.sub → Student) — no
// :studentId, so students can only ever see their own pipeline (no IDOR).
@Controller('me/applications')
@Roles(UserRole.STUDENT)
export class MeApplicationsController {
  constructor(private readonly applications: ApplicationsService) {}

  @Get()
  async listMine(@CurrentUser() user: JwtPayload) {
    return { data: await this.applications.listMine(user.sub) };
  }

  @Post(':id/withdraw')
  async withdraw(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return { data: await this.applications.withdraw(user.sub, id) };
  }
}
