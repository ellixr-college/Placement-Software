import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import { PRISMA } from '../../common/prisma.module';
import { Prisma } from '@ellixr/database';
import type { PrismaClient } from '@ellixr/database';
import { NotificationsService } from '../notifications/notifications.service';
import {
  CreateStudentDto,
  ListStudentsQuery,
  UpdateOwnProfileDto,
  UpdateStudentDto,
  VerifyStudentDto,
} from './dto';

/**
 * Placement Officer student registry. All methods are tenant-scoped:
 * collegeId comes from the authenticated officer's JWT, never the request body.
 *
 * Registering a student creates BOTH a Student row and a linked User (role
 * STUDENT) with a temporary password and `mustChangePassword=true`. That linked
 * User is what activates student login — there is no public student signup.
 */
@Injectable()
export class StudentsService {
  constructor(
    @Inject(PRISMA) private readonly prisma: PrismaClient,
    private readonly notifications: NotificationsService,
  ) {}

  async create(collegeId: string, dto: CreateStudentDto) {
    await this.assertUnique(collegeId, dto.email, dto.rollNumber);

    const tempPassword = randomBytes(12).toString('base64url');
    const passwordHash = await bcrypt.hash(tempPassword, 12);

    const student = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          collegeId,
          email: dto.email,
          fullName: dto.fullName,
          role: 'STUDENT',
          phone: dto.phone,
          passwordHash,
          mustChangePassword: true,
        },
      });
      return tx.student.create({
        data: {
          collegeId,
          userId: user.id,
          rollNumber: dto.rollNumber,
          enrollmentNumber: dto.enrollmentNumber,
          course: dto.course,
          branch: dto.branch,
          graduationYear: dto.graduationYear,
          cgpa: dto.cgpa != null ? new Prisma.Decimal(dto.cgpa) : null,
          activeBacklogs: dto.activeBacklogs ?? 0,
          totalBacklogs: dto.totalBacklogs ?? 0,
        },
        include: { user: true },
      });
    });

    // Phase 4: email a welcome / set-password link instead of returning the temp password.
    return { student: this.publicStudent(student), tempPassword };
  }

  /**
   * Bulk-register students from CSV text. Each row is created independently;
   * the result reports created students (with temp passwords) and per-row errors
   * so a partial import surfaces exactly which rows failed and why.
   */
  async importCsv(collegeId: string, csv: string) {
    const rows = parseCsv(csv);
    if (rows.length === 0) throw new BadRequestException('CSV has no data rows');

    const created: Array<{
      rollNumber: string;
      fullName: string;
      email: string;
      tempPassword: string;
    }> = [];
    const errors: Array<{ row: number; message: string }> = [];

    for (let i = 0; i < rows.length; i++) {
      const raw = rows[i];
      const rowNum = i + 2; // header is row 1
      try {
        const dto = this.rowToDto(raw);
        const { student, tempPassword } = await this.create(collegeId, dto);
        created.push({
          rollNumber: student.rollNumber,
          fullName: student.user.fullName,
          email: student.user.email,
          tempPassword,
        });
      } catch (err) {
        errors.push({ row: rowNum, message: errorMessage(err) });
      }
    }

    return { createdCount: created.length, errorCount: errors.length, created, errors };
  }

  async list(collegeId: string, q: ListStudentsQuery) {
    const page = q.page ?? 1;
    const limit = q.limit ?? 25;
    const where: Prisma.StudentWhereInput = {
      collegeId,
      ...(q.branch ? { branch: q.branch } : {}),
      ...(q.graduationYear ? { graduationYear: q.graduationYear } : {}),
      ...(q.status ? { status: q.status } : {}),
      ...(q.verificationStatus ? { verificationStatus: q.verificationStatus } : {}),
      ...(q.search
        ? {
            OR: [
              { rollNumber: { contains: q.search, mode: 'insensitive' } },
              { user: { fullName: { contains: q.search, mode: 'insensitive' } } },
              { user: { email: { contains: q.search, mode: 'insensitive' } } },
            ],
          }
        : {}),
    };

    const [total, students] = await this.prisma.$transaction([
      this.prisma.student.count({ where }),
      this.prisma.student.findMany({
        where,
        include: { user: true },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return {
      items: students.map((s) => this.publicStudent(s)),
      meta: { total, page, limit, pages: Math.ceil(total / limit) },
    };
  }

  async findOne(collegeId: string, id: string) {
    const student = await this.prisma.student.findFirst({
      where: { id, collegeId },
      include: { user: true },
    });
    if (!student) throw new NotFoundException('Student not found');
    return this.publicStudent(student);
  }

  async update(collegeId: string, id: string, dto: UpdateStudentDto) {
    await this.findOne(collegeId, id);
    const { fullName, phone, cgpa, ...studentFields } = dto;

    const student = await this.prisma.$transaction(async (tx) => {
      if (fullName !== undefined || phone !== undefined) {
        const existing = await tx.student.findUniqueOrThrow({ where: { id } });
        await tx.user.update({
          where: { id: existing.userId },
          data: {
            ...(fullName !== undefined ? { fullName } : {}),
            ...(phone !== undefined ? { phone } : {}),
          },
        });
      }
      return tx.student.update({
        where: { id },
        data: {
          ...studentFields,
          ...(cgpa !== undefined ? { cgpa: cgpa != null ? new Prisma.Decimal(cgpa) : null } : {}),
        },
        include: { user: true },
      });
    });

    return this.publicStudent(student);
  }

  /** Toggle login access. Deactivating also revokes the student's sessions. */
  async setActive(collegeId: string, id: string, isActive: boolean) {
    const student = await this.prisma.student.findFirst({ where: { id, collegeId } });
    if (!student) throw new NotFoundException('Student not found');

    await this.prisma.$transaction(async (tx) => {
      await tx.student.update({ where: { id }, data: { isActive } });
      await tx.user.update({ where: { id: student.userId }, data: { isActive } });
      if (!isActive) {
        await tx.refreshToken.updateMany({
          where: { userId: student.userId, revokedAt: null },
          data: { revokedAt: new Date() },
        });
      }
    });

    return { success: true, isActive };
  }

  // ─────────────── Placement Officer verification ───────────────

  // Verify (→ VERIFIED) or reject (→ REJECTED + reason) a student's profile.
  async verify(collegeId: string, id: string, verifierId: string, dto: VerifyStudentDto) {
    const student = await this.prisma.student.findFirst({ where: { id, collegeId } });
    if (!student) throw new NotFoundException('Student not found');

    const data: Prisma.StudentUpdateInput =
      dto.action === 'verify'
        ? {
            verificationStatus: 'VERIFIED',
            status: 'VERIFIED',
            verifiedById: verifierId,
            verifiedAt: new Date(),
            rejectionReason: null,
          }
        : {
            verificationStatus: 'REJECTED',
            rejectionReason: dto.reason ?? null,
            verifiedById: verifierId,
            verifiedAt: null,
          };

    const updated = await this.prisma.student.update({
      where: { id },
      data,
      include: { user: true },
    });

    // Notify the student of the verification outcome.
    if (dto.action === 'verify') {
      await this.notifications.notify({
        userId: updated.userId,
        collegeId,
        type: 'PROFILE_VERIFIED',
        title: 'Profile verified',
        body: 'Your profile has been verified. You can now apply to eligible jobs.',
        link: '/me/profile',
      });
    } else {
      await this.notifications.notify({
        userId: updated.userId,
        collegeId,
        type: 'PROFILE_REJECTED',
        title: 'Profile needs changes',
        body: dto.reason
          ? `Your profile was sent back: ${dto.reason}`
          : 'Your profile needs changes before it can be verified.',
        link: '/me/profile',
      });
    }

    return this.publicStudent(updated);
  }

  // ─────────────── Student self-service (resolved from JWT) ───────────────

  async getOwn(userId: string) {
    return this.publicStudent(await this.ownStudent(userId));
  }

  // Students edit their own academic/profile fields (never rollNumber, which is
  // the officer-assigned identity). Editing a VERIFIED profile resets it to
  // PENDING so the officer re-checks the changed data.
  async updateOwnProfile(userId: string, dto: UpdateOwnProfileDto) {
    const student = await this.ownStudent(userId);
    const { fullName, phone, cgpa, ...academic } = dto;

    const updated = await this.prisma.$transaction(async (tx) => {
      if (fullName !== undefined || phone !== undefined) {
        await tx.user.update({
          where: { id: student.userId },
          data: {
            ...(fullName !== undefined ? { fullName } : {}),
            ...(phone !== undefined ? { phone } : {}),
          },
        });
      }
      const next = await tx.student.update({
        where: { id: student.id },
        data: {
          ...academic,
          ...(cgpa !== undefined ? { cgpa: cgpa != null ? new Prisma.Decimal(cgpa) : null } : {}),
          ...(student.verificationStatus === 'VERIFIED'
            ? { verificationStatus: 'PENDING', status: 'REGISTERED', verifiedAt: null }
            : {}),
        },
        include: { user: true },
      });
      const resume = await tx.resume.findUnique({ where: { studentId: student.id } });
      const completion = computeCompletion(next, resume?.data ?? null);
      if (completion !== next.profileCompletion) {
        return tx.student.update({
          where: { id: student.id },
          data: { profileCompletion: completion },
          include: { user: true },
        });
      }
      return next;
    });

    return this.publicStudent(updated);
  }

  // Submit the profile for officer review. Allowed from PENDING/REJECTED only.
  async submitOwn(userId: string) {
    const student = await this.ownStudent(userId);
    if (student.verificationStatus === 'SUBMITTED') {
      throw new BadRequestException('Profile already submitted and awaiting review');
    }
    if (student.verificationStatus === 'VERIFIED') {
      throw new BadRequestException('Profile is already verified');
    }
    const updated = await this.prisma.student.update({
      where: { id: student.id },
      data: { verificationStatus: 'SUBMITTED', rejectionReason: null },
      include: { user: true },
    });

    // Alert the college's officers that a profile is awaiting review.
    await this.notifications.notifyOfficers(student.collegeId, {
      type: 'PROFILE_SUBMITTED',
      title: 'Profile submitted for review',
      body: `${updated.user.fullName} (${updated.rollNumber}) submitted their profile for verification.`,
      link: `/students/${updated.id}`,
    });

    return this.publicStudent(updated);
  }

  private async ownStudent(userId: string) {
    const student = await this.prisma.student.findUnique({
      where: { userId },
      include: { user: true },
    });
    if (!student) throw new ForbiddenException('No student profile for this account');
    return student;
  }

  private async assertUnique(collegeId: string, email: string, rollNumber: string) {
    const emailTaken = await this.prisma.user.findUnique({ where: { email } });
    if (emailTaken) throw new BadRequestException(`Email already in use: ${email}`);
    const rollTaken = await this.prisma.student.findFirst({
      where: { collegeId, rollNumber },
    });
    if (rollTaken) throw new BadRequestException(`Roll number already exists: ${rollNumber}`);
  }

  private rowToDto(row: Record<string, string>): CreateStudentDto {
    const get = (k: string) => (row[k] ?? '').trim();
    const required = (k: string, label: string): string => {
      const v = get(k);
      if (v === '') throw new BadRequestException(`${label} is required`);
      return v;
    };
    const num = (k: string, label: string): number | undefined => {
      const v = get(k);
      if (v === '') return undefined;
      const n = Number(v);
      if (Number.isNaN(n)) throw new BadRequestException(`Invalid number for ${label}: ${v}`);
      return n;
    };

    const email = required('email', 'email');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new BadRequestException(`Invalid email: ${email}`);
    }
    const gradYear = num('graduationyear', 'graduationYear');
    if (gradYear == null) throw new BadRequestException('graduationYear is required');

    return {
      fullName: required('fullname', 'fullName'),
      email,
      rollNumber: required('rollnumber', 'rollNumber'),
      course: required('course', 'course'),
      branch: required('branch', 'branch'),
      graduationYear: gradYear,
      enrollmentNumber: get('enrollmentnumber') || undefined,
      phone: get('phone') || undefined,
      cgpa: num('cgpa', 'cgpa'),
      activeBacklogs: num('activebacklogs', 'activeBacklogs'),
      totalBacklogs: num('totalbacklogs', 'totalBacklogs'),
    };
  }

  private publicStudent(s: {
    id: string;
    rollNumber: string;
    enrollmentNumber: string | null;
    course: string;
    branch: string;
    graduationYear: number;
    cgpa: Prisma.Decimal | null;
    activeBacklogs: number;
    totalBacklogs: number;
    status: string;
    verificationStatus: string;
    verifiedAt: Date | null;
    rejectionReason: string | null;
    profileCompletion: number;
    isActive: boolean;
    createdAt: Date;
    user: {
      id: string;
      email: string;
      fullName: string;
      phone: string | null;
      isActive: boolean;
      lastLoginAt: Date | null;
    };
  }) {
    return {
      id: s.id,
      rollNumber: s.rollNumber,
      enrollmentNumber: s.enrollmentNumber,
      course: s.course,
      branch: s.branch,
      graduationYear: s.graduationYear,
      cgpa: s.cgpa != null ? Number(s.cgpa) : null,
      activeBacklogs: s.activeBacklogs,
      totalBacklogs: s.totalBacklogs,
      status: s.status,
      verificationStatus: s.verificationStatus,
      verifiedAt: s.verifiedAt,
      rejectionReason: s.rejectionReason,
      profileCompletion: s.profileCompletion,
      isActive: s.isActive,
      createdAt: s.createdAt,
      user: {
        id: s.user.id,
        email: s.user.email,
        fullName: s.user.fullName,
        phone: s.user.phone,
        isActive: s.user.isActive,
        lastLoginAt: s.user.lastLoginAt,
      },
    };
  }
}

// Weighted profile-completion checklist (0–100). Academic fields live on the
// Student row; skills/summary/projects live in the linked Resume's JSON `data`.
function computeCompletion(
  s: { course: string; branch: string; graduationYear: number; cgpa: Prisma.Decimal | null; enrollmentNumber: string | null; user: { phone: string | null } },
  resumeData: Prisma.JsonValue | null,
): number {
  let score = 0;
  if (s.user.phone) score += 15;
  if (s.enrollmentNumber) score += 10;
  if (s.course && s.branch && s.graduationYear) score += 20;
  if (s.cgpa != null) score += 10;

  const r = (resumeData && typeof resumeData === 'object' ? resumeData : {}) as Record<string, unknown>;
  const arr = (k: string): unknown[] => (Array.isArray(r[k]) ? (r[k] as unknown[]) : []);
  if (typeof r.summary === 'string' && r.summary.trim()) score += 10;
  if (arr('skills').length >= 3) score += 15;
  if (arr('experience').length >= 1 || arr('projects').length >= 1) score += 15;
  if (arr('education').length >= 1) score += 5;

  return Math.min(100, score);
}

/** Minimal RFC-4180-ish CSV parser: handles quoted fields, commas, and CRLF. */
function parseCsv(text: string): Array<Record<string, string>> {
  const records: string[][] = [];
  let field = '';
  let record: string[] = [];
  let inQuotes = false;

  const pushField = () => {
    record.push(field);
    field = '';
  };
  const pushRecord = () => {
    pushField();
    records.push(record);
    record = [];
  };

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ',') {
      pushField();
    } else if (c === '\n') {
      pushRecord();
    } else if (c === '\r') {
      // ignore; handled by following \n
    } else {
      field += c;
    }
  }
  // trailing field/record (file may not end with newline)
  if (field !== '' || record.length > 0) pushRecord();

  // drop fully-empty records
  const rows = records.filter((r) => r.some((v) => v.trim() !== ''));
  if (rows.length === 0) return [];

  const header = rows[0].map((h) => h.trim().toLowerCase().replace(/[\s_]/g, ''));
  return rows.slice(1).map((cols) => {
    const obj: Record<string, string> = {};
    header.forEach((h, idx) => {
      obj[h] = cols[idx] ?? '';
    });
    return obj;
  });
}

function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  return String(err);
}
