import { Inject, Injectable } from '@nestjs/common';
import { PRISMA } from '../../common/prisma.module';
import type { PrismaClient } from '@ellixr/database';

// Application stages that count as a secured placement / a released offer.
const PLACING_STAGES = ['OFFER_ACCEPTED', 'JOINED'] as const;
const OFFER_STAGES = ['OFFER_RELEASED', 'OFFER_ACCEPTED', 'JOINED'] as const;
// Rounds-funnel outcome statuses, in progression order.
const APPLICATION_STATUSES = ['APPLIED', 'IN_PROGRESS', 'SELECTED', 'REJECTED', 'WITHDRAWN'] as const;

const num = (x: unknown): number | null => (x == null ? null : Number(x));

/**
 * Read-only analytics over Phase 2/3 data. Every query is tenant-scoped via the
 * collegeId taken from the authenticated user's JWT — never request input.
 */
@Injectable()
export class AnalyticsService {
  constructor(@Inject(PRISMA) private readonly prisma: PrismaClient) {}

  // ─────────────── Placement ───────────────
  async placement(collegeId: string) {
    const [verifiedCount, placedCount, offers] = await Promise.all([
      this.prisma.student.count({
        where: { collegeId, isActive: true, verificationStatus: 'VERIFIED' },
      }),
      this.prisma.student.count({ where: { collegeId, isActive: true, status: 'PLACED' } }),
      this.prisma.application.findMany({
        where: { collegeId, stage: { in: [...PLACING_STAGES] }, offerCtc: { not: null } },
        select: { offerCtc: true },
      }),
    ]);

    const packages = offers.map((o) => Number(o.offerCtc)).filter((n) => !Number.isNaN(n));
    const placementRate = verifiedCount > 0 ? Math.round((placedCount / verifiedCount) * 1000) / 10 : 0;

    return {
      verifiedStudents: verifiedCount,
      placedStudents: placedCount,
      placementRate, // percentage, one decimal
      offersCount: packages.length,
      avgPackage: packages.length ? Math.round(mean(packages)) : null,
      medianPackage: packages.length ? Math.round(median(packages)) : null,
      highestPackage: packages.length ? Math.max(...packages) : null,
      lowestPackage: packages.length ? Math.min(...packages) : null,
      placementOverTime: await this.placementOverTime(collegeId),
    };
  }

  // Offers accepted per month, last 12 months, derived from stage-history.
  private async placementOverTime(collegeId: string) {
    const history = await this.prisma.applicationStageHistory.findMany({
      where: { application: { collegeId }, toStage: { in: [...PLACING_STAGES] } },
      select: { createdAt: true },
      orderBy: { createdAt: 'asc' },
    });
    const buckets = new Map<string, number>();
    for (const h of history) {
      const key = `${h.createdAt.getFullYear()}-${String(h.createdAt.getMonth() + 1).padStart(2, '0')}`;
      buckets.set(key, (buckets.get(key) ?? 0) + 1);
    }
    return [...buckets.entries()].map(([month, count]) => ({ month, count }));
  }

  // ─────────────── Jobs ───────────────
  async jobs(collegeId: string) {
    const [jobsPosted, jobsPublished, applicationsReceived, offersReleased] = await Promise.all([
      this.prisma.job.count({ where: { collegeId } }),
      this.prisma.job.count({ where: { collegeId, publishedAt: { not: null } } }),
      this.prisma.application.count({ where: { collegeId } }),
      this.prisma.application.count({ where: { collegeId, stage: { in: [...OFFER_STAGES] } } }),
    ]);
    return {
      jobsPosted,
      jobsPublished,
      applicationsReceived,
      offersReleased,
      conversionRate:
        applicationsReceived > 0
          ? Math.round((offersReleased / applicationsReceived) * 1000) / 10
          : 0,
    };
  }

  // ─────────────── Students ───────────────
  async students(collegeId: string) {
    const [total, active, placed, internships, completions] = await Promise.all([
      this.prisma.student.count({ where: { collegeId } }),
      this.prisma.student.count({ where: { collegeId, isActive: true } }),
      this.prisma.student.count({ where: { collegeId, status: 'PLACED' } }),
      this.prisma.internship.count({ where: { collegeId } }),
      this.prisma.student.findMany({ where: { collegeId }, select: { profileCompletion: true } }),
    ]);

    const buckets = { '0-25': 0, '25-50': 0, '50-75': 0, '75-100': 0 };
    for (const { profileCompletion: c } of completions) {
      if (c < 25) buckets['0-25']++;
      else if (c < 50) buckets['25-50']++;
      else if (c < 75) buckets['50-75']++;
      else buckets['75-100']++;
    }

    return {
      total,
      active,
      placed,
      unplaced: active - placed,
      internships,
      completionDistribution: buckets,
    };
  }

