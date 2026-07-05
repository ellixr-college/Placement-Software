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
import { RoundsService } from './rounds.service';
import {
  CreateRoundDto,
  DecideRoundDto,
  PlaceApplicantDto,
  RejectApplicantDto,
  UpdateRoundDto,
} from './rounds-dto';

/** Placement-officer interview-rounds funnel for a job's applicants. */
@Controller('jobs')
@Roles(UserRole.PLACEMENT_OFFICER, UserRole.COLLEGE_ADMIN)
export class RoundsController {
  constructor(private readonly rounds: RoundsService) {}

  private collegeId(user: JwtPayload): string {
    if (!user.collegeId) throw new BadRequestException('No college context');
    return user.collegeId;
  }

  // Officer-login alert: rounds whose date passed and are still undecided.
  // (Static path segment 'rounds/pending' — declared before any :id patterns.)
  @Get('rounds/pending')
  async pending(@CurrentUser() user: JwtPayload) {
    return { data: await this.rounds.pendingResults(this.collegeId(user)) };
  }

  @Get(':jobId/funnel')
  async funnel(@CurrentUser() user: JwtPayload, @Param('jobId') jobId: string) {
    return { data: await this.rounds.funnel(this.collegeId(user), jobId) };
  }

  @Post(':jobId/rounds')
  async create(
    @CurrentUser() user: JwtPayload,
    @Param('jobId') jobId: string,
    @Body() dto: CreateRoundDto,
  ) {
    return { data: await this.rounds.createRound(this.collegeId(user), jobId, user.sub, dto) };
  }

  @Patch(':jobId/rounds/:roundId')
  async update(
    @CurrentUser() user: JwtPayload,
    @Param('jobId') jobId: string,
    @Param('roundId') roundId: string,
    @Body() dto: UpdateRoundDto,
  ) {
    return { data: await this.rounds.updateRound(this.collegeId(user), jobId, roundId, dto) };
  }

  @Delete(':jobId/rounds/:roundId')
  async remove(
    @CurrentUser() user: JwtPayload,
    @Param('jobId') jobId: string,
    @Param('roundId') roundId: string,
  ) {
    return { data: await this.rounds.deleteRound(this.collegeId(user), jobId, roundId) };
  }

  @Post(':jobId/rounds/:roundId/decide')
  async decide(
    @CurrentUser() user: JwtPayload,
    @Param('jobId') jobId: string,
    @Param('roundId') roundId: string,
    @Body() dto: DecideRoundDto,
  ) {
    return {
      data: await this.rounds.decideRound(this.collegeId(user), jobId, roundId, dto.advanceIds),
    };
  }

  @Post(':jobId/applications/:appId/place')
  async place(
    @CurrentUser() user: JwtPayload,
    @Param('jobId') jobId: string,
    @Param('appId') appId: string,
    @Body() dto: PlaceApplicantDto,
  ) {
    return { data: await this.rounds.place(this.collegeId(user), jobId, appId, dto) };
  }

  @Post(':jobId/applications/:appId/reject')
  async reject(
    @CurrentUser() user: JwtPayload,
    @Param('jobId') jobId: string,
    @Param('appId') appId: string,
    @Body() dto: RejectApplicantDto,
  ) {
    return { data: await this.rounds.reject(this.collegeId(user), jobId, appId, dto.reason) };
  }
}
