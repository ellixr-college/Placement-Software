import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Ip,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { UserRole } from '@ellixr/shared';
import type { JwtPayload } from '@ellixr/shared';
import { CurrentUser, Roles } from '../../common/decorators';
import { AuditService } from '../../common/audit.module';
import { UsersService } from './users.service';
import { CreateUserDto, UpdateUserDto } from './dto';

@Controller('users')
@Roles(UserRole.COLLEGE_ADMIN)
export class UsersController {
  constructor(
    private readonly users: UsersService,
    private readonly audit: AuditService,
  ) {}

  private collegeId(user: JwtPayload): string {
    if (!user.collegeId) throw new BadRequestException('No college context');
    return user.collegeId;
  }

  @Post()
  async create(@CurrentUser() user: JwtPayload, @Body() dto: CreateUserDto, @Ip() ip: string) {
    const result = await this.users.create(this.collegeId(user), dto);
    await this.audit.record(user, {
      action: 'USER_CREATE',
      targetType: 'user',
      targetId: result.user.id,
      metadata: { email: dto.email, role: dto.role, passwordGenerated: result.passwordGenerated },
      ip,
    });
    return { data: result };
  }

  @Get()
  async list(@CurrentUser() user: JwtPayload) {
    return { data: await this.users.list(this.collegeId(user)) };
  }

  @Get(':id')
  async findOne(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return { data: await this.users.findOne(this.collegeId(user), id) };
  }

  @Patch(':id')
  async update(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
    @Ip() ip: string,
  ) {
    const result = await this.users.update(this.collegeId(user), id, dto);
    await this.audit.record(user, {
      action: 'USER_UPDATE',
      targetType: 'user',
      targetId: id,
      metadata: { changes: dto },
      ip,
    });
    return { data: result };
  }

  @Delete(':id')
  async deactivate(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Ip() ip: string) {
    const result = await this.users.deactivate(this.collegeId(user), id);
    await this.audit.record(user, {
      action: 'USER_DEACTIVATE',
      targetType: 'user',
      targetId: id,
      ip,
    });
    return { data: result };
  }
}
