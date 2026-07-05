import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PRISMA } from '../../common/prisma.module';
import { Prisma } from '@ellixr/database';
import type { PrismaClient } from '@ellixr/database';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateRoundDto, PlaceApplicantDto, UpdateRoundDto } from './rounds-dto';

// Student fields the funnel screen needs, reused across the two funnel queries.
const STUDENT_INCLUDE = {
  include: {
    user: { select: { fullName: true, email: true } },
    resume: { select: { publicSlug: true, isPublished: true } },
  },
} satisfies Prisma.StudentDefaultArgs;

// Shape of a student on the funnel screen.
interface FunnelStudent {
  applicationId: string;
  studentId: string;
  rollNumber: string;
  fullName: string;
  branch: string;
  email: string;
  resumeSlug: string | null;
  appliedAt: Date;
  status: string;
  offerCtc: number | null;
  offerLetterUrl: string | null;
}

@Injectable()
export class RoundsService {
  constructor(
    @Inject(PRISMA) private readonly prisma: PrismaClient,
    private readonly notifications: NotificationsService,
  ) {}

  // A job the officer's college can run rounds on: its own college job, OR a
  // PLATFORM-broadcast job targeted to the college. Each college keeps its own
  // round numbering (JobRound is unique per [jobId, collegeId, seq]).
  private async resolveJob(collegeId: string, jobId: string) {
    const job = await this.prisma.job.findFirst({
      where: {
        id: jobId,
        OR: [{ collegeId }, { scope: 'PLATFORM', targetCollegeIds: { has: collegeId } }],
      },
      select: { id: true, title: true, companyName: true, company: { select: { name: true } } },
    });
    if (!job) throw new NotFoundException('Job not found');
    return job;
  }

  private companyName(job: { companyName: string | null; company: { name: string } | null }) {
    return job.company?.name ?? job.companyName ?? 'the company';
  }

  // ─────────────── The whole funnel for the officer screen ───────────────
  async funnel(collegeId: string, jobId: string) {
    await this.resolveJob(collegeId, jobId);

    const [rounds, apps] = await Promise.all([
      this.prisma.jobRound.findMany({
        where: { jobId, collegeId },
        orderBy: { seq: 'asc' },
        include: {
          participants: {
            include: { application: { include: { student: STUDENT_INCLUDE } } },
          },
        },
      }),
      this.prisma.application.findMany({
        where: { jobId, collegeId },
        orderBy: { appliedAt: 'asc' },
        include: { student: STUDENT_INCLUDE },
      }),
    ]);

    const openRoundIds = new Set(rounds.filter((r) => r.status === 'OPEN').map((r) => r.id));
    // Applications currently waiting in an open round can't be "finalists".
    const pendingInOpen = new Set(
      rounds
        .flatMap((r) => r.participants)
        .filter((p) => openRoundIds.has(p.roundId) && p.outcome === 'PENDING')
        .map((p) => p.applicationId),
    );

    const pub = (a: (typeof apps)[number]) => this.toStudent(a);

    return {
      applicantsTotal: apps.length,
      inProgress: apps.filter((a) => a.status === 'IN_PROGRESS').length,
      selectedCount: apps.filter((a) => a.status === 'SELECTED').length,
      rejectedCount: apps.filter((a) => a.status === 'REJECTED').length,
      rounds: rounds.map((r) => ({
        id: r.id,
        seq: r.seq,
        title: r.title,
        scheduledAt: r.scheduledAt,
        status: r.status,
        overdue: !!r.scheduledAt && r.status === 'OPEN' && r.scheduledAt.getTime() < Date.now(),
        participants: r.participants.map((p) => ({
          ...this.toStudent(p.application),
          outcome: p.outcome,
        })),
      })),
      // Applied but not yet placed into any round (before Round 1, or late applicants).
      pool: apps
        .filter((a) => a.status === 'APPLIED')
        .map(pub),
      // Cleared every existing round, not waiting in an open one → ready to place or advance.
      finalists: apps
        .filter((a) => a.status === 'IN_PROGRESS' && !pendingInOpen.has(a.id))
        .map(pub),
      placed: apps.filter((a) => a.status === 'SELECTED').map(pub),
    };
  }

