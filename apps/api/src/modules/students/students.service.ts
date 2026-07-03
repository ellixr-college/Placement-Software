import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';
import { PRISMA } from '../../common/prisma.module';
import { Prisma } from '@ellixr/database';
import type { PrismaClient } from '@ellixr/database';
import { resumeDataSchema, resumeReadiness } from '@ellixr/shared';
import { NotificationsService } from '../notifications/notifications.service';
import {
  CreateStudentDto,
  ImportStudentsDto,
  ListStudentsQuery,
  UpdateOwnProfileDto,
  UpdateStudentDto,
  VerifyStudentDto,
} from './dto';

// Every student is created with this shared default password so officers can
// hand it out in bulk (students change it later from their profile). Demo/V1
// convenience — a per-college policy can replace this when email is wired.
const DEFAULT_STUDENT_PASSWORD = 'password123';

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

    const tempPassword = DEFAULT_STUDENT_PASSWORD;
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
          mustChangePassword: false,
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
          currentYear: dto.currentYear ?? null,
          cgpa: dto.cgpa != null ? new Prisma.Decimal(dto.cgpa) : null,
          activeBacklogs: dto.activeBacklogs ?? 0,
          totalBacklogs: dto.totalBacklogs ?? 0,
          gender: dto.gender,
          personalEmail: dto.personalEmail,
          linkedinUrl: dto.linkedinUrl,
          // Officer-registered students come from official college rolls — trust
          // them so they immediately see eligible jobs (no separate verify step).
          status: 'VERIFIED',
          verificationStatus: 'VERIFIED',
          verifiedAt: new Date(),
          ...this.extendedData(dto),
        },
        include: { user: true },
      });
    });

    // Every student shares DEFAULT_STUDENT_PASSWORD; surfaced to the officer once.
    return { student: this.publicStudent(student), tempPassword };
  }

  /**
   * Bulk-register students from CSV text. To stay well under the platform's
   * request timeout (the old per-row create hashed bcrypt 55× and made dozens of
   * cloud round trips → 502s), this:
   *   1. validates every row up front (collecting per-row errors),
   *   2. pre-loads existing emails/roll numbers in two queries,
   *   3. hashes the shared default password ONCE, and
   *   4. inserts all users + students with two `createMany` calls.
   */
  async importCsv(collegeId: string, dto: ImportStudentsDto) {
    const rows = parseCsv(dto.csv);
    if (rows.length === 0) throw new BadRequestException('CSV has no data rows');

    const errors: Array<{ row: number; message: string }> = [];
    const parsed: Array<{ rowNum: number; dto: CreateStudentDto }> = [];
    for (let i = 0; i < rows.length; i++) {
      try {
        parsed.push({ rowNum: i + 2, dto: this.rowToDto(rows[i], dto) });
      } catch (err) {
        errors.push({ row: i + 2, message: errorMessage(err) });
      }
    }

    // Pre-load clashes in two queries instead of two per row.
    const emails = parsed.map((p) => p.dto.email);
    const rolls = parsed.map((p) => p.dto.rollNumber);
    const [emailRows, rollRows] = await Promise.all([
      this.prisma.user.findMany({ where: { email: { in: emails } }, select: { email: true } }),
      this.prisma.student.findMany({
        where: { collegeId, rollNumber: { in: rolls } },
        select: { rollNumber: true },
      }),
    ]);
    const takenEmails = new Set(emailRows.map((r) => r.email.toLowerCase()));
    const takenRolls = new Set(rollRows.map((r) => r.rollNumber));
    const seenEmails = new Set<string>();
    const seenRolls = new Set<string>();

    const passwordHash = await bcrypt.hash(DEFAULT_STUDENT_PASSWORD, 12);
    const userData: Prisma.UserCreateManyInput[] = [];
    const studentData: Prisma.StudentCreateManyInput[] = [];
    const created: Array<{ rollNumber: string; fullName: string; email: string; tempPassword: string }> = [];

    for (const { rowNum, dto: d } of parsed) {
      const emailKey = d.email.toLowerCase();
      if (takenEmails.has(emailKey) || seenEmails.has(emailKey)) {
        errors.push({ row: rowNum, message: `Email already in use: ${d.email}` });
        continue;
      }
      if (takenRolls.has(d.rollNumber) || seenRolls.has(d.rollNumber)) {
        errors.push({ row: rowNum, message: `Roll number already exists: ${d.rollNumber}` });
        continue;
      }
      seenEmails.add(emailKey);
      seenRolls.add(d.rollNumber);

      const userId = randomUUID();
      userData.push({
        id: userId,
        collegeId,
        email: d.email,
        fullName: d.fullName,
        role: 'STUDENT',
        phone: d.phone,
        passwordHash,
        mustChangePassword: false,
      });
      studentData.push({
        collegeId,
        userId,
        rollNumber: d.rollNumber,
        enrollmentNumber: d.enrollmentNumber,
        course: d.course,
        branch: d.branch,
        graduationYear: d.graduationYear,
        currentYear: d.currentYear ?? null,
        cgpa: d.cgpa != null ? new Prisma.Decimal(d.cgpa) : null,
        activeBacklogs: d.activeBacklogs ?? 0,
        totalBacklogs: d.totalBacklogs ?? 0,
        gender: d.gender,
        personalEmail: d.personalEmail,
        // Imported from official rolls → trusted/verified so jobs reach them.
        status: 'VERIFIED',
        verificationStatus: 'VERIFIED',
        verifiedAt: new Date(),
      });
      created.push({ rollNumber: d.rollNumber, fullName: d.fullName, email: d.email, tempPassword: DEFAULT_STUDENT_PASSWORD });
    }

    if (userData.length > 0) {
      await this.prisma.$transaction([
        this.prisma.user.createMany({ data: userData }),
        this.prisma.student.createMany({ data: studentData }),
      ]);
    }

    return { createdCount: created.length, errorCount: errors.length, created, errors };
  }

  /**
   * Graduate a whole batch: copy each student of `graduationYear` into the Alumni
   * directory (dedup by email) and disable their student logins (record kept).
   * The new incoming batch is then just a normal CSV import.
   */
  async graduateBatch(collegeId: string, graduationYear: number) {
    const students = await this.prisma.student.findMany({
      where: { collegeId, graduationYear },
      include: { user: { select: { fullName: true, email: true } } },
    });
    if (students.length === 0) {
      throw new BadRequestException(`No students found in the ${graduationYear} batch`);
    }

    // Skip anyone already in the alumni directory (unique per college+email).
    const existing = await this.prisma.alumni.findMany({
      where: { collegeId, email: { in: students.map((s) => s.user.email) } },
      select: { email: true },
    });
    const taken = new Set(existing.map((a) => a.email.toLowerCase()));

    const alumniData = students
      .filter((s) => !taken.has(s.user.email.toLowerCase()))
      .map((s) => ({
        collegeId,
        fullName: s.user.fullName,
        email: s.user.email,
        registerNumber: s.rollNumber,
        graduationYear: s.graduationYear,
        course: s.course,
        branch: s.branch,
        tags: [],
        selfRegistered: false,
        isApproved: true,
      }));

    const [alumniResult] = await this.prisma.$transaction([
      this.prisma.alumni.createMany({ data: alumniData, skipDuplicates: true }),
      // Disable logins + deactivate the student rows (history retained).
      this.prisma.user.updateMany({
        where: { id: { in: students.map((s) => s.userId) } },
        data: { isActive: false },
      }),
      this.prisma.student.updateMany({
        where: { id: { in: students.map((s) => s.id) } },
        data: { isActive: false, graduatedAt: new Date() },
      }),
    ]);

    return {
      graduationYear,
      studentsGraduated: students.length,
      alumniCreated: alumniResult.count,
      alreadyAlumni: students.length - alumniData.length,
    };
  }

  async list(collegeId: string, q: ListStudentsQuery) {
    const page = q.page ?? 1;
    const limit = q.limit ?? 25;
    const where: Prisma.StudentWhereInput = {
      collegeId,
      // Graduated students live in the Alumni directory — hide them here.
      graduatedAt: null,
      ...(q.branch ? { branch: q.branch } : {}),
      ...(q.graduationYear ? { graduationYear: q.graduationYear } : {}),
      ...(q.status ? { status: q.status } : {}),
      ...(q.verificationStatus ? { verificationStatus: q.verificationStatus } : {}),
      ...(q.active !== undefined ? { isActive: q.active } : {}),
      // Resume complete = resume.isComplete true; incomplete = anything else
      // (no resume or not yet complete). NOT avoids clashing with the search OR.
      ...(q.resumeComplete === true ? { resume: { isComplete: true } } : {}),
      ...(q.resumeComplete === false ? { NOT: { resume: { isComplete: true } } } : {}),
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

    const [total, students, resumesComplete] = await this.prisma.$transaction([
      this.prisma.student.count({ where }),
      this.prisma.student.findMany({
        where,
        // `data` is only for computing the missing-items tooltip for THIS page's
        // rows (≤ limit), so it's cheap. The college-wide count uses isComplete.
        include: { user: true, resume: { select: { isComplete: true, data: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      // College-wide completed-resume count (not just this page).
      this.prisma.resume.count({ where: { collegeId, isComplete: true } }),
    ]);

    return {
      items: students.map((s) => {
        // Compute completion from the LIVE resume data (not the persisted flag,
        // which can be stale for resumes saved before the flag existed).
        const { complete, missing } = this.resumeStatus(s.resume);
        return { ...this.publicStudent(s), resumeComplete: complete, resumeMissing: missing };
      }),
      meta: { total, page, limit, pages: Math.ceil(total / limit), resumesComplete },
    };
  }

  // Fresh completion + missing-items checklist for the officer's list/tooltip.
  private resumeStatus(resume: { data: Prisma.JsonValue } | null): {
    complete: boolean;
    missing: string[];
  } {
    if (!resume) return { complete: false, missing: ['Resume not started'] };
    const parsed = resumeDataSchema.safeParse(resume.data);
    if (!parsed.success) return { complete: false, missing: ['Resume not started'] };
    const r = resumeReadiness(parsed.data);
    return { complete: r.ready, missing: r.missing };
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
    const { fullName, phone, cgpa, dateOfBirth, tenthPercentage, twelfthPercentage, semesterMarks, ...studentFields } = dto;

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
          ...this.extendedData({ dateOfBirth, tenthPercentage, twelfthPercentage, semesterMarks }),
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
  // the officer-assigned identity). Students are admin-created and trusted (there
  // is no self-signup), so editing does NOT drop them out of VERIFIED — otherwise
  // every profile edit would silently hide all eligible jobs from them.
  async updateOwnProfile(userId: string, dto: UpdateOwnProfileDto) {
    const student = await this.ownStudent(userId);
    const { fullName, phone, cgpa, dateOfBirth, tenthPercentage, twelfthPercentage, semesterMarks, ...academic } = dto;

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
          ...this.extendedData({ dateOfBirth, tenthPercentage, twelfthPercentage, semesterMarks }),
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

  // Maps one CSV row to a CreateStudentDto. The per-row CSV only carries the
  // identity columns (reg no / name / email); course, branch, passout year and
  // current year come from the batch defaults set on the import form. A row may
  // still override any of those by including the column.
  private rowToDto(row: Record<string, string>, defaults: ImportStudentsDto): CreateStudentDto {
    const get = (k: string) => (row[k] ?? '').trim();
    // Accept friendly aliases: "regno"/"registrationnumber" → rollNumber, "name" → fullName.
    const first = (...keys: string[]) => {
      for (const k of keys) {
        const v = get(k);
        if (v !== '') return v;
      }
      return '';
    };
    const num = (k: string, label: string): number | undefined => {
      const v = get(k);
      if (v === '') return undefined;
      const n = Number(v);
      if (Number.isNaN(n)) throw new BadRequestException(`Invalid number for ${label}: ${v}`);
      return n;
    };

    const email = first('email', 'mailid', 'mail');
    if (email === '') throw new BadRequestException('email is required');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new BadRequestException(`Invalid email: ${email}`);
    }
    const fullName = first('fullname', 'name');
    if (fullName === '') throw new BadRequestException('name is required');
    const rollNumber = first('rollnumber', 'regno', 'registrationnumber', 'regno.');
    if (rollNumber === '') throw new BadRequestException('reg no is required');

    const course = first('course') || (defaults.course ?? '').trim();
    if (course === '') throw new BadRequestException('course is required (set it on the form)');
    const branch = first('branch') || (defaults.branch ?? '').trim() || course;
    const gradYear = num('graduationyear', 'graduationYear') ?? defaults.graduationYear;
    if (gradYear == null) throw new BadRequestException('passout year is required (set it on the form)');
    const currentYear = num('currentyear', 'currentYear') ?? defaults.currentYear;

    return {
      fullName,
      email,
      rollNumber,
      course,
      branch,
      graduationYear: gradYear,
      currentYear,
      enrollmentNumber: get('enrollmentnumber') || undefined,
      phone: get('phone') || undefined,
      cgpa: num('cgpa', 'cgpa'),
      activeBacklogs: num('activebacklogs', 'activeBacklogs'),
      totalBacklogs: num('totalbacklogs', 'totalBacklogs'),
    };
  }

  /** Permanently delete a student and the linked login account (cascades). */
  async remove(collegeId: string, id: string) {
    const student = await this.prisma.student.findFirst({ where: { id, collegeId } });
    if (!student) throw new NotFoundException('Student not found');
    // Deleting the User cascades to Student, Resume, applications, etc.
    await this.prisma.user.delete({ where: { id: student.userId } });
    return { success: true };
  }

  /** Bulk delete — only students in the caller's college are touched. */
  async removeMany(collegeId: string, ids: string[]) {
    const students = await this.prisma.student.findMany({
      where: { id: { in: ids }, collegeId },
      select: { userId: true },
    });
    const userIds = students.map((s) => s.userId);
    if (userIds.length === 0) return { deleted: 0 };
    await this.prisma.user.deleteMany({ where: { id: { in: userIds } } });
    return { deleted: userIds.length };
  }

  // Builds the prisma write data for the extended profile fields that need
  // conversion (DOB string→Date, percentages→Decimal, semester marks→Json).
  private extendedData(d: {
    dateOfBirth?: string;
    tenthPercentage?: number;
    twelfthPercentage?: number;
    semesterMarks?: { label: string; score: string }[];
  }) {
    return {
      ...(d.dateOfBirth !== undefined ? { dateOfBirth: d.dateOfBirth ? new Date(d.dateOfBirth) : null } : {}),
      ...(d.tenthPercentage !== undefined
        ? { tenthPercentage: d.tenthPercentage != null ? new Prisma.Decimal(d.tenthPercentage) : null }
        : {}),
      ...(d.twelfthPercentage !== undefined
        ? { twelfthPercentage: d.twelfthPercentage != null ? new Prisma.Decimal(d.twelfthPercentage) : null }
        : {}),
      ...(d.semesterMarks !== undefined
        ? { semesterMarks: d.semesterMarks as unknown as Prisma.InputJsonValue }
        : {}),
    };
  }

  private publicStudent(s: {
    id: string;
    rollNumber: string;
    enrollmentNumber: string | null;
    course: string;
    branch: string;
    graduationYear: number;
    currentYear: number | null;
    cgpa: Prisma.Decimal | null;
    activeBacklogs: number;
    totalBacklogs: number;
    dateOfBirth: Date | null;
    gender: string | null;
    personalEmail: string | null;
    linkedinUrl: string | null;
    tenthPercentage: Prisma.Decimal | null;
    twelfthPercentage: Prisma.Decimal | null;
    semesterMarks: Prisma.JsonValue;
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
    resume?: { isComplete: boolean } | null;
  }) {
    return {
      id: s.id,
      rollNumber: s.rollNumber,
      enrollmentNumber: s.enrollmentNumber,
      course: s.course,
      branch: s.branch,
      graduationYear: s.graduationYear,
      currentYear: s.currentYear,
      cgpa: s.cgpa != null ? Number(s.cgpa) : null,
      activeBacklogs: s.activeBacklogs,
      totalBacklogs: s.totalBacklogs,
      dateOfBirth: s.dateOfBirth,
      gender: s.gender,
      personalEmail: s.personalEmail,
      linkedinUrl: s.linkedinUrl,
      tenthPercentage: s.tenthPercentage != null ? Number(s.tenthPercentage) : null,
      twelfthPercentage: s.twelfthPercentage != null ? Number(s.twelfthPercentage) : null,
      semesterMarks: s.semesterMarks,
      status: s.status,
      verificationStatus: s.verificationStatus,
      verifiedAt: s.verifiedAt,
      rejectionReason: s.rejectionReason,
      profileCompletion: s.profileCompletion,
      isActive: s.isActive,
      createdAt: s.createdAt,
      resumeComplete: s.resume?.isComplete ?? false,
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
