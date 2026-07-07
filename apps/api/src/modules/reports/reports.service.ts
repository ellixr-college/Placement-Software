import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { PRISMA } from '../../common/prisma.module';
import type { PrismaClient } from '@ellixr/database';
import type { ReportDataset } from './report-serializers';

// Stages that count as a secured placement.
const PLACING_STAGES = ['OFFER_ACCEPTED', 'JOINED'] as const;
const OFFER_STAGES = ['OFFER_RELEASED', 'OFFER_ACCEPTED', 'JOINED'] as const;
const ALL_STAGES = [
  'APPLIED',
  'VERIFIED',
  'SHORTLISTED',
  'ROUND_1',
  'ROUND_2',
  'ROUND_3',
  'HR',
  'OFFER_RELEASED',
  'OFFER_ACCEPTED',
  'JOINED',
  'REJECTED',
  'WITHDRAWN',
] as const;

export const REPORT_TYPES = [
  'students',
  'companies',
  'placement',
  'offers',
  'branch',
  'funnel',
] as const;
export type ReportType = (typeof REPORT_TYPES)[number];

// CTC is stored in rupees; surface it in lakhs (LPA) for human-readable exports.
const lpa = (v: unknown): number | null =>
  v == null ? null : Math.round((Number(v) / 100000) * 100) / 100;
const dec = (v: unknown): number | null => (v == null ? null : Number(v));

/**
 * Builds normalized, tenant-scoped report datasets. Every query filters by the
 * collegeId taken from the caller's JWT — never request input. The controller
 * serializes the returned dataset to CSV or XLSX and streams it.
 */
@Injectable()
export class ReportsService {
  constructor(@Inject(PRISMA) private readonly prisma: PrismaClient) {}

  async build(collegeId: string, type: ReportType): Promise<ReportDataset> {
    switch (type) {
      case 'students':
        return this.students(collegeId);
      case 'companies':
        return this.companies(collegeId);
      case 'placement':
        return this.placement(collegeId);
      case 'offers':
        return this.offers(collegeId);
      case 'branch':
        return this.branch(collegeId);
      case 'funnel':
        return this.funnel(collegeId);
      default:
        throw new BadRequestException(`Unknown report type: ${type as string}`);
    }
  }

  // ─────────────── Students ───────────────
  private async students(collegeId: string): Promise<ReportDataset> {
    const students = await this.prisma.student.findMany({
      where: { collegeId },
      orderBy: [{ branch: 'asc' }, { rollNumber: 'asc' }],
      select: {
        rollNumber: true,
        enrollmentNumber: true,
        course: true,
        branch: true,
        graduationYear: true,
        cgpa: true,
        activeBacklogs: true,
        totalBacklogs: true,
        verificationStatus: true,
        profileCompletion: true,
        isActive: true,
        user: { select: { fullName: true, email: true, phone: true } },
      },
    });

    return {
      filename: 'students',
      title: 'Students',
      columns: [
        { key: 'rollNumber', label: 'Roll Number' },
        { key: 'enrollmentNumber', label: 'Enrollment No.' },
        { key: 'fullName', label: 'Name' },
        { key: 'email', label: 'Email' },
        { key: 'phone', label: 'Phone' },
        { key: 'course', label: 'Course' },
        { key: 'branch', label: 'Branch' },
        { key: 'graduationYear', label: 'Graduation Year' },
        { key: 'cgpa', label: 'Percentage' },
        { key: 'activeBacklogs', label: 'Active Backlogs' },
        { key: 'totalBacklogs', label: 'Total Backlogs' },
        { key: 'verificationStatus', label: 'Verification' },
        { key: 'profileCompletion', label: 'Profile %' },
        { key: 'isActive', label: 'Active' },
      ],
      rows: students.map((s) => ({
        rollNumber: s.rollNumber,
        enrollmentNumber: s.enrollmentNumber,
        fullName: s.user.fullName,
        email: s.user.email,
        phone: s.user.phone,
        course: s.course,
        branch: s.branch,
        graduationYear: s.graduationYear,
        cgpa: dec(s.cgpa),
        activeBacklogs: s.activeBacklogs,
        totalBacklogs: s.totalBacklogs,
        verificationStatus: s.verificationStatus,
        profileCompletion: s.profileCompletion,
        isActive: s.isActive ? 'Yes' : 'No',
      })),
    };
  }