  // ─────────────── Round lifecycle ───────────────
  async createRound(collegeId: string, jobId: string, createdById: string, dto: CreateRoundDto) {
    await this.resolveJob(collegeId, jobId);

    const last = await this.prisma.jobRound.findFirst({
      where: { jobId, collegeId },
      orderBy: { seq: 'desc' },
    });
    const seq = (last?.seq ?? 0) + 1;
    if (last && last.status === 'OPEN') {
      throw new BadRequestException(`Decide "${last.title}" before adding another round.`);
    }
    const title = dto.title?.trim() || `Round ${seq}`;

    const round = await this.prisma.jobRound.create({
      data: {
        jobId,
        collegeId,
        seq,
        title,
        scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : null,
        createdById,
      },
    });

    // Enrol the cohort: Round 1 = everyone still active; later rounds = those who
    // advanced from the previous round.
    let cohort: string[];
    if (seq === 1) {
      const rows = await this.prisma.application.findMany({
        where: { jobId, collegeId, status: { in: ['APPLIED', 'IN_PROGRESS'] } },
        select: { id: true },
      });
      cohort = rows.map((r) => r.id);
    } else {
      const rows = await this.prisma.applicationRound.findMany({
        where: {
          round: { jobId, collegeId, seq: seq - 1 },
          outcome: 'ADVANCED',
          application: { status: 'IN_PROGRESS' },
        },
        select: { applicationId: true },
      });
      cohort = rows.map((r) => r.applicationId);
    }

    if (cohort.length > 0) {
      await this.prisma.$transaction([
        this.prisma.applicationRound.createMany({
          data: cohort.map((applicationId) => ({ applicationId, roundId: round.id })),
          skipDuplicates: true,
        }),
        this.prisma.application.updateMany({
          where: { id: { in: cohort } },
          data: { status: 'IN_PROGRESS' },
        }),
      ]);
    }

    return { ...round, enrolled: cohort.length };
  }

  async updateRound(collegeId: string, jobId: string, roundId: string, dto: UpdateRoundDto) {
    await this.resolveJob(collegeId, jobId);
    const round = await this.prisma.jobRound.findFirst({ where: { id: roundId, jobId, collegeId } });
    if (!round) throw new NotFoundException('Round not found');
    return this.prisma.jobRound.update({
      where: { id: roundId },
      data: {
        ...(dto.title !== undefined ? { title: dto.title.trim() || round.title } : {}),
        ...(dto.scheduledAt !== undefined
          ? { scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : null }
          : {}),
      },
    });
  }

  // Only the latest round can be removed (and only while OPEN) — an undo for a
  // round added by mistake. Participation rows cascade.
  async deleteRound(collegeId: string, jobId: string, roundId: string) {
    await this.resolveJob(collegeId, jobId);
    const round = await this.prisma.jobRound.findFirst({ where: { id: roundId, jobId, collegeId } });
    if (!round) throw new NotFoundException('Round not found');
    if (round.status === 'DECIDED') {
      throw new BadRequestException('A decided round cannot be deleted.');
    }
    const latest = await this.prisma.jobRound.findFirst({
      where: { jobId, collegeId },
      orderBy: { seq: 'desc' },
      select: { id: true },
    });
    if (latest?.id !== roundId) {
      throw new BadRequestException('Only the most recent round can be removed.');
    }
    await this.prisma.jobRound.delete({ where: { id: roundId } });
    return { success: true };
  }

  // ─────────────── Decide a round (advance some, auto-reject the rest) ───────────────
  async decideRound(
    collegeId: string,
    jobId: string,
    roundId: string,
    advanceIds: string[],
  ) {
    const job = await this.resolveJob(collegeId, jobId);
    const round = await this.prisma.jobRound.findFirst({ where: { id: roundId, jobId, collegeId } });
    if (!round) throw new NotFoundException('Round not found');
    if (round.status === 'DECIDED') throw new BadRequestException('This round is already decided.');

    const parts = await this.prisma.applicationRound.findMany({
      where: { roundId, outcome: 'PENDING' },
      include: { application: { select: { id: true, studentId: true, student: { select: { userId: true } } } } },
    });
    const advance = new Set(advanceIds);
    const advanced = parts.filter((p) => advance.has(p.applicationId));
    const rejected = parts.filter((p) => !advance.has(p.applicationId));

    const now = new Date();
    await this.prisma.$transaction([
      ...advanced.map((p) =>
        this.prisma.applicationRound.update({
          where: { id: p.id },
          data: { outcome: 'ADVANCED', decidedAt: now },
        }),
      ),
      ...rejected.map((p) =>
        this.prisma.applicationRound.update({
          where: { id: p.id },
          data: { outcome: 'REJECTED', decidedAt: now },
        }),
      ),
      ...rejected.map((p) =>
        this.prisma.application.update({
          where: { id: p.applicationId },
          data: {
            status: 'REJECTED',
            stage: 'REJECTED',
            rejectedAt: now,
            rejectionReason: `Not selected in ${round.title}`,
          },
        }),
      ),
      this.prisma.jobRound.update({ where: { id: roundId }, data: { status: 'DECIDED' } }),
    ]);

    // Best-effort notifications.
    const company = this.companyName(job);
    await Promise.all([
      ...advanced.map((p) =>
        this.notifications.notify({
          userId: p.application.student.userId,
          collegeId,
          type: 'APPLICATION_STAGE_CHANGED',
          title: `Cleared ${round.title} — ${company}`,
          body: `You've advanced past ${round.title} for ${job.title}.`,
          link: '/me/applications',
        }),
      ),
      ...rejected.map((p) =>
        this.notifications.notify({
          userId: p.application.student.userId,
          collegeId,
          type: 'APPLICATION_STAGE_CHANGED',
          title: `Update — ${job.title}`,
          body: `You were not selected in ${round.title} for ${job.title} at ${company}.`,
          link: '/me/applications',
        }),
      ),
    ]);

    return { advanced: advanced.length, rejected: rejected.length };
  }

