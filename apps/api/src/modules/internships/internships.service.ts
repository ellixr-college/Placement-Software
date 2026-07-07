import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { PRISMA } from '../../common/prisma.module';
import { Prisma } from '@ellixr/database';
import type { Internship, PrismaClient } from '@ellixr/database';
import { CreateInternshipDto, UpdateInternshipDto } from './dto';

const dec = (v: Prisma.Decimal | null) => (v != null ? Number(v) : null);
const toDec = (v?: number) => (v != null ? new Prisma.Decimal(v) : null);

@Injectable()
export class InternshipsService {
  constructor(@Inject(PRISMA) private readonly prisma: PrismaClient) {}

  private toPublic(
    i: Internship & {
      student?: {
        user: { fullName: string };
        rollNumber: string;
        course: string;
        graduationYear: number;
      };
    },
  ) {
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
      pocName: i.pocName,
      pocEmail: i.pocEmail,
      pocPhone: i.pocPhone,
      certificateUrl: i.certificateUrl,
      status: i.status,
      verifiedAt: i.verifiedAt,
      rejectionReason: i.rejectionReason,
      createdAt: i.createdAt,
      ...(i.student
        ? {
            studentName: i.student.user.fullName,
            rollNumber: i.student.rollNumber,
            studentCourse: i.student.course,
            graduationYear: i.student.graduationYear,
          }
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
        pocName: dto.pocName,
        pocEmail: dto.pocEmail,
        pocPhone: dto.pocPhone,
        certificateUrl: dto.certificateUrl,
      },
    });
    return this.toPublic(created);
  }

  // Students self-report internships they found on their own and can freely edit
  // them — there is no officer verification step (the placement cell only views).
  async updateOwn(userId: string, id: string, dto: UpdateInternshipDto) {
    const student = await this.studentForUser(userId);
    const existing = await this.prisma.internship.findFirst({
      where: { id, studentId: student.id },
    });
    if (!existing) throw new NotFoundException('Internship not found');
    const updated = await this.prisma.internship.update({
      where: { id },
      data: {
        ...(dto.companyName ? { companyName: dto.companyName.trim() } : {}),
        ...(dto.role ? { role: dto.role.trim() } : {}),
        ...(dto.workMode !== undefined ? { workMode: dto.workMode } : {}),
        ...(dto.location !== undefined ? { location: dto.location } : {}),
        ...(dto.isPaid !== undefined ? { isPaid: dto.isPaid } : {}),
        ...(dto.stipend !== undefined ? { stipend: toDec(dto.stipend) } : {}),
        ...(dto.startDate !== undefined
          ? { startDate: dto.startDate ? new Date(dto.startDate) : null }
          : {}),
        ...(dto.endDate !== undefined
          ? { endDate: dto.endDate ? new Date(dto.endDate) : null }
          : {}),
        ...(dto.isPpo !== undefined ? { isPpo: dto.isPpo } : {}),
        ...(dto.description !== undefined ? { description: dto.description } : {}),
        ...(dto.pocName !== undefined ? { pocName: dto.pocName } : {}),
        ...(dto.pocEmail !== undefined ? { pocEmail: dto.pocEmail } : {}),
        ...(dto.pocPhone !== undefined ? { pocPhone: dto.pocPhone } : {}),
        ...(dto.certificateUrl !== undefined ? { certificateUrl: dto.certificateUrl } : {}),
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

  // ─────────────── Officer / Admin (read-only) ───────────────
  // Every self-reported internship at the college, with the student's batch info
  // (course + graduation year) so the officer UI can group them batch by batch.
  async list(collegeId: string) {
    const rows = await this.prisma.internship.findMany({
      where: { collegeId },
      orderBy: { createdAt: 'desc' },
      include: {
        student: {
          select: {
            rollNumber: true,
            course: true,
            graduationYear: true,
            user: { select: { fullName: true } },
          },
        },
      },
    });
    return rows.map((r) => this.toPublic(r));
  }
}