  // ─────────────── Companies ───────────────
  private async companies(collegeId: string): Promise<ReportDataset> {
    const companies = await this.prisma.company.findMany({
      where: { collegeId },
      orderBy: { name: 'asc' },
      select: {
        name: true,
        industry: true,
        city: true,
        website: true,
        isActive: true,
        _count: { select: { jobs: true } },
        contacts: {
          where: { isPrimary: true },
          take: 1,
          select: { name: true, email: true, phone: true },
        },
      },
    });

    return {
      filename: 'companies',
      title: 'Companies',
      columns: [
        { key: 'name', label: 'Company' },
        { key: 'industry', label: 'Industry' },
        { key: 'city', label: 'City' },
        { key: 'website', label: 'Website' },
        { key: 'jobsPosted', label: 'Jobs Posted' },
        { key: 'contactName', label: 'Primary Contact' },
        { key: 'contactEmail', label: 'Contact Email' },
        { key: 'contactPhone', label: 'Contact Phone' },
        { key: 'isActive', label: 'Active' },
      ],
      rows: companies.map((c) => ({
        name: c.name,
        industry: c.industry,
        city: c.city,
        website: c.website,
        jobsPosted: c._count.jobs,
        contactName: c.contacts[0]?.name ?? null,
        contactEmail: c.contacts[0]?.email ?? null,
        contactPhone: c.contacts[0]?.phone ?? null,
        isActive: c.isActive ? 'Yes' : 'No',
      })),
    };
  }

  // ─────────────── Placement (one row per placed student) ───────────────
  private async placement(collegeId: string): Promise<ReportDataset> {
    const apps = await this.prisma.application.findMany({
      where: { collegeId, stage: { in: [...PLACING_STAGES] } },
      orderBy: { offerCtc: 'desc' },
      select: {
        stage: true,
        offerCtc: true,
        updatedAt: true,
        student: {
          select: {
            rollNumber: true,
            branch: true,
            graduationYear: true,
            user: { select: { fullName: true } },
          },
        },
        job: {
          select: { title: true, companyName: true, company: { select: { name: true } } },
        },
      },
    });

    return {
      filename: 'placement',
      title: 'Placement',
      columns: [
        { key: 'rollNumber', label: 'Roll Number' },
        { key: 'fullName', label: 'Name' },
        { key: 'branch', label: 'Branch' },
        { key: 'graduationYear', label: 'Graduation Year' },
        { key: 'company', label: 'Company' },
        { key: 'role', label: 'Role' },
        { key: 'ctcLpa', label: 'CTC (LPA)' },
        { key: 'stage', label: 'Stage' },
        { key: 'placedOn', label: 'Updated On' },
      ],
      rows: apps.map((a) => ({
        rollNumber: a.student.rollNumber,
        fullName: a.student.user.fullName,
        branch: a.student.branch,
        graduationYear: a.student.graduationYear,
        company: a.job.company?.name ?? a.job.companyName ?? '',
        role: a.job.title,
        ctcLpa: lpa(a.offerCtc),
        stage: a.stage,
        placedOn: a.updatedAt,
      })),
    };
  }

