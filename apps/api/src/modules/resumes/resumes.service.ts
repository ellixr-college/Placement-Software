import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomBytes } from 'crypto';
import { emptyResumeData, resumeDataSchema } from '@ellixr/shared';
import { Prisma } from '@ellixr/database';
import type { PrismaClient } from '@ellixr/database';
import { PRISMA } from '../../common/prisma.module';
import { UpdateResumeDto } from './dto';

@Injectable()
export class ResumesService {
  constructor(@Inject(PRISMA) private readonly prisma: PrismaClient) {}

  // --- Student self-service (resolved from the JWT, never a body param) ---

  /** Returns the caller's resume, lazily creating a pre-seeded draft on first access. */
  async getMine(userId: string) {
    const student = await this.studentForUser(userId);
    const existing = await this.prisma.resume.findUnique({ where: { studentId: student.id } });
    if (existing) return this.publicShape(existing);

    const seed = emptyResumeData({
      fullName: student.user.fullName,
      email: student.user.email,
      phone: student.user.phone ?? '',
      headline: `${student.branch} • ${student.course} ${student.graduationYear}`,
      education: [
        {
          institution: '',
          degree: student.course,
          field: student.branch,
          startYear: '',
          endYear: String(student.graduationYear),
          score: student.cgpa != null ? `CGPA ${Number(student.cgpa)}` : '',
        },
      ],
    });

    const created = await this.prisma.resume.create({
      data: {
        studentId: student.id,
        collegeId: student.collegeId,
        publicSlug: await this.uniqueSlug(),
        template: 'classic',
        data: seed as unknown as Prisma.InputJsonValue,
        isPublished: true,
      },
    });
    return this.publicShape(created);
  }

  async updateMine(userId: string, dto: UpdateResumeDto) {
    const student = await this.studentForUser(userId);
    // Ensure the resume row (and slug) exists.
    await this.getMine(userId);

    const data: Prisma.ResumeUpdateInput = {};
    if (dto.template !== undefined) data.template = dto.template;
    if (dto.isPublished !== undefined) data.isPublished = dto.isPublished;
    if (dto.data !== undefined) {
      const parsed = resumeDataSchema.safeParse(dto.data);
      if (!parsed.success) {
        const first = parsed.error.issues[0];
        throw new BadRequestException(
          `Invalid resume data${first ? `: ${first.path.join('.')} — ${first.message}` : ''}`,
        );
      }
      data.data = parsed.data as unknown as Prisma.InputJsonValue;
    }

    const updated = await this.prisma.resume.update({
      where: { studentId: student.id },
      data,
    });
    return this.publicShape(updated);
  }

  // --- Public, unauthenticated render endpoint ---

  /** Looked up by unguessable slug; only returns a published resume. */
  async getPublic(slug: string) {
    const resume = await this.prisma.resume.findFirst({
      where: { publicSlug: slug, isPublished: true },
    });
    if (!resume) throw new NotFoundException('Resume not found');
    return { template: resume.template, data: resume.data, updatedAt: resume.updatedAt };
  }

  private async studentForUser(userId: string) {
    const student = await this.prisma.student.findUnique({
      where: { userId },
      include: { user: true },
    });
    if (!student) throw new ForbiddenException('No student profile for this account');
    return student;
  }

  private async uniqueSlug(): Promise<string> {
    for (let i = 0; i < 5; i++) {
      const slug = randomBytes(9).toString('base64url');
      const clash = await this.prisma.resume.findUnique({ where: { publicSlug: slug } });
      if (!clash) return slug;
    }
    throw new BadRequestException('Could not allocate a resume link, please retry');
  }

  private publicShape(r: {
    template: string;
    data: Prisma.JsonValue;
    publicSlug: string;
    isPublished: boolean;
    updatedAt: Date;
  }) {
    return {
      template: r.template,
      data: r.data,
      publicSlug: r.publicSlug,
      isPublished: r.isPublished,
      updatedAt: r.updatedAt,
    };
  }
}