  // ─────────────── Select / place a finalist ───────────────
  async place(
    collegeId: string,
    jobId: string,
    applicationId: string,
    dto: PlaceApplicantDto,
  ) {
    const job = await this.resolveJob(collegeId, jobId);
    const app = await this.prisma.application.findFirst({
      where: { id: applicationId, jobId, collegeId },
      include: { student: { select: { userId: true } } },
    });
    if (!app) throw new NotFoundException('Application not found');
    if (app.status === 'REJECTED' || app.status === 'WITHDRAWN') {
      throw new BadRequestException('This applicant is no longer in the running.');
    }

    await this.prisma.$transaction([
      this.prisma.application.update({
        where: { id: applicationId },
        data: {
          status: 'SELECTED',
          // Legacy bridge so analytics/reports keep counting placements.
          stage: 'OFFER_ACCEPTED',
          ...(dto.offerCtc != null ? { offerCtc: new Prisma.Decimal(dto.offerCtc) } : {}),
          ...(dto.offerLetterUrl !== undefined ? { offerLetterUrl: dto.offerLetterUrl || null } : {}),
        },
      }),
      this.prisma.student.update({ where: { id: app.studentId }, data: { status: 'PLACED' } }),
    ]);

    await this.notifications.notify({
      userId: app.student.userId,
      collegeId,
      type: 'OFFER_RELEASED',
      title: `Selected — ${this.companyName(job)} 🎉`,
      body: `Congratulations! You've been selected for ${job.title}.`,
      link: '/me/applications',
    });

    return { success: true };
  }

  // Manual reject (outside a round decision).
  async reject(collegeId: string, jobId: string, applicationId: string, reason?: string) {
    const job = await this.resolveJob(collegeId, jobId);
    const app = await this.prisma.application.findFirst({
      where: { id: applicationId, jobId, collegeId },
      include: { student: { select: { userId: true } } },
    });
    if (!app) throw new NotFoundException('Application not found');

    await this.prisma.application.update({
      where: { id: applicationId },
      data: {
        status: 'REJECTED',
        stage: 'REJECTED',
        rejectedAt: new Date(),
        rejectionReason: reason ?? 'Not shortlisted',
      },
    });
    await this.notifications.notify({
      userId: app.student.userId,
      collegeId,
      type: 'APPLICATION_STAGE_CHANGED',
      title: `Update — ${job.title}`,
      body: `Your application for ${job.title} at ${this.companyName(job)} was not taken forward.`,
      link: '/me/applications',
    });
    return { success: true };
  }

  // ─────────────── Officer alert: rounds whose date has passed, still undecided ───────────────
  async pendingResults(collegeId: string) {
    const rounds = await this.prisma.jobRound.findMany({
      where: {
        collegeId,
        status: 'OPEN',
        scheduledAt: { not: null, lt: new Date() },
      },
      orderBy: { scheduledAt: 'asc' },
      include: { job: { select: { id: true, title: true } } },
    });
    return rounds.map((r) => ({
      jobId: r.jobId,
      jobTitle: r.job.title,
      roundId: r.id,
      roundTitle: r.title,
      scheduledAt: r.scheduledAt,
    }));
  }

  // ── helpers ──
  private toStudent(a: {
    id: string;
    studentId: string;
    appliedAt: Date;
    status: string;
    offerCtc: Prisma.Decimal | null;
    offerLetterUrl: string | null;
    student: {
      rollNumber: string;
      branch: string;
      user: { fullName: string; email: string };
      resume: { publicSlug: string; isPublished: boolean } | null;
    };
  }): FunnelStudent {
    return {
      applicationId: a.id,
      studentId: a.studentId,
      rollNumber: a.student.rollNumber,
      fullName: a.student.user.fullName,
      branch: a.student.branch,
      email: a.student.user.email,
      resumeSlug: a.student.resume?.isPublished ? a.student.resume.publicSlug : null,
      appliedAt: a.appliedAt,
      status: a.status,
      offerCtc: a.offerCtc != null ? Number(a.offerCtc) : null,
      offerLetterUrl: a.offerLetterUrl,
    };
  }
}
