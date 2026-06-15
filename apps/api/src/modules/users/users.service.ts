import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import { PRISMA } from '../../common/prisma.module';
import type { PrismaClient } from '@ellixr/database';
import { CreateUserDto, UpdateUserDto } from './dto';

/**
 * All methods are tenant-scoped: collegeId comes from the authenticated
 * College Admin's JWT (never from the request body).
 */
@Injectable()
export class UsersService {
  constructor(@Inject(PRISMA) private readonly prisma: PrismaClient) {}

  async create(collegeId: string, dto: CreateUserDto) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) throw new BadRequestException('Email already in use');

    // Use the password the admin typed, or generate a temp one.
    const passwordGenerated = !dto.password;
    const password = dto.password ?? randomBytes(12).toString('base64url');
    const passwordHash = await bcrypt.hash(password, 12);
    const user = await this.prisma.user.create({
      data: {
        collegeId,
        email: dto.email,
        fullName: dto.fullName,
        role: dto.role,
        phone: dto.phone,
        passwordHash,
      },
    });
    // Phase 4: email a set-password link instead of returning the temp password.
    // tempPassword is only returned when WE generated it.
    return {
      user: this.publicUser(user),
      passwordGenerated,
      tempPassword: passwordGenerated ? password : null,
    };
  }

  async list(collegeId: string) {
    const users = await this.prisma.user.findMany({
      where: { collegeId, role: { in: ['COLLEGE_ADMIN', 'PLACEMENT_OFFICER'] } },
      orderBy: { createdAt: 'desc' },
    });
    return users.map((u) => this.publicUser(u));
  }

  async findOne(collegeId: string, id: string) {
    const user = await this.prisma.user.findFirst({ where: { id, collegeId } });
    if (!user) throw new NotFoundException('User not found');
    return this.publicUser(user);
  }

  async update(collegeId: string, id: string, dto: UpdateUserDto) {
    await this.findOne(collegeId, id);
    const user = await this.prisma.user.update({ where: { id }, data: dto as never });
    return this.publicUser(user);
  }

  async deactivate(collegeId: string, id: string) {
    await this.findOne(collegeId, id);
    await this.prisma.user.update({ where: { id }, data: { isActive: false } });
    await this.prisma.refreshToken.updateMany({
      where: { userId: id, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    return { success: true };
  }

  private publicUser(u: {
    id: string;
    email: string;
    fullName: string;
    role: string;
    phone: string | null;
    isActive: boolean;
    lastLoginAt: Date | null;
  }) {
    return {
      id: u.id,
      email: u.email,
      fullName: u.fullName,
      role: u.role,
      phone: u.phone,
      isActive: u.isActive,
      lastLoginAt: u.lastLoginAt,
    };
  }
}
