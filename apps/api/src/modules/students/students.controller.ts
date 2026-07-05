import { BadRequestException, Body, Controller, Delete, Get, Ip, Param, Patch, Post, Query } from '@nestjs/common';
import { UserRole } from '@ellixr/shared';
import type { JwtPayload } from '@ellixr/shared';
import { CurrentUser, Roles } from '../../common/decorators';
import { AuditService } from '../../common/audit.module';
import { StudentsService } from './students.service';
import {
  BulkDeleteStudentsDto,
  CreateStudentDto,
  GraduateBatchDto,
  ImportStudentsDto,
  ListStudentsQuery,
  SetStudentStatusDto,
  UpdateStudentDto,
  VerifyStudentDto,
} from './dto';

/**
 * Reads are open to the Placement Officer and College Admin; all mutations are
 * Placement-Officer-only (method-level @Roles overrides the class default).
 */
@Controller('students')
@Roles(UserRole.PLACEMENT_OFFICER, UserRole.COLLEGE_ADMIN)
export class StudentsController {
  constructor(
    private readonly students: StudentsService,
    private readonly audit: AuditService,
  ) {}

  private collegeId(user: JwtPayload): string {
    if (!user.collegeId) throw new BadRequestException('No college context');
    return user.collegeId;
  }

  @Get()
  async list(@CurrentUser() user: JwtPayload, @Query() query: ListStudentsQuery) {
    const { items, meta } = await this.students.list(this.collegeId(user), query);
    return { data: items, meta };
  }

  // Declared before :id so "batches" isn't captured as an id param.
  @Get('batches')
  async batches(@CurrentUser() user: JwtPayload) {
    return { data: await this.students.batches(this.collegeId(user)) };
  }

  @Get(':id')
  async findOne(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return { data: await this.students.findOne(this.collegeId(user), id) };
  }

  @Post()
  @Roles(UserRole.PLACEMENT_OFFICER, UserRole.COLLEGE_ADMIN)
  async create(@CurrentUser() user: JwtPayload, @Body() dto: CreateStudentDto) {
    return { data: await this.students.create(this.collegeId(user), dto) };
  }

  @Post('import')
  @Roles(UserRole.PLACEMENT_OFFICER, UserRole.COLLEGE_ADMIN)
  async importCsv(@CurrentUser() user: JwtPayload, @Body() dto: ImportStudentsDto) {
    return { data: await this.students.importCsv(this.collegeId(user), dto) };
  }

  @Patch(':id')
  @Roles(UserRole.PLACEMENT_OFFICER, UserRole.COLLEGE_ADMIN)
  async update(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: UpdateStudentDto,
  ) {
    return { data: await this.students.update(this.collegeId(user), id, dto) };
  }

  @Post('graduate')
  @Roles(UserRole.PLACEMENT_OFFICER, UserRole.COLLEGE_ADMIN)
  async graduate(
    @CurrentUser() user: JwtPayload,
    @Body() dto: GraduateBatchDto,
    @Ip() ip: string,
  ) {
    const result = await this.students.graduateBatch(this.collegeId(user), dto.graduationYear);
    await this.audit.record(user, {
      action: 'STUDENT_BATCH_GRADUATE',
      targetType: 'student',
      metadata: result,
      ip,
    });
    return { data: result };
  }

  @Post('bulk-delete')
  @Roles(UserRole.PLACEMENT_OFFICER, UserRole.COLLEGE_ADMIN)
  async removeMany(
    @CurrentUser() user: JwtPayload,
    @Body() dto: BulkDeleteStudentsDto,
    @Ip() ip: string,
  ) {
    const result = await this.students.removeMany(this.collegeId(user), dto.ids);
    await this.audit.record(user, {
      action: 'STUDENT_BULK_DELETE',
      targetType: 'student',
      metadata: { count: result.deleted },
      ip,
    });
    return { data: result };
  }

  @Delete(':id')
  @Roles(UserRole.PLACEMENT_OFFICER, UserRole.COLLEGE_ADMIN)
  async remove(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Ip() ip: string) {
    const result = await this.students.remove(this.collegeId(user), id);
    await this.audit.record(user, {
      action: 'STUDENT_DELETE',
      targetType: 'student',
      targetId: id,
      ip,
    });
    return { data: result };
  }

  @Patch(':id/status')
  @Roles(UserRole.PLACEMENT_OFFICER, UserRole.COLLEGE_ADMIN)
  async setStatus(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: SetStudentStatusDto,
  ) {
    return { data: await this.students.setActive(this.collegeId(user), id, dto.isActive) };
  }

  @Post(':id/verify')
  @Roles(UserRole.PLACEMENT_OFFICER, UserRole.COLLEGE_ADMIN)
  async verify(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: VerifyStudentDto,
    @Ip() ip: string,
  ) {
    const result = await this.students.verify(this.collegeId(user), id, user.sub, dto);
    await this.audit.record(user, {
      action: dto.action === 'verify' ? 'STUDENT_VERIFY' : 'STUDENT_REJECT',
      targetType: 'student',
      targetId: id,
      metadata: dto.reason ? { reason: dto.reason } : undefined,
      ip,
    });
    return { data: result };
  }
}
