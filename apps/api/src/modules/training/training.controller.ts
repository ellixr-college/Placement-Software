import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { UserRole } from '@ellixr/shared';
import type { JwtPayload } from '@ellixr/shared';
import { CurrentUser, Roles } from '../../common/decorators';
import { TrainingService } from './training.service';
import { CreateProgramDto, UpdateProgramDto, UpdateScoresDto, UpsertRecordDto } from './dto';

/** Officer/Admin: training programs, per-student records, and employability scores. */
@Controller('training')
@Roles(UserRole.COLLEGE_ADMIN, UserRole.PLACEMENT_OFFICER)
export class TrainingController {
  constructor(private readonly training: TrainingService) {}

  private collegeId(user: JwtPayload): string {
    if (!user.collegeId) throw new BadRequestException('No college context');
    return user.collegeId;
  }

  @Get('programs')
  async listPrograms(@CurrentUser() user: JwtPayload) {
    return { data: await this.training.listPrograms(this.collegeId(user)) };
  }

  @Post('programs')
  async createProgram(@CurrentUser() user: JwtPayload, @Body() dto: CreateProgramDto) {
    return { data: await this.training.createProgram(this.collegeId(user), user.sub, dto) };
  }

  @Patch('programs/:id')
  async updateProgram(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: UpdateProgramDto,
  ) {
    return { data: await this.training.updateProgram(this.collegeId(user), id, dto) };
  }

  @Delete('programs/:id')
  async removeProgram(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return { data: await this.training.removeProgram(this.collegeId(user), id) };
  }

  @Post('records')
  async upsertRecord(@CurrentUser() user: JwtPayload, @Body() dto: UpsertRecordDto) {
    return { data: await this.training.upsertRecord(this.collegeId(user), dto) };
  }

  @Delete('records/:id')
  async removeRecord(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return { data: await this.training.removeRecord(this.collegeId(user), id) };
  }

  @Patch('students/:studentId/scores')
  async updateScores(
    @CurrentUser() user: JwtPayload,
    @Param('studentId') studentId: string,
    @Body() dto: UpdateScoresDto,
  ) {
    return { data: await this.training.updateScores(this.collegeId(user), studentId, dto) };
  }

  @Get('students/:studentId/employability')
  async employability(@CurrentUser() user: JwtPayload, @Param('studentId') studentId: string) {
    return { data: await this.training.studentEmployability(this.collegeId(user), studentId) };
  }
}

/** Student: read own employability + training records. */
@Controller('me/training')
@Roles(UserRole.STUDENT)
export class MeTrainingController {
  constructor(private readonly training: TrainingService) {}

  @Get()
  async own(@CurrentUser() user: JwtPayload) {
    return { data: await this.training.ownEmployability(user.sub) };
  }
}
