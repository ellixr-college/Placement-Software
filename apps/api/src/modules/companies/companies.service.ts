import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PRISMA } from '../../common/prisma.module';
import { Prisma } from '@ellixr/database';
import type { PrismaClient } from '@ellixr/database';
import {
  CreateCompanyDto,
  CreateContactDto,
  ListCompaniesQuery,
  UpdateCompanyDto,
  UpdateContactDto,
} from './dto';

/**
 * Placement Officer company registry. Every method is tenant-scoped: collegeId
 * comes from the authenticated officer's JWT, never the request body.
 */
@Injectable()
export class CompaniesService {
  constructor(@Inject(PRISMA) private readonly prisma: PrismaClient) {}

  async create(collegeId: string, createdById: string, dto: CreateCompanyDto) {
    const dup = await this.prisma.company.findFirst({
      where: { collegeId, name: dto.name },
    });
    if (dup) throw new BadRequestException(`Company already exists: ${dto.name}`);

    const { contactName, contactEmail, contactPhone, contactDesignation, ...companyData } = dto;
    // A primary POC is created inline only when both a name and email are given
    // (CompanyContact.email is required).
    const withPoc = !!(contactName && contactEmail);

    const company = await this.prisma.company.create({
      data: {
        collegeId,
        createdById,
        ...companyData,
        ...(withPoc
          ? {
              contacts: {
                create: {
                  name: contactName!,
                  email: contactEmail!,
                  phone: contactPhone,
                  designation: contactDesignation,
                  isPrimary: true,
                },
              },
            }
          : {}),
      },
      include: { contacts: true },
    });
    return company;
  }

  // ─────────────── College Head: recruiter tracking ───────────────

  /** Throws unless the user is this college's designated College Head. */
  async assertCollegeHead(userId: string) {
    const u = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { isCollegeHead: true },
    });
    if (!u?.isCollegeHead) throw new ForbiddenException('College Head only');
  }

  /** Recruiters (companies) registered per team member — for the College Head. */
  async recruiterTracking(collegeId: string) {
    const grouped = await this.prisma.company.groupBy({
      by: ['createdById'],
      where: { collegeId, createdById: { not: null } },
      _count: { _all: true },
    });
    const ids = grouped.map((g) => g.createdById).filter((x): x is string => !!x);
    const users = await this.prisma.user.findMany({
      where: { id: { in: ids } },
      select: { id: true, fullName: true, role: true },
    });
    const byId = new Map(users.map((u) => [u.id, u]));
    return grouped
      .filter((g) => g.createdById)
      .map((g) => ({
        userId: g.createdById as string,
        fullName: byId.get(g.createdById as string)?.fullName ?? 'Unknown',
        role: byId.get(g.createdById as string)?.role ?? '',
        recruiters: g._count._all,
      }))
      .sort((a, b) => b.recruiters - a.recruiters);
  }

  async list(collegeId: string, q: ListCompaniesQuery) {
    const page = q.page ?? 1;
    const limit = q.limit ?? 25;
    const where: Prisma.CompanyWhereInput = {
      collegeId,
      ...(q.search
        ? {
            OR: [
              { name: { contains: q.search, mode: 'insensitive' } },
              { industry: { contains: q.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [total, items] = await this.prisma.$transaction([
      this.prisma.company.count({ where }),
      this.prisma.company.findMany({
        where,
        include: { contacts: true, _count: { select: { jobs: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return {
      items,
      meta: { total, page, limit, pages: Math.ceil(total / limit) },
    };
  }

  async findOne(collegeId: string, id: string) {
    const company = await this.prisma.company.findFirst({
      where: { id, collegeId },
      include: { contacts: { orderBy: { isPrimary: 'desc' } } },
    });
    if (!company) throw new NotFoundException('Company not found');
    return company;
  }

  async update(collegeId: string, id: string, dto: UpdateCompanyDto) {
    await this.findOne(collegeId, id);
    if (dto.name) {
      const dup = await this.prisma.company.findFirst({
        where: { collegeId, name: dto.name, id: { not: id } },
      });
      if (dup) throw new BadRequestException(`Company already exists: ${dto.name}`);
    }
    return this.prisma.company.update({
      where: { id },
      data: dto,
      include: { contacts: true },
    });
  }

  // Soft delete: deactivate so historical jobs/applications stay intact.
  async remove(collegeId: string, id: string) {
    await this.findOne(collegeId, id);
    await this.prisma.company.update({ where: { id }, data: { isActive: false } });
    return { success: true };
  }

  async hiringHistory(collegeId: string, id: string) {
    await this.findOne(collegeId, id);
    const jobs = await this.prisma.job.findMany({
      where: { companyId: id, collegeId },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { applications: true } },
        applications: {
          where: { stage: { in: ['OFFER_ACCEPTED', 'JOINED'] } },
          select: { id: true },
        },
      },
    });
    return jobs.map((j) => ({
      id: j.id,
      title: j.title,
      status: j.status,
      jobType: j.jobType,
      createdAt: j.createdAt,
      applicationCount: j._count.applications,
      hiredCount: j.applications.length,
    }));
  }

  // ─────────────── Contacts (POCs) ───────────────

  async addContact(collegeId: string, companyId: string, dto: CreateContactDto) {
    await this.findOne(collegeId, companyId);
    return this.prisma.$transaction(async (tx) => {
      if (dto.isPrimary) await this.clearPrimary(tx, companyId);
      return tx.companyContact.create({ data: { companyId, ...dto } });
    });
  }

  async updateContact(
    collegeId: string,
    companyId: string,
    contactId: string,
    dto: UpdateContactDto,
  ) {
    await this.assertContact(collegeId, companyId, contactId);
    return this.prisma.$transaction(async (tx) => {
      if (dto.isPrimary) await this.clearPrimary(tx, companyId);
      return tx.companyContact.update({ where: { id: contactId }, data: dto });
    });
  }

  async removeContact(collegeId: string, companyId: string, contactId: string) {
    await this.assertContact(collegeId, companyId, contactId);
    await this.prisma.companyContact.delete({ where: { id: contactId } });
    return { success: true };
  }

  private async assertContact(collegeId: string, companyId: string, contactId: string) {
    await this.findOne(collegeId, companyId);
    const contact = await this.prisma.companyContact.findFirst({
      where: { id: contactId, companyId },
    });
    if (!contact) throw new NotFoundException('Contact not found');
    return contact;
  }

  private clearPrimary(tx: Prisma.TransactionClient, companyId: string) {
    return tx.companyContact.updateMany({
      where: { companyId, isPrimary: true },
      data: { isPrimary: false },
    });
  }
}
