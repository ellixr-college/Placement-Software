import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PRISMA } from '../../common/prisma.module';
import { Prisma } from '@ellixr/database';
import type { PrismaClient, Student, ApplicationStage } from '@ellixr/database';
import {
  CreateJobDto,
  CreatePlatformJobDto,
  ListJobsQuery,
  UpdateJobDto,
  UpdatePlatformJobDto,
} from './dto';
import { NotificationsService } from '../notifications/notifications.service';
import {
  checkEligibility,
  checkApplyEligibility,
  type EligibilityJob,
  type EligibilityStudent,
} from './eligibility';

const PLACING_STAGES: ApplicationStage[] = ['OFFER_ACCEPTED', 'JOINED'];

// A custom application question stored on Job.applicationFormFields (as JSON).
interface ApplicationField {
  id: string;
  label: string;
  type: 'text' | 'textarea' | 'select' | 'number';
  options?: string[];
  required?: boolean;
}

@Injectable()
export class JobsService {
  constructor(
    @Inject(PRISMA) private readonly prisma: PrismaClient,
    private readonly notifications: NotificationsService,
  ) {}

  private decimalOrNull(v: number | undefined | null): Prisma.Decimal | null {
    return v != null ? new Prisma.Decimal(v) : null;
  }

  // ─────────────── Placement Officer: job lifecycle ───────────────

  async create(collegeId: string, createdById: string, dto: CreateJobDto) {
    // Company is optional now: link an existing one if an id is given, else the
    // free-text companyName (or nothing). Job posting is independent of the POC/
    // company directory.
    if (dto.companyId) {
      const company = await this.prisma.company.findFirst({
        where: { id: dto.companyId, collegeId },
      });
      if (!company) throw new BadRequestException('Company not found');
    }

    const {
      companyId,
      ctcMin,
      ctcMax,
      minCgpa,
      minTenthPercentage,
      minTwelfthPercentage,
      minUgPercentage,
      applicationDeadline,
      applicationFormFields,
      ...rest
    } = dto;
    return this.prisma.job.create({
      data: {
        collegeId,
        companyId: companyId ?? null,
        createdById,
        ...rest,
        ctcMin: this.decimalOrNull(ctcMin),
        ctcMax: this.decimalOrNull(ctcMax),
        minCgpa: this.decimalOrNull(minCgpa),
        minTenthPercentage: this.decimalOrNull(minTenthPercentage),
        minTwelfthPercentage: this.decimalOrNull(minTwelfthPercentage),
        minUgPercentage: this.decimalOrNull(minUgPercentage),
        applicationDeadline: applicationDeadline ? new Date(applicationDeadline) : null,
        ...(applicationFormFields !== undefined
          ? { applicationFormFields: applicationFormFields as unknown as Prisma.InputJsonValue }
          : {}),
      },
      include: { company: true },
    });
  }

