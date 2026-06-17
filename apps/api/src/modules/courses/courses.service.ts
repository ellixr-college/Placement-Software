import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { PRISMA } from '../../common/prisma.module';
import type { PrismaClient } from '@ellixr/database';
import { CreateCourseDto, UpdateCourseDto } from './dto';

const cleanList = (xs: string[] = []): string[] => {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of xs) {
    const v = raw.trim();
    if (v && !seen.has(v.toLowerCase())) {
      seen.add(v.toLowerCase());
      out.push(v);
    }
  }
  return out;
};

/**
 * Per-college course catalog. Read access is tenant-scoped (own college) for
 * officers/admins to populate forms; mutations are Platform-Admin only.
 */
@Injectable()
export class CoursesService {
  constructor(@Inject(PRISMA) private readonly prisma: PrismaClient) {}

  listForCollege(collegeId: string) {
    return this.prisma.collegeCourse.findMany({ where: { collegeId }, orderBy: { name: 'asc' } });
  }

  async create(collegeId: string, dto: CreateCourseDto) {
    const college = await this.prisma.college.findUnique({ where: { id: collegeId } });
    if (!college) throw new NotFoundException('College not found');
    const name = dto.name.trim();
    const dup = await this.prisma.collegeCourse.findFirst({ where: { collegeId, name } });
    if (dup) throw new BadRequestException(`Course already exists: ${name}`);
    return this.prisma.collegeCourse.create({
      data: { collegeId, name, branches: cleanList(dto.branches) },
    });
  }

  async update(collegeId: string, id: string, dto: UpdateCourseDto) {
    const course = await this.prisma.collegeCourse.findFirst({ where: { id, collegeId } });
    if (!course) throw new NotFoundException('Course not found');
    const name = dto.name?.trim();
    if (name && name !== course.name) {
      const dup = await this.prisma.collegeCourse.findFirst({
        where: { collegeId, name, id: { not: id } },
      });
      if (dup) throw new BadRequestException(`Course already exists: ${name}`);
    }
    return this.prisma.collegeCourse.update({
      where: { id },
      data: {
        ...(name ? { name } : {}),
        ...(dto.branches ? { branches: cleanList(dto.branches) } : {}),
      },
    });
  }

  async remove(collegeId: string, id: string) {
    const course = await this.prisma.collegeCourse.findFirst({ where: { id, collegeId } });
    if (!course) throw new NotFoundException('Course not found');
    await this.prisma.collegeCourse.delete({ where: { id } });
    return { success: true };
  }
}
