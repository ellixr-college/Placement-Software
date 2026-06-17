import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { PRISMA } from '../../common/prisma.module';
import { Prisma } from '@ellixr/database';
import type { PrismaClient } from '@ellixr/database';
import { CreateProgramDto, UpdateProgramDto, UpdateScoresDto, UpsertRecordDto } from './dto';

const dec = (v: Prisma.Decimal | null) => (v != null ? Number(v) : null);
const toDec = (v?: number) => (v != null ? new Prisma.Decimal(v) : null);

/**
 * Overall readiness (0–100): mean of whatever assessment scores are set
 * (aptitude/communication/interview) plus the student's training completion rate.
 */
function readinessScore(
  scores: { aptitude: number | null; communication: number | null; interview: number | null },
  records: { completionStatus: string }[],
): number | null {
  const parts: number[] = [];
  if (scores.aptitude != null) parts.push(scores.aptitude);
  if (scores.communication != null) parts.push(scores.communication);
  if (scores.interview != null) parts.push(scores.interview);
  if (records.length > 0) {
    const completed = records.filter((r) => r.completionStatus === 'COMPLETED').length;
    parts.push((completed / records.length) * 100);
  }
  if (parts.length === 0) return null;
  return Math.round(parts.reduce((a, b) => a + b, 0) / parts.length);
}

@Injectable()
export class TrainingService {
  constructor(@Inject(PRISMA) private readonly prisma: PrismaClient) {}

  // ─────────────── Programs ───────────────
  listPrograms(collegeId: string) {
    return this.prisma.trainingProgram.findMany({
      where: { collegeId },
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { records: true } } },
    });
  }

  createProgram(collegeId: string, createdById: string, dto: CreateProgramDto) {
    return this.prisma.trainingProgram.create({
      data: {
        collegeId,
        createdById,
        name: dto.name.trim(),
        category: dto.category ?? 'OTHER',
        description: dto.description,
        startDate: dto.startDate ? new Date(dto.startDate) : null,
        endDate: dto.endDate ? new Date(dto.endDate) : null,
      },
    });
  }

  async updateProgram(collegeId: string, id: string, dto: UpdateProgramDto) {
    const p = await this.prisma.trainingProgram.findFirst({ where: { id, collegeId } });
    if (!p) throw new NotFoundException('Program not found');
    return this.prisma.trainingProgram.update({
      where: { id },
      data: {
        ...(dto.name ? { name: dto.name.trim() } : {}),
        ...(dto.category ? { category: dto.category } : {}),
        ...(dto.description !== undefined ? { description: dto.description } : {}),
        ...(dto.startDate !== undefined ? { startDate: dto.startDate ? new Date(dto.startDate) : null } : {}),
        ...(dto.endDate !== undefined ? { endDate: dto.endDate ? new Date(dto.endDate) : null } : {}),
      },
    });
  }

  async removeProgram(collegeId: string, id: string) {
    const p = await this.prisma.trainingProgram.findFirst({ where: { id, collegeId } });
    if (!p) throw new NotFoundException('Program not found');
    await this.prisma.trainingProgram.delete({ where: { id } });
    return { success: true };
  }

  // ─────────────── Records (per student) ───────────────
  async upsertRecord(collegeId: string, dto: UpsertRecordDto) {
    const program = await this.prisma.trainingProgram.findFirst({
      where: { id: dto.programId, collegeId },
    });
    if (!program) throw new NotFoundException('Program not found');
    const student = await this.prisma.student.findFirst({ where: { id: dto.studentId, collegeId } });
    if (!student) throw new NotFoundException('Student not found');

    return this.prisma.trainingRecord.upsert({
      where: { programId_studentId: { programId: dto.programId, studentId: dto.studentId } },
      create: {
        collegeId,
        programId: dto.programId,
        studentId: dto.studentId,
        attendancePercent: toDec(dto.attendancePercent),
        completionStatus: dto.completionStatus ?? 'NOT_STARTED',
        score: toDec(dto.score),
      },
      update: {
        ...(dto.attendancePercent !== undefined ? { attendancePercent: toDec(dto.attendancePercent) } : {}),
        ...(dto.completionStatus !== undefined ? { completionStatus: dto.completionStatus } : {}),
        ...(dto.score !== undefined ? { score: toDec(dto.score) } : {}),
      },
    });
  }

  async removeRecord(collegeId: string, id: string) {
    const r = await this.prisma.trainingRecord.findFirst({ where: { id, collegeId } });
    if (!r) throw new NotFoundException('Record not found');
    await this.prisma.trainingRecord.delete({ where: { id } });
    return { success: true };
  }

  // ─────────────── Student employability ───────────────
  async updateScores(collegeId: string, studentId: string, dto: UpdateScoresDto) {
    const student = await this.prisma.student.findFirst({ where: { id: studentId, collegeId } });
    if (!student) throw new NotFoundException('Student not found');
    await this.prisma.student.update({
      where: { id: studentId },
      data: {
        ...(dto.aptitudeScore !== undefined ? { aptitudeScore: toDec(dto.aptitudeScore) } : {}),
        ...(dto.communicationScore !== undefined ? { communicationScore: toDec(dto.communicationScore) } : {}),
        ...(dto.interviewScore !== undefined ? { interviewScore: toDec(dto.interviewScore) } : {}),
      },
    });
    return this.studentEmployability(collegeId, studentId);
  }

  async studentEmployability(collegeId: string, studentId: string) {
    const student = await this.prisma.student.findFirst({
      where: { id: studentId, collegeId },
      select: { id: true, aptitudeScore: true, communicationScore: true, interviewScore: true },
    });
    if (!student) throw new NotFoundException('Student not found');
    return this.buildSummary(student);
  }

  async ownEmployability(userId: string) {
    const student = await this.prisma.student.findUnique({
      where: { userId },
      select: { id: true, aptitudeScore: true, communicationScore: true, interviewScore: true },
    });
    if (!student) throw new ForbiddenException('No student profile for this account');
    return this.buildSummary(student);
  }

  private async buildSummary(s: {
    id: string;
    aptitudeScore: Prisma.Decimal | null;
    communicationScore: Prisma.Decimal | null;
    interviewScore: Prisma.Decimal | null;
  }) {
    const records = await this.prisma.trainingRecord.findMany({
      where: { studentId: s.id },
      include: { program: { select: { name: true, category: true } } },
      orderBy: { createdAt: 'desc' },
    });
    const scores = {
      aptitude: dec(s.aptitudeScore),
      communication: dec(s.communicationScore),
      interview: dec(s.interviewScore),
    };
    return {
      scores,
      readiness: readinessScore(scores, records),
      records: records.map((r) => ({
        id: r.id,
        programId: r.programId,
        programName: r.program.name,
        category: r.program.category,
        attendancePercent: dec(r.attendancePercent),
        completionStatus: r.completionStatus,
        score: dec(r.score),
      })),
    };
  }
}