  async list(collegeId: string, q: ListJobsQuery) {
    const page = q.page ?? 1;
    const limit = q.limit ?? 25;
    // The officer's list shows their own college jobs PLUS platform jobs broadcast
    // to their college (read-only — they can manage their applicants but not the job).
    const where: Prisma.JobWhereInput = {
      ...this.visibleToCollege(collegeId),
      ...(q.status ? { status: q.status as Prisma.JobWhereInput['status'] } : {}),
      ...(q.search ? { title: { contains: q.search, mode: 'insensitive' } } : {}),
    };

    const [total, jobs] = await this.prisma.$transaction([
      this.prisma.job.count({ where }),
      this.prisma.job.findMany({
        where,
        // Count only THIS college's applicants, even for a shared platform job.
        include: {
          company: true,
          _count: { select: { applications: { where: { collegeId } } } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return {
      items: jobs.map((j) => this.publicJob(j)),
      meta: { total, page, limit, pages: Math.ceil(total / limit) },
    };
  }

  async findOne(collegeId: string, id: string) {
    const job = await this.prisma.job.findFirst({
      where: { id, ...this.visibleToCollege(collegeId) },
      include: {
        company: true,
        _count: { select: { applications: { where: { collegeId } } } },
      },
    });
    if (!job) throw new NotFoundException('Job not found');
    return this.publicJob(job);
  }

  async update(collegeId: string, id: string, dto: UpdateJobDto) {
    const job = await this.prisma.job.findFirst({ where: { id, collegeId } });
    if (!job) throw new NotFoundException('Job not found');
    if (job.status === 'CLOSED') throw new BadRequestException('Cannot edit a closed job');

    const {
      ctcMin,
      ctcMax,
      minCgpa,
      minTenthPercentage,
      minTwelfthPercentage,
      minUgPercentage,
      applicationDeadline,
      applicationFormFields,
      ...rest
    } = dto;
    const updated = await this.prisma.job.update({
      where: { id },
      data: {
        ...rest,
        ...(ctcMin !== undefined ? { ctcMin: this.decimalOrNull(ctcMin) } : {}),
        ...(ctcMax !== undefined ? { ctcMax: this.decimalOrNull(ctcMax) } : {}),
        ...(minCgpa !== undefined ? { minCgpa: this.decimalOrNull(minCgpa) } : {}),
        ...(minTenthPercentage !== undefined
          ? { minTenthPercentage: this.decimalOrNull(minTenthPercentage) }
          : {}),
        ...(minTwelfthPercentage !== undefined
          ? { minTwelfthPercentage: this.decimalOrNull(minTwelfthPercentage) }
          : {}),
        ...(minUgPercentage !== undefined
          ? { minUgPercentage: this.decimalOrNull(minUgPercentage) }
          : {}),
        ...(applicationDeadline !== undefined
          ? { applicationDeadline: applicationDeadline ? new Date(applicationDeadline) : null }
          : {}),
        ...(applicationFormFields !== undefined
          ? { applicationFormFields: applicationFormFields as unknown as Prisma.InputJsonValue }
          : {}),
      },
      include: { company: true, _count: { select: { applications: true } } },
    });
    return this.publicJob(updated);
  }

  async publish(collegeId: string, id: string) {
    const job = await this.prisma.job.findFirst({ where: { id, collegeId } });
    if (!job) throw new NotFoundException('Job not found');
    if (job.status === 'PUBLISHED') throw new BadRequestException('Job already published');
    if (job.status === 'CLOSED') throw new BadRequestException('Cannot publish a closed job');

    const updated = await this.prisma.job.update({
      where: { id },
      data: { status: 'PUBLISHED', publishedAt: new Date() },
      include: { company: true, _count: { select: { applications: true } } },
    });

    // Alert EVERY active student at the college that a new job is live (eligibility
    // is enforced at apply time, so non-eligible students see it but can't apply).
    const recs = await this.prisma.student.findMany({
      where: { collegeId, isActive: true },
      select: { userId: true },
    });
    if (recs.length > 0) {
      const companyName = updated.company?.name ?? updated.companyName ?? null;
      await this.notifications.notifyMany(
        recs.map((r) => r.userId),
        collegeId,
        {
          type: 'GENERAL',
          title: 'New job posted',
          body: companyName ? `${updated.title} · ${companyName}` : updated.title,
          link: '/me/jobs',
        },
      );
    }
    // The officer still sees how many can actually apply.
    const eligible = await this.eligibleStudents(collegeId, id);
    return { job: this.publicJob(updated), eligibleCount: eligible.length };
  }

  // Resolve a job's (private) PDF reference for streaming — scoped to jobs the
  // caller's college can see (own + platform jobs targeted to them).
  async pdfRef(collegeId: string, id: string) {
    const job = await this.prisma.job.findFirst({
      where: { id, ...this.visibleToCollege(collegeId) },
      select: { pdfUrl: true, pdfName: true },
    });
    if (!job?.pdfUrl) throw new NotFoundException('No PDF for this job');
    return { pdfUrl: job.pdfUrl, pdfName: job.pdfName };
  }

  async remove(collegeId: string, id: string) {
    // Only the owning college can delete its own job (platform jobs excluded by
    // the collegeId filter). Applications cascade-delete with the job.
    const job = await this.prisma.job.findFirst({ where: { id, collegeId } });
    if (!job) throw new NotFoundException('Job not found');
    await this.prisma.job.delete({ where: { id } });
    return { success: true };
  }

  async close(collegeId: string, id: string) {
    const job = await this.prisma.job.findFirst({ where: { id, collegeId } });
    if (!job) throw new NotFoundException('Job not found');
    if (job.status === 'CLOSED') throw new BadRequestException('Job already closed');

    const updated = await this.prisma.job.update({
      where: { id },
      data: { status: 'CLOSED', closedAt: new Date() },
      include: { company: true, _count: { select: { applications: true } } },
    });
    return this.publicJob(updated);
  }

  private async placedStudentIds(collegeId: string) {
    const apps = await this.prisma.application.findMany({
      where: { collegeId, stage: { in: [...PLACING_STAGES] } },
      select: { studentId: true },
      distinct: ['studentId'],
    });
    return new Set(apps.map((a) => a.studentId));
  }

  private async isStudentPlaced(studentId: string) {
    const count = await this.prisma.application.count({
      where: { studentId, stage: { in: [...PLACING_STAGES] } },
    });
    return count > 0;
  }

  // Officer preview: every active, verified, non-placed student who matches.
  async eligibleStudents(collegeId: string, jobId: string) {
    const job = await this.prisma.job.findFirst({ where: { id: jobId, collegeId } });
    if (!job) throw new NotFoundException('Job not found');

    const students = await this.prisma.student.findMany({
      where: {
        collegeId,
        isActive: true,
        verificationStatus: 'VERIFIED',
      },
      include: { user: true, resume: { select: { id: true } } },
    });

    const placedStudentIds = await this.placedStudentIds(collegeId);
    const criteria = toEligibilityJob(job);
    return students
      .filter(
        (s) =>
          checkEligibility(toEligibilityStudent(s, placedStudentIds.has(s.id)), criteria).eligible,
      )
      .map((s) => ({
        id: s.id,
        rollNumber: s.rollNumber,
        fullName: s.user.fullName,
        email: s.user.email,
        branch: s.branch,
        cgpa: s.cgpa != null ? Number(s.cgpa) : null,
      }));
  }

  // ─────────────── Platform Admin: cross-college broadcast jobs ───────────────

  async createPlatform(createdById: string, dto: CreatePlatformJobDto) {
    await this.assertCollegesExist(dto.targetCollegeIds);

    const {
      companyName,
      targetCollegeIds,
      ctcMin,
      ctcMax,
      minCgpa,
      minTenthPercentage,
      minTwelfthPercentage,
      minUgPercentage,
      applicationDeadline,
      applicationFormFields,
      ...rest
    } = dto;
    const job = await this.prisma.job.create({
      data: {
        scope: 'PLATFORM',
        collegeId: null,
        companyId: null,
        companyName,
        targetCollegeIds,
        createdById,
        ...rest,
        ctcMin: this.decimalOrNull(ctcMin),
        ctcMax: this.decimalOrNull(ctcMax),
        minCgpa: this.decimalOrNull(minCgpa),
        minTenthPercentage: this.decimalOrNull(minTenthPercentage),
        minTwelfthPercentage: this.decimalOrNull(minTwelfthPercentage),
        minUgPercentage: this.decimalOrNull(minUgPercentage),
        applicationDeadline: applicationDeadline ? new Date(applicationDeadline) : null,
        ...(applicationFormFields !== undefined
          ? { applicationFormFields: applicationFormFields as unknown as Prisma.InputJsonValue }
          : {}),
      },
    });
    return this.publicJob({ ...job, company: null });
  }

  async listPlatform(q: ListJobsQuery) {
    const page = q.page ?? 1;
    const limit = q.limit ?? 25;
    const where: Prisma.JobWhereInput = {
      scope: 'PLATFORM',
      ...(q.status ? { status: q.status as Prisma.JobWhereInput['status'] } : {}),
      ...(q.search ? { title: { contains: q.search, mode: 'insensitive' } } : {}),
    };

    const [total, jobs] = await this.prisma.$transaction([
      this.prisma.job.count({ where }),
      this.prisma.job.findMany({
        where,
        include: { _count: { select: { applications: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return {
      items: jobs.map((j) => this.publicJob({ ...j, company: null })),
      meta: { total, page, limit, pages: Math.ceil(total / limit) },
    };
  }

  async findOnePlatform(id: string) {
    const job = await this.prisma.job.findFirst({
      where: { id, scope: 'PLATFORM' },
      include: { _count: { select: { applications: true } } },
    });
    if (!job) throw new NotFoundException('Job not found');
    return this.publicJob({ ...job, company: null });
  }

  async updatePlatform(id: string, dto: UpdatePlatformJobDto) {
    const job = await this.prisma.job.findFirst({ where: { id, scope: 'PLATFORM' } });
    if (!job) throw new NotFoundException('Job not found');
    if (job.status === 'CLOSED') throw new BadRequestException('Cannot edit a closed job');
    if (dto.targetCollegeIds) await this.assertCollegesExist(dto.targetCollegeIds);

    const {
      ctcMin,
      ctcMax,
      minCgpa,
      minTenthPercentage,
      minTwelfthPercentage,
      minUgPercentage,
      applicationDeadline,
      applicationFormFields,
      ...rest
    } = dto;
    const updated = await this.prisma.job.update({
      where: { id },
      data: {
        ...rest,
        ...(ctcMin !== undefined ? { ctcMin: this.decimalOrNull(ctcMin) } : {}),
        ...(ctcMax !== undefined ? { ctcMax: this.decimalOrNull(ctcMax) } : {}),
        ...(minCgpa !== undefined ? { minCgpa: this.decimalOrNull(minCgpa) } : {}),
        ...(minTenthPercentage !== undefined
          ? { minTenthPercentage: this.decimalOrNull(minTenthPercentage) }
          : {}),
        ...(minTwelfthPercentage !== undefined
          ? { minTwelfthPercentage: this.decimalOrNull(minTwelfthPercentage) }
          : {}),
        ...(minUgPercentage !== undefined
          ? { minUgPercentage: this.decimalOrNull(minUgPercentage) }
          : {}),
        ...(applicationDeadline !== undefined
          ? { applicationDeadline: applicationDeadline ? new Date(applicationDeadline) : null }
          : {}),
        ...(applicationFormFields !== undefined
          ? { applicationFormFields: applicationFormFields as unknown as Prisma.InputJsonValue }
          : {}),
      },
      include: { _count: { select: { applications: true } } },
    });
    return this.publicJob({ ...updated, company: null });
  }

  async publishPlatform(id: string) {
    const job = await this.prisma.job.findFirst({ where: { id, scope: 'PLATFORM' } });
    if (!job) throw new NotFoundException('Job not found');
    if (job.status === 'PUBLISHED') throw new BadRequestException('Job already published');
    if (job.status === 'CLOSED') throw new BadRequestException('Cannot publish a closed job');
    if (job.targetCollegeIds.length === 0) {
      throw new BadRequestException('Select at least one target college before publishing');
    }

    const updated = await this.prisma.job.update({
      where: { id },
      data: { status: 'PUBLISHED', publishedAt: new Date() },
      include: { _count: { select: { applications: true } } },
    });
    return this.publicJob({ ...updated, company: null });
  }

  async closePlatform(id: string) {
    const job = await this.prisma.job.findFirst({ where: { id, scope: 'PLATFORM' } });
    if (!job) throw new NotFoundException('Job not found');
    if (job.status === 'CLOSED') throw new BadRequestException('Job already closed');

    const updated = await this.prisma.job.update({
      where: { id },
      data: { status: 'CLOSED', closedAt: new Date() },
      include: { _count: { select: { applications: true } } },
    });
    return this.publicJob({ ...updated, company: null });
  }

  private async assertCollegesExist(ids: string[]) {
    const found = await this.prisma.college.count({ where: { id: { in: ids } } });
    if (found !== ids.length)
      throw new BadRequestException('One or more target colleges are invalid');
  }

  // ─────────────── Student-facing ───────────────

  // A student sees a job if it's their own college's job, OR a platform-broadcast
  // job that targets their college. (collegeId is non-null for any real student.)
  private visibleToCollege(collegeId: string): Prisma.JobWhereInput {
    return {
      OR: [{ collegeId }, { scope: 'PLATFORM', targetCollegeIds: { has: collegeId } }],
    };
  }

  // Student job feed: every published job visible to the college, plus closed
  // jobs the student already applied to (so they can track outcomes). Annotated
  // with eligibility and application state.
  async studentFeed(userId: string) {
    const student = await this.studentForUser(userId);

    const publishedJobs = await this.prisma.job.findMany({
      where: { status: 'PUBLISHED', ...this.visibleToCollege(student.collegeId) },
      include: { company: true },
      orderBy: { publishedAt: 'desc' },
    });

    // Include closed jobs the student applied to so they remain visible under
    // "Applied" / "Closed" categories even after the posting closes.
    const closedAppliedJobIds = await this.prisma.application.findMany({
      where: {
        studentId: student.id,
        job: { status: 'CLOSED', ...this.visibleToCollege(student.collegeId) },
      },
      select: { jobId: true },
    });
    const closedAppliedIds = new Set(closedAppliedJobIds.map((a) => a.jobId));

    const closedAppliedJobs =
      closedAppliedIds.size > 0
        ? await this.prisma.job.findMany({
            where: { id: { in: [...closedAppliedIds] }, status: 'CLOSED' },
            include: { company: true },
            orderBy: { closedAt: 'desc' },
          })
        : [];

    // There should be no overlap (statuses are mutually exclusive), but dedupe
    // defensively and keep published jobs first.
    const seen = new Set<string>();
    const jobs: typeof publishedJobs = [];
    for (const j of [...publishedJobs, ...closedAppliedJobs]) {
      if (seen.has(j.id)) continue;
      seen.add(j.id);
      jobs.push(j);
    }

    const me = toEligibilityStudent(student, await this.isStudentPlaced(student.id));

    const myApps = await this.prisma.application.findMany({
      where: { studentId: student.id, jobId: { in: jobs.map((j) => j.id) } },
      select: { jobId: true, stage: true },
    });
    const appliedMap = new Map(myApps.map((a) => [a.jobId, a.stage]));

    // Show every published job; annotate eligibility. Apply is still gated
    // server-side (see apply()) — students can browse but only apply if eligible.
    return jobs.map((j) => {
      const { eligible, reasons } = checkApplyEligibility(me, toEligibilityJob(j));
      return {
        ...this.publicJob(j),
        eligible,
        eligibilityReasons: reasons,
        applied: appliedMap.has(j.id),
        myStage: appliedMap.get(j.id) ?? null,
      };
    });
  }

  async studentJobDetail(userId: string, jobId: string) {
    const student = await this.studentForUser(userId);
    const job = await this.prisma.job.findFirst({
      where: { id: jobId, ...this.visibleToCollege(student.collegeId) },
      include: { company: true },
    });
    if (!job) throw new NotFoundException('Job not found');

    const app = await this.prisma.application.findUnique({
      where: { jobId_studentId: { jobId, studentId: student.id } },
      select: { stage: true },
    });

    // Students can view published jobs, or closed jobs they applied to.
    if (job.status !== 'PUBLISHED' && !(job.status === 'CLOSED' && app)) {
      throw new NotFoundException('Job not found');
    }

    const { eligible, reasons } = checkApplyEligibility(
      toEligibilityStudent(student, await this.isStudentPlaced(student.id)),
      toEligibilityJob(job),
    );

    return {
      ...this.publicJob(job),
      eligible,
      eligibilityReasons: reasons,
      applied: !!app,
      myStage: app?.stage ?? null,
    };
  }

  async apply(userId: string, jobId: string, formResponses?: Record<string, string>) {
    const student = await this.studentForUser(userId);
    const job = await this.prisma.job.findFirst({
      where: { id: jobId, ...this.visibleToCollege(student.collegeId) },
    });
    if (!job || job.status !== 'PUBLISHED') throw new NotFoundException('Job not found');

    if (job.applicationDeadline && job.applicationDeadline.getTime() < Date.now()) {
      throw new BadRequestException('Application deadline has passed');
    }

    // Re-validate eligibility server-side — the feed is not the authority.
    const { eligible, reasons } = checkApplyEligibility(
      toEligibilityStudent(student, await this.isStudentPlaced(student.id)),
      toEligibilityJob(job),
    );
    if (!eligible) throw new ForbiddenException(`Not eligible: ${reasons.join(', ')}`);

    const existing = await this.prisma.application.findUnique({
      where: { jobId_studentId: { jobId, studentId: student.id } },
    });
    if (existing) throw new BadRequestException('Already applied to this job');

    // Validate answers against the job's custom application form, if any.
    const fields = (job.applicationFormFields as ApplicationField[] | null) ?? [];
    const responses = this.sanitizeResponses(fields, formResponses);

    return this.prisma.application.create({
      data: {
        collegeId: student.collegeId,
        jobId,
        studentId: student.id,
        stage: 'APPLIED',
        formResponses: responses,
        stageHistory: {
          create: { fromStage: null, toStage: 'APPLIED', changedById: userId, note: 'Applied' },
        },
      },
    });
  }

  // Keep only answers for known fields; enforce required ones.
  private sanitizeResponses(
    fields: ApplicationField[],
    responses?: Record<string, string>,
  ): Prisma.InputJsonValue | undefined {
    if (fields.length === 0) return undefined;
    const out: Record<string, string> = {};
    for (const f of fields) {
      const raw = responses?.[f.id];
      const value = typeof raw === 'string' ? raw.trim() : '';
      if (!value) {
        if (f.required) throw new BadRequestException(`"${f.label}" is required`);
        continue;
      }
      out[f.id] = value;
    }
    return out;
  }

  private async studentForUser(
    userId: string,
  ): Promise<Student & { resume: { id: string } | null }> {
    const student = await this.prisma.student.findUnique({
      where: { userId },
      include: { resume: { select: { id: true } } },
    });
    if (!student) throw new ForbiddenException('No student profile for this account');
    return student;
  }

  private publicJob(j: {
    id: string;
    scope: string;
    title: string;
    description: string | null;
    jobType: string;
    workMode: string | null;
    location: string | null;
    experienceMin: number | null;
    experienceMax: number | null;
    ctcMin: Prisma.Decimal | null;
    ctcMax: Prisma.Decimal | null;
    eligibleCourses: string[];
    eligibleBranches: string[];
    minCgpa: Prisma.Decimal | null;
    minTenthPercentage: Prisma.Decimal | null;
    minTwelfthPercentage: Prisma.Decimal | null;
    minUgPercentage: Prisma.Decimal | null;
    eligibleGenders: string[];
    maxActiveBacklogs: number | null;
    maxTotalBacklogs: number | null;
    graduationYears: number[];
    applicationFormFields?: Prisma.JsonValue;
    pdfUrl?: string | null;
    pdfName?: string | null;
    status: string;
    applicationDeadline: Date | null;
    publishedAt: Date | null;
    closedAt: Date | null;
    createdAt: Date;
    collegeId: string | null;
    targetCollegeIds: string[];
    companyId: string | null;
    companyName: string | null;
    company?: { id: string; name: string; logoUrl: string | null; industry: string | null } | null;
    _count?: { applications: number };
  }) {
    const isPlatform = j.scope === 'PLATFORM';
    return {
      id: j.id,
      scope: j.scope,
      isPlatform,
      title: j.title,
      description: j.description,
      jobType: j.jobType,
      workMode: j.workMode,
      location: j.location,
      experienceMin: j.experienceMin,
      experienceMax: j.experienceMax,
      ctcMin: j.ctcMin != null ? Number(j.ctcMin) : null,
      ctcMax: j.ctcMax != null ? Number(j.ctcMax) : null,
      eligibleCourses: j.eligibleCourses,
      eligibleBranches: j.eligibleBranches,
      minCgpa: j.minCgpa != null ? Number(j.minCgpa) : null,
      minTenthPercentage: j.minTenthPercentage != null ? Number(j.minTenthPercentage) : null,
      minTwelfthPercentage: j.minTwelfthPercentage != null ? Number(j.minTwelfthPercentage) : null,
      minUgPercentage: j.minUgPercentage != null ? Number(j.minUgPercentage) : null,
      eligibleGenders: j.eligibleGenders,
      maxActiveBacklogs: j.maxActiveBacklogs,
      maxTotalBacklogs: j.maxTotalBacklogs,
      graduationYears: j.graduationYears,
      applicationFormFields: (j.applicationFormFields as ApplicationField[] | null) ?? [],
      pdfUrl: j.pdfUrl ?? null,
      pdfName: j.pdfName ?? null,
      status: j.status,
      applicationDeadline: j.applicationDeadline,
      publishedAt: j.publishedAt,
      closedAt: j.closedAt,
      createdAt: j.createdAt,
      collegeId: j.collegeId,
      targetCollegeIds: j.targetCollegeIds,
      companyId: j.companyId,
      // Platform jobs carry a free-text company name; college jobs a Company row.
      companyName: j.company?.name ?? j.companyName ?? null,
      company: j.company
        ? {
            id: j.company.id,
            name: j.company.name,
            logoUrl: j.company.logoUrl,
            industry: j.company.industry,
          }
        : undefined,
      applicationCount: j._count?.applications,
    };
  }
}

function toEligibilityStudent(
  s: {
    verificationStatus: string;
    course: string;
    branch: string;
    graduationYear: number;
    cgpa: Prisma.Decimal | null;
    tenthPercentage: Prisma.Decimal | null;
    twelfthPercentage: Prisma.Decimal | null;
    ugPercentage: Prisma.Decimal | null;
    gender: string | null;
    activeBacklogs: number;
    totalBacklogs: number;
    resume?: { id: string } | null;
  },
  isPlaced: boolean,
): EligibilityStudent {
  return {
    verificationStatus: s.verificationStatus,
    isPlaced,
    course: s.course,
    branch: s.branch,
    graduationYear: s.graduationYear,
    cgpa: s.cgpa != null ? Number(s.cgpa) : null,
    tenthPercentage: s.tenthPercentage != null ? Number(s.tenthPercentage) : null,
    twelfthPercentage: s.twelfthPercentage != null ? Number(s.twelfthPercentage) : null,
    ugPercentage: s.ugPercentage != null ? Number(s.ugPercentage) : null,
    gender: s.gender,
    activeBacklogs: s.activeBacklogs,
    totalBacklogs: s.totalBacklogs,
    hasResume: !!s.resume,
  };
}

function toEligibilityJob(j: {
  eligibleCourses: string[];
  eligibleBranches: string[];
  graduationYears: number[];
  minCgpa: Prisma.Decimal | null;
  minTenthPercentage: Prisma.Decimal | null;
  minTwelfthPercentage: Prisma.Decimal | null;
  minUgPercentage: Prisma.Decimal | null;
  eligibleGenders: string[];
  maxActiveBacklogs: number | null;
  maxTotalBacklogs: number | null;
}): EligibilityJob {
  return {
    eligibleCourses: j.eligibleCourses,
    eligibleBranches: j.eligibleBranches,
    graduationYears: j.graduationYears,
    minCgpa: j.minCgpa != null ? Number(j.minCgpa) : null,
    minTenthPercentage: j.minTenthPercentage != null ? Number(j.minTenthPercentage) : null,
    minTwelfthPercentage: j.minTwelfthPercentage != null ? Number(j.minTwelfthPercentage) : null,
    minUgPercentage: j.minUgPercentage != null ? Number(j.minUgPercentage) : null,
    eligibleGenders: j.eligibleGenders,
    maxActiveBacklogs: j.maxActiveBacklogs,
    maxTotalBacklogs: j.maxTotalBacklogs,
  };
}
