import {
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PRISMA } from '../../common/prisma.module';
import { Prisma } from '@ellixr/database';
import type { Internship, PrismaClient } from '@ellixr/database';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateInternshipDto, UpdateInternshipDto, VerifyInternshipDto } from './dto';

const dec = (v: Prisma.Decimal | null) => (v != null ? Number(v) : null);
const toDec = (v?: number) => (v != null ? new Prisma.Decimal(v) : null);

@Injectable()
export class InternshipsService {
  constructor(
    @Inject(PRISMA) private readonly prisma: PrismaClient,
    private readonly notifications: NotificationsService,
  ) {}

  private toPublic(i: Internship & { student?: { user: { fullName: string }; rollNumber: string } }) {
    return {
      id: i.id,
      studentId: i.studentId,
      companyName: i.companyName,
      role: i.role,
      workMode: i.workMode,
      location: i.location,
      isPaid: i.isPaid,
      stipend: dec(i.stipend),
      startDate: i.startDate,
      endDate: i.endDate,
      isPpo: i.isPpo,
      description: i.description,
      certificateUrl: i.certificateUrl,
      status: i.status,
      verifiedAt: i.verifiedAt,
      rejectionReason: i.rejectionReason,
      createdAt: i.createdAt,
      ...(i.student
        ? { studentName: i.student.user.fullName, rollNumber: i.student.rollNumber }
        : {}),
    };
  }

  private async studentForUser(userId: string) {
    const student = await this.prisma.student.findUnique({
      where: { userId },
      select: { id: true, collegeId: true },
    });
    if (!student) throw new ForbiddenException('No student profile for this account');
    return student;
  }

  // ─────────────── Student (self) ───────────────
  async listOwn(userId: string) {
    const student = await this.studentForUser(userId);
    const rows = await this.prisma.internship.findMany({
      where: { studentId: student.id },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((r) => this.toPublic(r));
  }

  async createOwn(userId: string, dto: CreateInternshipDto) {
    const student = await this.studentForUser(userId);
    const created = await this.prisma.internship.create({
      data: {
        collegeId: student.collegeId,
        studentId: student.id,
        companyName: dto.companyName.trim(),
        role: dto.role.trim(),
        workMode: dto.workMode,
        location: dto.location,
        isPaid: dto.isPaid ?? false,
        stipend: toDec(dto.stipend),
        startDate: dto.startDate ? new Date(dto.startDate) : null,
        endDate: dto.endDate ? new Date(dto.endDate) : null,
        isPpo: dto.isPpo ?? false,
        description: dto.description,
        certificateUrl: dto.certificateUrl,
      },
    });
    // Let the placement cell know a new internship is awaiting verification.
    await this.notifications.notifyOfficers(student.collegeId, {
      type: 'GENERAL',
      title: 'Internship submitted for verification',
      body: `${dto.companyName.trim()} — ${dto.role.trim()}`,
      link: '/internships',
    });
    return this.toPublic(created);
  }

  async updateOwn(userId: string, id: string, dto: UpdateInternshipDto) {
    const student = await this.studentForUser(userId);
    const existing = await this.prisma.internship.findFirst({
      where: { id, studentId: student.id },
    });
    if (!existing) throw new NotFoundException('Internship not found');
    if (existing.status === 'VERIFIED') {
      throw new ForbiddenException('A verified internship cannot be edited');
    }
    const updated = await this.prisma.internship.update({
      where: { id },
      data: {
        ...(dto.companyName ? { companyName: dto.companyName.trim() } : {}),
        ...(dto.role ? { role: dto.role.trim() } : {}),
        ...(dto.workMode !== undefined ? { workMode: dto.workMode } : {}),
        ...(dto.location !== undefined ? { location: dto.location } : {}),
        ...(dto.isPaid !== undefined ? { isPaid: dto.isPaid } : {}),
        ...(dto.stipend !== undefined ? { stipend: toDec(dto.stipend) } : {}),
        ...(dto.startDate !== undefined ? { startDate: dto.startDate ? new Date(dto.startDate) : null } : {}),
        ...(dto.endDate !== undefined ? { endDate: dto.endDate ? new Date(dto.endDate) : null } : {}),
        ...(dto.isPpo !== undefined ? { isPpo: dto.isPpo } : {}),
        ...(dto.description !== undefined ? { description: dto.description } : {}),
        ...(dto.certificateUrl !== undefined ? { certificateUrl: dto.certificateUrl } : {}),
        // Editing a rejected record resubmits it for review.
        ...(existing.status === 'REJECTED'
          ? { status: 'PENDING' as const, rejectionReason: null, verifiedAt: null, verifiedById: null }
          : {}),
      },
    });
    return this.toPublic(updated);
  }

  async removeOwn(userId: string, id: string) {
    const student = await this.studentForUser(userId);
    const existing = await this.prisma.internship.findFirst({
      where: { id, studentId: student.id },
    });
    if (!existing) throw new NotFoundException('Internship not found');
    await this.prisma.internship.delete({ where: { id } });
    return { success: true };
  }

  // ─────────────── Officer / Admin ───────────────
  async list(collegeId: string, status?: string) {
    const rows = await this.prisma.internship.findMany({
      where: { collegeId, ...(status ? { status: status as never } : {}) },
      orderBy: { createdAt: 'desc' },
      include: { student: { select: { rollNumber: true, user: { select: { fullName: true } } } } },
    });
    return rows.map((r) => this.toPublic(r));
  }

  async get(collegeId: string, id: string) {
    const row = await this.prisma.internship.findFirst({
      where: { id, collegeId },
      include: { student: { select: { rollNumber: true, user: { select: { fullName: true } } } } },
    });
    if (!row) throw new NotFoundException('Internship not found');
    return this.toPublic(row);
  }

  async verify(collegeId: string, id: string, verifierId: string, dto: VerifyInternshipDto) {
    const existing = await this.prisma.internship.findFirst({
      where: { id, collegeId },
      include: { student: { select: { userId: true } } },
    });
    if (!existing) throw new NotFoundException('Internship not found');
    const verify = dto.action === 'verify';
    const updated = await this.prisma.internship.update({
      where: { id },
      data: {
        status: verify ? 'VERIFIED' : 'REJECTED',
        verifiedById: verifierId,
        verifiedAt: new Date(),
        rejectionReason: verify ? null : dto.reason ?? null,
      },
      include: { student: { select: { rollNumber: true, user: { select: { fullName: true } } } } },
    });
    await this.notifications.notify({
      userId: existing.student.userId,
      collegeId,
      type: 'GENERAL',
      title: verify ? 'Internship verified' : 'Internship needs changes',
      body: verify
        ? `${updated.companyName} — ${updated.role} is now verified.`
        : dto.reason ?? `${updated.companyName} — ${updated.role} was sent back for changes.`,
      link: '/me/internships',
    });
    return this.toPublic(updated);
  }
}
