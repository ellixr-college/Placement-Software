import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { UserRole } from '@ellixr/shared';
import type { JwtPayload } from '@ellixr/shared';
import { CurrentUser, Roles } from '../../common/decorators';
import { ApplicationsService } from './applications.service';
import {
  ChangeStageDto,
  CreateInterviewDto,
  UpdateInterviewDto,
} from './application-dto';

@Controller('applications')
@Roles(UserRole.COLLEGE_ADMIN, UserRole.PLACEMENT_OFFICER)
export class ApplicationsController {
  constructor(private readonly applications: ApplicationsService) {}

  private collegeId(user: JwtPayload): string {
    if (!user.collegeId) throw new BadRequestException('No college context');
    return user.collegeId;
  }

  @Get(':id')
  async findOne(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return { data: await this.applications.findOne(this.collegeId(user), id) };
  }

  @Patch(':id/stage')
  async changeStage(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: ChangeStageDto,
  ) {
    return {
      data: await this.applications.changeStage(this.collegeId(user), user.sub, id, dto),
    };
  }

  @Post(':id/interviews')
  async addInterview(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: CreateInterviewDto,
  ) {
    return { data: await this.applications.addInterview(this.collegeId(user), id, dto) };
  }

  @Patch(':id/interviews/:roundId')
  async updateInterview(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Param('roundId') roundId: string,
    @Body() dto: UpdateInterviewDto,
  ) {
    return {
      data: await this.applications.updateInterview(this.collegeId(user), id, roundId, dto),
    };
  }
}
