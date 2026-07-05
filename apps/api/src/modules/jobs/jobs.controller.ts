import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { get as blobGet, put } from '@vercel/blob';
import { Res } from '@nestjs/common';
import { UserRole } from '@ellixr/shared';
import type { JwtPayload } from '@ellixr/shared';
import { CurrentUser, Roles } from '../../common/decorators';
import { JobsService } from './jobs.service';
import { ApplicationsService } from './applications.service';
import { ApplyDto, CreateJobDto, ListJobsQuery, UpdateJobDto } from './dto';

// Minimal shape of a multer upload (avoids depending on @types/multer).
interface UploadedPdf {
  buffer: Buffer;
  mimetype: string;
  originalname: string;
  size: number;
}

// No class-level @Roles: this controller mixes officer management routes and
// student feed/apply routes, each guarded with method-level @Roles.
@Controller('jobs')
export class JobsController {
  constructor(
    private readonly jobs: JobsService,
    private readonly applications: ApplicationsService,
  ) {}

  private collegeId(user: JwtPayload): string {
    if (!user.collegeId) throw new BadRequestException('No college context');
    return user.collegeId;
  }

  // Upload a Job Description PDF to Vercel Blob; returns its public URL to attach
  // to a job (used by the "quick post" flow). Officer/admin only.
  @Post('upload-pdf')
  @Roles(UserRole.COLLEGE_ADMIN, UserRole.PLACEMENT_OFFICER)
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 10 * 1024 * 1024 } }))
  async uploadPdf(@CurrentUser() user: JwtPayload, @UploadedFile() file?: UploadedPdf) {
    this.collegeId(user);
    if (!file) throw new BadRequestException('No file uploaded');
    if (file.mimetype !== 'application/pdf') throw new BadRequestException('Only PDF files are allowed');
    const token = process.env.BLOB_READ_WRITE_TOKEN;
    if (!token) throw new BadRequestException('File storage is not configured (BLOB_READ_WRITE_TOKEN)');
    const safe = file.originalname.replace(/[^\w.\-]+/g, '_').slice(-80) || 'job.pdf';
    const blob = await put(`job-pdfs/${user.collegeId}/${Date.now()}-${safe}`, file.buffer, {
      access: 'private',
      token,
      contentType: 'application/pdf',
    });
    return { data: { url: blob.url, name: file.originalname } };
  }

  // Upload an offer letter to Vercel Blob (PUBLIC, unguessable URL — same trust
  // model as a public résumé link) so the officer and the placed student can open
  // it directly. Officer/admin only.
  @Post('upload-offer-letter')
  @Roles(UserRole.COLLEGE_ADMIN, UserRole.PLACEMENT_OFFICER)
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 10 * 1024 * 1024 } }))
  async uploadOfferLetter(@CurrentUser() user: JwtPayload, @UploadedFile() file?: UploadedPdf) {
    this.collegeId(user);
    if (!file) throw new BadRequestException('No file uploaded');
    if (file.mimetype !== 'application/pdf') throw new BadRequestException('Only PDF files are allowed');
    const token = process.env.BLOB_READ_WRITE_TOKEN;
    if (!token) throw new BadRequestException('File storage is not configured (BLOB_READ_WRITE_TOKEN)');
    const safe = file.originalname.replace(/[^\w.\-]+/g, '_').slice(-80) || 'offer.pdf';
    const blob = await put(`offer-letters/${user.collegeId}/${Date.now()}-${safe}`, file.buffer, {
      access: 'public',
      token,
      contentType: 'application/pdf',
    });
    return { data: { url: blob.url, name: file.originalname } };
  }

  // Stream the (private) JD PDF to an authenticated viewer. The blob store is
  // private, so files aren't publicly reachable — the API fetches with the token
  // and relays the bytes. Any student/officer of the owning college may view.
  @Get(':id/pdf')
  @Roles(UserRole.COLLEGE_ADMIN, UserRole.PLACEMENT_OFFICER, UserRole.STUDENT)
  async pdf(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Res() res: Response) {
    const ref = await this.jobs.pdfRef(this.collegeId(user), id);
    const token = process.env.BLOB_READ_WRITE_TOKEN;
    if (!token) throw new BadRequestException('File storage is not configured');
    const result = await blobGet(ref.pdfUrl, { access: 'private', token });
    if (!result || !result.stream) throw new BadRequestException('PDF not found');
    const buffer = Buffer.from(await new Response(result.stream as ReadableStream).arrayBuffer());
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${(ref.pdfName ?? 'job.pdf').replace(/"/g, '')}"`);
    res.send(buffer);
  }

  // GET /jobs — officer management list OR student eligible feed, by role.
  @Get()
  @Roles(UserRole.COLLEGE_ADMIN, UserRole.PLACEMENT_OFFICER, UserRole.STUDENT)
  async list(@CurrentUser() user: JwtPayload, @Query() query: ListJobsQuery) {
    if (user.role === UserRole.STUDENT) {
      return { data: await this.jobs.studentFeed(user.sub) };
    }
    const { items, meta } = await this.jobs.list(this.collegeId(user), query);
    return { data: items, meta };
  }

  @Post()
  @Roles(UserRole.COLLEGE_ADMIN, UserRole.PLACEMENT_OFFICER)
  async create(@CurrentUser() user: JwtPayload, @Body() dto: CreateJobDto) {
    return { data: await this.jobs.create(this.collegeId(user), user.sub, dto) };
  }

  @Get(':id')
  @Roles(UserRole.COLLEGE_ADMIN, UserRole.PLACEMENT_OFFICER, UserRole.STUDENT)
  async findOne(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    if (user.role === UserRole.STUDENT) {
      return { data: await this.jobs.studentJobDetail(user.sub, id) };
    }
    return { data: await this.jobs.findOne(this.collegeId(user), id) };
  }

  @Patch(':id')
  @Roles(UserRole.COLLEGE_ADMIN, UserRole.PLACEMENT_OFFICER)
  async update(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: UpdateJobDto,
  ) {
    return { data: await this.jobs.update(this.collegeId(user), id, dto) };
  }

  @Post(':id/publish')
  @Roles(UserRole.COLLEGE_ADMIN, UserRole.PLACEMENT_OFFICER)
  async publish(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return { data: await this.jobs.publish(this.collegeId(user), id) };
  }

  @Post(':id/close')
  @Roles(UserRole.COLLEGE_ADMIN, UserRole.PLACEMENT_OFFICER)
  async close(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return { data: await this.jobs.close(this.collegeId(user), id) };
  }

  @Delete(':id')
  @Roles(UserRole.COLLEGE_ADMIN, UserRole.PLACEMENT_OFFICER)
  async remove(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return { data: await this.jobs.remove(this.collegeId(user), id) };
  }

  @Get(':id/applicants-export')
  @Roles(UserRole.COLLEGE_ADMIN, UserRole.PLACEMENT_OFFICER)
  async applicantsExport(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return { data: await this.applications.exportApplicants(this.collegeId(user), id) };
  }

  @Get(':id/eligible-students')
  @Roles(UserRole.COLLEGE_ADMIN, UserRole.PLACEMENT_OFFICER)
  async eligibleStudents(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return { data: await this.jobs.eligibleStudents(this.collegeId(user), id) };
  }

  @Get(':id/applications')
  @Roles(UserRole.COLLEGE_ADMIN, UserRole.PLACEMENT_OFFICER)
  async pipeline(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return { data: await this.applications.pipeline(this.collegeId(user), id) };
  }

  @Post(':id/apply')
  @Roles(UserRole.STUDENT)
  async apply(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: ApplyDto,
  ) {
    return { data: await this.jobs.apply(user.sub, id, dto.formResponses) };
  }
}
