/**
 * Recreate jobs from the backup file produced by backup-jobs.ts.
 * Run from repo root:
 *   npx tsx packages/database/scripts/recreate-jobs.ts
 *
 * This creates fresh Job rows from the backup metadata. Since old PDF blobs are
 * deleted, new jobs are created without PDFs and in DRAFT status so officers can
 * review and re-upload PDFs before publishing.
 */
import 'dotenv/config';
import { Prisma, PrismaClient } from '@prisma/client';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const prisma = new PrismaClient();

interface BackupJob {
  oldId: string;
  collegeId: string | null;
  scope: string;
  targetCollegeIds: string[];
  companyId: string | null;
  companyName: string | null;
  companyIndustry?: string | null;
  companyCity?: string | null;
  title: string;
  description: string | null;
  jobType: string;
  workMode: string | null;
  location: string | null;
  experienceMin: number | null;
  experienceMax: number | null;
  ctcMin: number | null;
  ctcMax: number | null;
  eligibleCourses: string[];
  eligibleBranches: string[];
  graduationYears: number[];
  minCgpa: number | null;
  minTenthPercentage: number | null;
  minTwelfthPercentage: number | null;
  minUgPercentage: number | null;
  eligibleGenders: string[];
  maxActiveBacklogs: number | null;
  maxTotalBacklogs: number | null;
  applicationFormFields: unknown;
  applicationDeadline: string | null;
  status: string;
  publishedAt: string | null;
  oldPdfUrl: string | null;
  oldPdfName: string | null;
  applicationCount: number;
}

async function main() {
  const backupPath = resolve(__dirname, 'jobs-backup.json');
  const raw = JSON.parse(readFileSync(backupPath, 'utf-8')) as BackupJob[];

  if (!Array.isArray(raw) || raw.length === 0) {
    console.log('No jobs found in backup. Exiting.');
    return;
  }

  console.log(`Recreating ${raw.length} job(s) from ${backupPath}…`);

  let created = 0;
  let skipped = 0;

  for (const j of raw) {
    if (j.scope !== 'COLLEGE' || !j.collegeId) {
      console.warn(`Skipping non-college job: "${j.title}" (${j.scope})`);
      skipped++;
      continue;
    }

    // Resolve company: reuse by ID if it still exists, otherwise find by name,
    // otherwise create a new company row for this college.
    let companyId: string | null = null;
    let companyName: string | null = j.companyName;

    if (j.companyId) {
      const existing = await prisma.company.findFirst({
        where: { id: j.companyId, collegeId: j.collegeId },
      });
      if (existing) companyId = existing.id;
    }

    if (!companyId && companyName) {
      const byName = await prisma.company.findFirst({
        where: { name: companyName, collegeId: j.collegeId },
      });
      if (byName) {
        companyId = byName.id;
      } else {
        const createdCompany = await prisma.company.create({
          data: {
            collegeId: j.collegeId,
            name: companyName,
            industry: j.companyIndustry ?? null,
            city: j.companyCity ?? null,
          },
        });
        companyId = createdCompany.id;
        console.log(`  Created company: ${companyName}`);
      }
    }

    // Create the job as DRAFT without PDF. Officer must re-upload PDF and publish.
    await prisma.job.create({
      data: {
        collegeId: j.collegeId,
        companyId,
        companyName: companyId ? null : companyName,
        title: j.title,
        description: j.description,
        jobType: j.jobType,
        workMode: j.workMode,
        location: j.location,
        experienceMin: j.experienceMin,
        experienceMax: j.experienceMax,
        ctcMin: j.ctcMin != null ? new Prisma.Decimal(j.ctcMin) : null,
        ctcMax: j.ctcMax != null ? new Prisma.Decimal(j.ctcMax) : null,
        eligibleCourses: j.eligibleCourses,
        eligibleBranches: j.eligibleBranches,
        graduationYears: j.graduationYears,
        minCgpa: j.minCgpa != null ? new Prisma.Decimal(j.minCgpa) : null,
        minTenthPercentage:
          j.minTenthPercentage != null ? new Prisma.Decimal(j.minTenthPercentage) : null,
        minTwelfthPercentage:
          j.minTwelfthPercentage != null ? new Prisma.Decimal(j.minTwelfthPercentage) : null,
        minUgPercentage: j.minUgPercentage != null ? new Prisma.Decimal(j.minUgPercentage) : null,
        eligibleGenders: j.eligibleGenders,
        maxActiveBacklogs: j.maxActiveBacklogs,
        maxTotalBacklogs: j.maxTotalBacklogs,
        applicationFormFields: j.applicationFormFields as never,
        applicationDeadline: j.applicationDeadline ? new Date(j.applicationDeadline) : null,
        status: 'DRAFT',
        createdById: 'system-restore',
      },
    });

    created++;
    console.log(`  Created job: ${j.title}`);
  }

  console.log(`\nDone. Created ${created} job(s), skipped ${skipped}.`);
  console.log('New jobs are in DRAFT. Officers must re-upload PDFs and publish them.');
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
