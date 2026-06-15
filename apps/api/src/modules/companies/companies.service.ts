import {
  BadRequestException,
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

  async create(collegeId: string, dto: CreateCompanyDto) {
    const dup = await this.prisma.company.findFirst({
      where: { collegeId, name: dto.name },
    });
    if (dup) throw new BadRequestException(`Company already exists: ${dto.name}`);

    const company = await this.prisma.company.create({
      data: { collegeId, ...dto },
      include: { contacts: true },
    });
    return company;
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