  // ─────────────── Funnel ───────────────
  // The rounds funnel tracks applications by outcome status (not the legacy
  // 12-stage enum): Applied → In progress → Selected, plus Rejected/Withdrawn.
  async funnel(collegeId: string) {
    const grouped = await this.prisma.application.groupBy({
      by: ['status'],
      where: { collegeId },
      _count: { _all: true },
    });
    const counts = new Map(grouped.map((g) => [g.status, g._count._all]));
    return APPLICATION_STATUSES.map((status) => ({ status, count: counts.get(status) ?? 0 }));
  }

  // ─────────────── Insights (enrichment) ───────────────
  // Multiple offers, "dream" offers (≥1.5× the average package), and repeat
  // recruiters (companies that have hired more than one student).
  async insights(collegeId: string) {
    const offerApps = await this.prisma.application.findMany({
      where: { collegeId, stage: { in: [...OFFER_STAGES] } },
      select: {
        studentId: true,
        jobId: true,
        offerCtc: true,
        student: { select: { rollNumber: true, user: { select: { fullName: true } } } },
        job: {
          select: { companyName: true, company: { select: { name: true } } },
        },
      },
    });

    // ── Multiple offers: distinct jobs offered per student ──
    const byStudent = new Map<
      string,
      { name: string; rollNumber: string; jobIds: Set<string>; best: number | null }
    >();
    for (const a of offerApps) {
      const entry = byStudent.get(a.studentId) ?? {
        name: a.student.user.fullName,
        rollNumber: a.student.rollNumber,
        jobIds: new Set<string>(),
        best: null,
      };
      entry.jobIds.add(a.jobId);
      const ctc = num(a.offerCtc);
      if (ctc != null) entry.best = entry.best == null ? ctc : Math.max(entry.best, ctc);
      byStudent.set(a.studentId, entry);
    }
    const multipleOfferStudents = [...byStudent.values()]
      .filter((s) => s.jobIds.size > 1)
      .map((s) => ({ name: s.name, rollNumber: s.rollNumber, offers: s.jobIds.size, bestPackage: s.best }))
      .sort((a, b) => b.offers - a.offers);

    // ── Dream offers: packages ≥ 1.5× the average package ──
    const packages = offerApps.map((a) => num(a.offerCtc)).filter((n): n is number => n != null);
    const avg = packages.length ? mean(packages) : 0;
    const dreamThreshold = avg > 0 ? Math.round(avg * 1.5) : null;
    const dreamOffers = dreamThreshold != null ? packages.filter((p) => p >= dreamThreshold).length : 0;

    // ── Repeat recruiters: companies hiring more than one student ──
    const byCompany = new Map<string, number>();
    for (const a of offerApps) {
      const name = a.job.company?.name ?? a.job.companyName ?? 'Unknown';
      byCompany.set(name, (byCompany.get(name) ?? 0) + 1);
    }
    const repeatRecruiters = [...byCompany.entries()]
      .filter(([, hires]) => hires > 1)
      .map(([company, hires]) => ({ company, hires }))
      .sort((a, b) => b.hires - a.hires);

    return {
      studentsWithMultipleOffers: multipleOfferStudents.length,
      multipleOfferStudents: multipleOfferStudents.slice(0, 20),
      dreamThreshold,
      dreamOffers,
      repeatRecruiters,
    };
  }

  // ─────────────── Breakdowns ───────────────
  async breakdowns(collegeId: string) {
    const [byBranch, byBatch, byCompany] = await Promise.all([
      this.branchBreakdown(collegeId),
      this.batchBreakdown(collegeId),
      this.companyBreakdown(collegeId),
    ]);
    return { byBranch, byBatch, byCompany };
  }

