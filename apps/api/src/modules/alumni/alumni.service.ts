import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { PRISMA } from '../../common/prisma.module';
import { Prisma } from '@ellixr/database';
import type { PrismaClient } from '@ellixr/database';
import { CreateAlumniDto, ListAlumniQuery, UpdateAlumniDto } from './dto';

/**
 * Alumni directory — a CRM-style record set the placement cell curates per
 * college. Every method is tenant-scoped: collegeId comes from the officer's
 * JWT, never the request. Alumni are NOT login accounts in V1; email sending
 * (campaigns/birthdays) is deferred with the rest of email automation.
 */
@Injectable()
export class AlumniService {
  constructor(@Inject(PRISMA) private readonly prisma: PrismaClient) {}

  async create(collegeId: string, dto: CreateAlumniDto) {
    await this.assertEmailFree(collegeId, dto.email);
    return this.prisma.alumni.create({
      data: { collegeId, ...dto, tags: dto.tags ?? [] },
    });
  }

  async list(collegeId: string, q: ListAlumniQuery) {
    const page = q.page ?? 1;
    const limit = q.limit ?? 25;
    const where: Prisma.AlumniWhereInput = {
      collegeId,
      ...(q.branch ? { branch: q.branch } : {}),
      ...(q.graduationYear ? { graduationYear: q.graduationYear } : {}),
      ...(q.company
        ? { currentCompany: { contains: q.company, mode: 'insensitive' } }
        : {}),
      ...(q.tag ? { tags: { has: q.tag } } : {}),
      ...(q.isMentor !== undefined ? { isMentor: q.isMentor } : {}),
      ...(q.isHiring !== undefined ? { isHiring: q.isHiring } : {}),
      ...(q.search
        ? {
            OR: [
              { fullName: { contains: q.search, mode: 'insensitive' } },
              { email: { contains: q.search, mode: 'insensitive' } },
              { currentCompany: { contains: q.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [total, items] = await this.prisma.$transaction([
      this.prisma.alumni.count({ where }),
      this.prisma.alumni.findMany({
        where,
        orderBy: [{ graduationYear: 'desc' }, { fullName: 'asc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return { items, meta: { total, page, limit, pages: Math.ceil(total / limit) } };
  }

  async findOne(collegeId: string, id: string) {
    const alumni = await this.prisma.alumni.findFirst({ where: { id, collegeId } });
    if (!alumni) throw new NotFoundException('Alumni not found');
    return alumni;
  }

  async update(collegeId: string, id: string, dto: UpdateAlumniDto) {
    await this.findOne(collegeId, id);
    if (dto.email) await this.assertEmailFree(collegeId, dto.email, id);
    return this.prisma.alumni.update({ where: { id }, data: dto });
  }

  async remove(collegeId: string, id: string) {
    await this.findOne(collegeId, id);
    await this.prisma.alumni.delete({ where: { id } });
    return { success: true };
  }

  /**
   * Dashboard metrics + segmentation facets for the alumni network. Facets
   * (branches, years, companies) drive the filter UI; counts give the overview.
   */
  async stats(collegeId: string) {
    const [total, mentors, hiring, byYearRaw, byBranchRaw, byCompanyRaw] = await Promise.all([
      this.prisma.alumni.count({ where: { collegeId } }),
      this.prisma.alumni.count({ where: { collegeId, isMentor: true } }),
      this.prisma.alumni.count({ where: { collegeId, isHiring: true } }),
      this.prisma.alumni.groupBy({
        by: ['graduationYear'],
        where: { collegeId },
        _count: { _all: true },
        orderBy: { graduationYear: 'desc' },
      }),
      this.prisma.alumni.groupBy({
        by: ['branch'],
        where: { collegeId },
        _count: { _all: true },
      }),
      this.prisma.alumni.groupBy({
        by: ['currentCompany'],
        where: { collegeId, currentCompany: { not: null } },
        _count: { _all: true },
      }),
    ]);

    const byBranch = byBranchRaw
      .map((b) => ({ branch: b.branch, count: b._count._all }))
      .sort((a, b) => b.count - a.count);
    const topCompanies = byCompanyRaw
      .map((c) => ({ company: c.currentCompany as string, count: c._count._all }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      total,
      mentors,
      hiring,
      byGraduationYear: byYearRaw.map((y) => ({
        graduationYear: y.graduationYear,
        count: y._count._all,
      })),
      byBranch,
      topCompanies,
      facets: {
        branches: byBranch.map((b) => b.branch),
        graduationYears: byYearRaw.map((y) => y.graduationYear),
        companies: byCompanyRaw
          .map((c) => c.currentCompany as string)
          .sort((a, b) => a.localeCompare(b)),
      },
    };
  }

  private async assertEmailFree(collegeId: string, email: string, exceptId?: string) {
    const existing = await this.prisma.alumni.findFirst({
      where: { collegeId, email, ...(exceptId ? { NOT: { id: exceptId } } : {}) },
      select: { id: true },
    });
    if (existing) throw new BadRequestException(`An alumni with email ${email} already exists`);
  }
}