  // ─────────────── Offers (every released/accepted/joined offer) ───────────────
  private async offers(collegeId: string): Promise<ReportDataset> {
    const apps = await this.prisma.application.findMany({
      where: { collegeId, stage: { in: [...OFFER_STAGES] } },
      orderBy: { updatedAt: 'desc' },
      select: {
        stage: true,
        offerCtc: true,
        updatedAt: true,
        student: {
          select: {
            rollNumber: true,
            branch: true,
            user: { select: { fullName: true, email: true } },
          },
        },
        job: {
          select: {
            title: true,
            jobType: true,
            companyName: true,
            company: { select: { name: true } },
          },
        },
      },
    });

    return {
      filename: 'offers',
      title: 'Offers',
      columns: [
        { key: 'rollNumber', label: 'Roll Number' },
        { key: 'fullName', label: 'Name' },
        { key: 'email', label: 'Email' },
        { key: 'branch', label: 'Branch' },
        { key: 'company', label: 'Company' },
        { key: 'role', label: 'Role' },
        { key: 'jobType', label: 'Type' },
        { key: 'ctcLpa', label: 'CTC (LPA)' },
        { key: 'stage', label: 'Stage' },
        { key: 'updatedOn', label: 'Updated On' },
      ],
      rows: apps.map((a) => ({
        rollNumber: a.student.rollNumber,
        fullName: a.student.user.fullName,
        email: a.student.user.email,
        branch: a.student.branch,
        company: a.job.company?.name ?? a.job.companyName ?? '',
        role: a.job.title,
        jobType: a.job.jobType,
        ctcLpa: lpa(a.offerCtc),
        stage: a.stage,
        updatedOn: a.updatedAt,
      })),
    };
  }

  // ─────────────── Branch-wise summary ───────────────
  private async branch(collegeId: string): Promise<ReportDataset> {
    const students = await this.prisma.student.findMany({
      where: { collegeId, isActive: true },
      select: { branch: true, graduationYear: true },
    });
    // Placing-stage applications give us hire counts + packages per branch.
    const placed = await this.prisma.application.findMany({
      where: { collegeId, stage: { in: [...PLACING_STAGES] } },
      select: {
        offerCtc: true,
        studentId: true,
        student: { select: { branch: true } },
      },
      distinct: ['studentId'],
    });

    const map = new Map<
      string,
      { total: number; placed: number; offers: number; packages: number[] }
    >();
    const get = (b: string) => {
      let row = map.get(b);
      if (!row) {
        row = { total: 0, placed: 0, offers: 0, packages: [] };
        map.set(b, row);
      }
      return row;
    };
    for (const s of students) {
      const row = get(s.branch);
      row.total++;
    }
    for (const a of placed) {
      const row = get(a.student.branch);
      row.placed++;
      row.offers++;
      const ctc = dec(a.offerCtc);
      if (ctc != null) row.packages.push(ctc);
    }

    const rows = [...map.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([branch, r]) => {
        const avg = r.packages.length
          ? r.packages.reduce((x, y) => x + y, 0) / r.packages.length
          : null;
        const high = r.packages.length ? Math.max(...r.packages) : null;
        return {
          branch,
          total: r.total,
          placed: r.placed,
          unplaced: r.total - r.placed,
          placementRate: r.total > 0 ? Math.round((r.placed / r.total) * 1000) / 10 : 0,
          offers: r.offers,
          avgCtcLpa: lpa(avg),
          highestCtcLpa: lpa(high),
        };
      });

    return {
      filename: 'branch-summary',
      title: 'Branch Summary',
      columns: [
        { key: 'branch', label: 'Branch' },
        { key: 'total', label: 'Total Students' },
        { key: 'placed', label: 'Placed' },
        { key: 'unplaced', label: 'Unplaced' },
        { key: 'placementRate', label: 'Placement %' },
        { key: 'offers', label: 'Offers' },
        { key: 'avgCtcLpa', label: 'Avg CTC (LPA)' },
        { key: 'highestCtcLpa', label: 'Highest CTC (LPA)' },
      ],
      rows,
    };
  }

  // ─────────────── Application funnel ───────────────
  private async funnel(collegeId: string): Promise<ReportDataset> {
    const grouped = await this.prisma.application.groupBy({
      by: ['stage'],
      where: { collegeId },
      _count: { _all: true },
    });
    const counts = new Map(grouped.map((g) => [g.stage, g._count._all]));
    const total = grouped.reduce((sum, g) => sum + g._count._all, 0);

    return {
      filename: 'application-funnel',
      title: 'Application Funnel',
      columns: [
        { key: 'stage', label: 'Stage' },
        { key: 'count', label: 'Applications' },
        { key: 'shareOfTotal', label: '% of Total' },
      ],
      rows: ALL_STAGES.map((stage) => {
        const count = counts.get(stage) ?? 0;
        return {
          stage,
          count,
          shareOfTotal: total > 0 ? Math.round((count / total) * 1000) / 10 : 0,
        };
      }),
    };
  }
}