  // ─────────────── Platform-wide (PLATFORM_ADMIN, all colleges) ───────────────
  // Cross-tenant aggregate. Unlike every other method here this is intentionally
  // NOT scoped to a collegeId — it powers the Platform Admin dashboard.
  async platformOverview() {
    const [
      colleges,
      activeColleges,
      students,
      verifiedStudents,
      placedStudents,
      jobs,
      platformJobs,
      applications,
      offers,
    ] = await Promise.all([
      this.prisma.college.count(),
      this.prisma.college.count({ where: { isActive: true } }),
      this.prisma.student.count(),
      this.prisma.student.count({ where: { verificationStatus: 'VERIFIED' } }),
      this.prisma.student.count({ where: { status: 'PLACED' } }),
      this.prisma.job.count(),
      this.prisma.job.count({ where: { scope: 'PLATFORM' } }),
      this.prisma.application.count(),
      this.prisma.application.count({ where: { stage: { in: [...OFFER_STAGES] } } }),
    ]);

    const placementRate =
      verifiedStudents > 0 ? Math.round((placedStudents / verifiedStudents) * 1000) / 10 : 0;

    return {
      colleges,
      activeColleges,
      students,
      verifiedStudents,
      placedStudents,
      jobs,
      platformJobs,
      applications,
      offers,
      placementRate,
      studentsByCollege: await this.studentsByCollege(),
      placementsByBatch: await this.platformPlacementsByBatch(),
    };
  }

  // Top colleges by registered student count (for a dashboard breakdown).
  private async studentsByCollege() {
    const grouped = await this.prisma.student.groupBy({
      by: ['collegeId'],
      _count: { _all: true },
    });
    const colleges = await this.prisma.college.findMany({ select: { id: true, name: true } });
    const nameById = new Map(colleges.map((c) => [c.id, c.name]));
    return grouped
      .map((g) => ({
        collegeId: g.collegeId,
        name: nameById.get(g.collegeId) ?? 'Unknown',
        students: g._count._all,
      }))
      .sort((a, b) => b.students - a.students)
      .slice(0, 8);
  }

  // Platform-wide placements grouped by graduation year.
  private async platformPlacementsByBatch() {
    const placed = await this.prisma.application.findMany({
      where: { stage: { in: [...PLACING_STAGES] } },
      select: { student: { select: { graduationYear: true } } },
    });
    const map = new Map<number, number>();
    for (const a of placed) {
      const y = a.student.graduationYear;
      map.set(y, (map.get(y) ?? 0) + 1);
    }
    return [...map.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([graduationYear, placements]) => ({ graduationYear, placements }));
  }

  private async branchBreakdown(collegeId: string) {
    const students = await this.prisma.student.findMany({
      where: { collegeId, isActive: true },
      select: { branch: true, status: true },
    });
    const map = new Map<string, { total: number; placed: number }>();
    for (const s of students) {
      const row = map.get(s.branch) ?? { total: 0, placed: 0 };
      row.total++;
      if (s.status === 'PLACED') row.placed++;
      map.set(s.branch, row);
    }
    return [...map.entries()].map(([branch, { total, placed }]) => ({
      branch,
      total,
      placed,
      placementRate: total > 0 ? Math.round((placed / total) * 1000) / 10 : 0,
    }));
  }

  private async batchBreakdown(collegeId: string) {
    const students = await this.prisma.student.findMany({
      where: { collegeId, isActive: true },
      select: { graduationYear: true, status: true },
    });
    const map = new Map<number, { total: number; placed: number }>();
    for (const s of students) {
      const row = map.get(s.graduationYear) ?? { total: 0, placed: 0 };
      row.total++;
      if (s.status === 'PLACED') row.placed++;
      map.set(s.graduationYear, row);
    }
    return [...map.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([graduationYear, { total, placed }]) => ({
        graduationYear,
        total,
        placed,
        placementRate: total > 0 ? Math.round((placed / total) * 1000) / 10 : 0,
      }));
  }

  // Hires (placing-stage applications) grouped by hiring company.
  private async companyBreakdown(collegeId: string) {
    const apps = await this.prisma.application.findMany({
      where: { collegeId, stage: { in: [...PLACING_STAGES] } },
      select: {
        offerCtc: true,
        job: { select: { companyName: true, company: { select: { name: true } } } },
      },
    });
    const map = new Map<string, { hires: number; packages: number[] }>();
    for (const a of apps) {
      const name = a.job.company?.name ?? a.job.companyName ?? 'Unknown';
      const row = map.get(name) ?? { hires: 0, packages: [] };
      row.hires++;
      const ctc = num(a.offerCtc);
      if (ctc != null) row.packages.push(ctc);
      map.set(name, row);
    }
    return [...map.entries()]
      .map(([company, { hires, packages }]) => ({
        company,
        hires,
        avgPackage: packages.length ? Math.round(mean(packages)) : null,
      }))
      .sort((a, b) => b.hires - a.hires);
  }
}

function mean(xs: number[]) {
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

function median(xs: number[]) {
  const sorted = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}
