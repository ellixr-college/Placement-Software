/**
 * Backup all jobs (metadata + criteria) to a JSON file.
 * Run from repo root:
 *   npx tsx packages/database/scripts/backup-jobs.ts
 *
 * Output: packages/database/scripts/jobs-backup.json
 *
 * NOTE: The actual PDF files in the old blob store are deleted, so this backup
 * only captures metadata. You will need to re-upload PDFs when recreating jobs.
 */
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { writeFileSync } from 'fs';
import { resolve } from 'path';

const prisma = new PrismaClient();

async function main() {
  const jobs = await prisma.job.findMany({
    include: {
      company: true,
      _count: { select: { applications: true } },
      applications: { select: { id: true, stage: true, studentId: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  const payload = jobs.map((j) => ({
    // Identifiers
    oldId: j.id,
    collegeId: j.collegeId,
    scope: j.scope,
    targetCollegeIds: j.targetCollegeIds,

    // Company
    companyId: j.companyId,
    companyName: j.company?.name ?? j.companyName,
    companyIndustry: j.company?.industry,
    companyCity: j.company?.city,

    // Job basics
    title: j.title,
    description: j.description,
    jobType: j.jobType,
    workMode: j.workMode,
    location: j.location,
    experienceMin: j.experienceMin,
    experienceMax: j.experienceMax,
    ctcMin: j.ctcMin != null ? Number(j.ctcMin) : null,
    ctcMax: j.ctcMax != null ? Number(j.ctcMax) : null,

    // Eligibility
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

    // Form + PDF
    applicationFormFields: j.applicationFormFields,
    applicationDeadline: j.applicationDeadline,
    status: j.status,
    publishedAt: j.publishedAt,
    oldPdfUrl: j.pdfUrl,
    oldPdfName: j.pdfName,

    // Warn if applicants exist
    applicationCount: j._count.applications,
    applications: j.applications.map((a) => ({ id: a.id, stage: a.stage, studentId: a.studentId })),
  }));

  const outPath = resolve(__dirname, 'jobs-backup.json');
  writeFileSync(outPath, JSON.stringify(payload, null, 2));

  console.log(`Backed up ${payload.length} job(s) to ${outPath}`);

  const withApplicants = payload.filter((j) => j.applicationCount > 0);
  if (withApplicants.length > 0) {
    console.warn(
      `\n⚠️  ${withApplicants.length} job(s) have existing applications. Deleting them will lose that history:`,
    );
    for (const j of withApplicants) {
      console.warn(`  - "${j.title}" (${j.applicationCount} application(s))`);
    }
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
