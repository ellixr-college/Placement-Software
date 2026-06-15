import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import { UserRole } from '@ellixr/shared';
import { PRISMA } from '../../common/prisma.module';
import type { PrismaClient } from '@ellixr/database';
import { CreateCollegeDto, UpdateCollegeDto } from './dto';

@Injectable()
export class CollegesService {
  constructor(@Inject(PRISMA) private readonly prisma: PrismaClient) {}

  async create(dto: CreateCollegeDto) {
    const existing = await this.prisma.college.findUnique({ where: { slug: dto.slug } });
    if (existing) throw new BadRequestException('Slug already in use');

    // Use the password the platform admin typed, or generate a temp one.
    const passwordGenerated = !dto.adminPassword;
    const adminPassword = dto.adminPassword ?? randomBytes(12).toString('base64url');
    const passwordHash = await bcrypt.hash(adminPassword, 12);

    const college = await this.prisma.$transaction(async (tx) => {
      const c = await tx.college.create({
        data: {
          name: dto.name,
          slug: dto.slug,
          contactEmail: dto.contactEmail,
          contactPhone: dto.contactPhone,
          city: dto.city,
          state: dto.state,
        },
      });
      await tx.user.create({
        data: {
          collegeId: c.id,
          email: dto.adminEmail,
          passwordHash,
          fullName: dto.adminFullName,
          role: UserRole.COLLEGE_ADMIN,
        },
      });
      return c;
    });

    // Phase 4: email the admin a set-password link instead of returning a temp password.
    // adminTempPassword is only returned when WE generated it — if the platform
    // admin set their own, they already know it and we don't echo it back.
    return {
      college,
      passwordGenerated,
      adminTempPassword: passwordGenerated ? adminPassword : null,
    };
  }

  async list(page = 1, limit = 20, search?: string) {
    const where = search
      ? { name: { contains: search, mode: 'insensitive' as const } }
      : {};
    const [items, total] = await Promise.all([
      this.prisma.college.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.college.count({ where }),
    ]);
    return { items, total, page, limit };
  }

  async findOne(id: string) {
    const college = await this.prisma.college.findUnique({ where: { id } });
    if (!college) throw new NotFoundException('College not found');
    return college;
  }

  async update(id: string, dto: UpdateCollegeDto) {
    await this.findOne(id);
    return this.prisma.college.update({ where: { id }, data: dto as never });
  }

  async setStatus(id: string, isActive: boolean) {
    await this.findOne(id);
    const college = await this.prisma.college.update({
      where: { id },
      data: { isActive },
    });
    if (!isActive) {
      // Revoke all sessions for users of a suspended college.
      const users = await this.prisma.user.findMany({
        where: { collegeId: id },
        select: { id: true },
      });
      await this.prisma.refreshToken.updateMany({
        where: { userId: { in: users.map((u) => u.id) }, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    }
    return college;
  }
}
