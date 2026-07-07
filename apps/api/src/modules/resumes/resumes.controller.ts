import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UserRole } from '@ellixr/shared';
import type { JwtPayload } from '@ellixr/shared';
import { CurrentUser, Public, Roles } from '../../common/decorators';
import { ResumesService } from './resumes.service';
import { UpdateResumeDto } from './dto';

// Minimal shape of a multer upload (avoids depending on @types/multer).
interface UploadedPdf {
  buffer: Buffer;
  mimetype: string;
  originalname: string;
  size: number;
}

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

  @Post('me/resume')
  @Roles(UserRole.STUDENT)
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 1 * 1024 * 1024 } }))
  async uploadMine(@CurrentUser() user: JwtPayload, @UploadedFile() file?: UploadedPdf) {
    if (!file) throw new BadRequestException('No file uploaded');
    return { data: await this.resumes.uploadMine(user.sub, file) };
  }

  @Patch('me/resume')
  @Roles(UserRole.STUDENT)
  async updateMine(@CurrentUser() user: JwtPayload, @Body() dto: UpdateResumeDto) {
    return { data: await this.resumes.updateMine(user.sub, dto) };
  }

  @Delete('me/resume')
  @Roles(UserRole.STUDENT)
  async deleteMine(@CurrentUser() user: JwtPayload) {
    return { data: await this.resumes.deleteMine(user.sub) };
  }

  @Get('public/resumes/:slug')
  @Public()
  async getPublic(@Param('slug') slug: string) {
    return { data: await this.resumes.getPublic(slug) };
  }

  // Officer/admin: view any of their college's students' resumes.
  @Get('students/:studentId/resume')
  @Roles(UserRole.PLACEMENT_OFFICER, UserRole.COLLEGE_ADMIN)
  async getForStudent(@CurrentUser() user: JwtPayload, @Param('studentId') studentId: string) {
    if (!user.collegeId) throw new BadRequestException('No college context');
    return { data: await this.resumes.getForOfficer(user.collegeId, studentId) };
  }
}
