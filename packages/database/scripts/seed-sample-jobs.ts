/**
 * Seed 4–5 sample campus jobs (TCS, Infosys, Wipro, HCL, Cognizant).
 * Run from repo root:
 *   npx tsx packages/database/scripts/seed-sample-jobs.ts
 *
 * Jobs are created in DRAFT status so officers can review, upload JD PDFs,
 * adjust criteria, and publish.
 */
import 'dotenv/config';
import { Prisma, PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface SampleJob {
  company: string;
  title: string;
  description: string;
  location: string;
  jobType: string;
  workMode: string;
  ctcMin: number;
  ctcMax: number;
  eligibleCourses: string[];
  eligibleBranches: string[];
  graduationYears: number[];
  minCgpa: number | null;
  minTenthPercentage: number | null;
  minTwelfthPercentage: number | null;
  applicationDeadline: string;
}

const SAMPLES: SampleJob[] = [
  {
    company: 'TCS',
    title: 'Management Trainee – MBA',
    description:
      'Campus hiring for MBA graduates. Roles span business analysis, client delivery, and program management across banking, retail, and technology verticals. Pan-India locations.',
    location: 'Pan India',
    jobType: 'FULL_TIME',
    workMode: 'HYBRID',
    ctcMin: 500000,
    ctcMax: 750000,
    eligibleCourses: ['MBA'],
    eligibleBranches: ['General', 'Finance', 'Marketing', 'HR'],
    graduationYears: [2026],
    minCgpa: 6,
    minTenthPercentage: 60,
    minTwelfthPercentage: 60,
    applicationDeadline: '2026-08-31T23:59:59.000Z',
  },
  {
    company: 'Infosys',
    title: 'Business Analyst – MBA / BBA',
    description:
      'Entry-level business analyst role for MBA and BBA graduates. Work on process consulting, digital transformation, and client engagement teams.',
    location: 'Bangalore, Pune, Hyderabad',
    jobType: 'FULL_TIME',
    workMode: 'HYBRID',
    ctcMin: 450000,
    ctcMax: 650000,
    eligibleCourses: ['MBA', 'BBA'],
    eligibleBranches: ['General', 'Finance', 'Marketing'],
    graduationYears: [2026],
    minCgpa: 6,
    minTenthPercentage: 60,
    minTwelfthPercentage: 60,
    applicationDeadline: '2026-08-31T23:59:59.000Z',
  },
  {
    company: 'Wipro',
    title: 'Graduate Trainee – MBA',
    description:
      'MBA graduate trainee program covering operations, consulting, and business development tracks. Rotational assignments with mentoring.',
    location: 'Chennai, Hyderabad, Bangalore',
    jobType: 'FULL_TIME',
    workMode: 'ONSITE',
    ctcMin: 400000,
    ctcMax: 600000,
    eligibleCourses: ['MBA'],
    eligibleBranches: ['General', 'Operations', 'Marketing'],
    graduationYears: [2026],
    minCgpa: 6,
    minTenthPercentage: 55,
    minTwelfthPercentage: 55,
    applicationDeadline: '2026-08-15T23:59:59.000Z',
  },
  {
    company: 'HCL',
    title: 'Management Trainee – HR / Finance',
    description:
      'Management trainee roles in HR and finance functions for MBA graduates. Part of HCL’s campus leadership pipeline.',
    location: 'Noida, Chennai, Bangalore',
    jobType: 'FULL_TIME',
    workMode: 'HYBRID',
    ctcMin: 450000,
    ctcMax: 650000,
    eligibleCourses: ['MBA'],
    eligibleBranches: ['HR', 'Finance'],
    graduationYears: [2026],
    minCgpa: 6,
    minTenthPercentage: 60,
    minTwelfthPercentage: 60,
    applicationDeadline: '2026-08-20T23:59:59.000Z',
  },
  {
    company: 'Cognizant',
    title: 'Associate – Business Consulting',
    description:
      'Associate role in business consulting practice for MBA graduates. Client-facing work across healthcare, banking, and insurance domains.',
    location: 'Hyderabad, Pune, Kolkata',
    jobType: 'FULL_TIME',
    workMode: 'HYBRID',
    ctcMin: 500000,
    ctcMax: 700000,
    eligibleCourses: ['MBA'],
    eligibleBranches: ['General', 'Consulting', 'Strategy'],
    graduationYears: [2026],
    minCgpa: 6,
    minTenthPercentage: 60,
    minTwelfthPercentage: 60,
    applicationDeadline: '2026-08-25T23:59:59.000Z',
  },
];

async function main() {
  // This script seeds into the first college it finds. In a multi-college setup,
  // change this to target a specific collegeId.
  const college = await prisma.college.findFirst({ orderBy: { createdAt: 'asc' } });
  if (!college) {
    console.error('No college found. Seed a college first.');
    process.exit(1);
  }

  console.log(`Seeding sample jobs into college: ${college.name} (${college.id})`);

  let created = 0;
  let skipped = 0;

  for (const s of SAMPLES) {
    // Idempotent: skip if a job with same title + company already exists for this college.
    let company = await prisma.company.findFirst({
      where: { name: s.company, collegeId: college.id },
    });

    if (!company) {
      company = await prisma.company.create({
        data: {
          collegeId: college.id,
          name: s.company,
        },
      });
      console.log(`  Created company: ${s.company}`);
    }

    const exists = await prisma.job.findFirst({
      where: { title: s.title, collegeId: college.id, companyId: company.id },
    });

    if (exists) {
      console.log(`  Skipped (exists): ${s.title}`);
      skipped++;
      continue;
    }

    await prisma.job.create({
      data: {
        collegeId: college.id,
        companyId: company.id,
        title: s.title,
        description: s.description,
        jobType: s.jobType,
        workMode: s.workMode,
        location: s.location,
        ctcMin: s.ctcMin,
        ctcMax: s.ctcMax,
        eligibleCourses: s.eligibleCourses,
        eligibleBranches: s.eligibleBranches,
        graduationYears: s.graduationYears,
        minCgpa: s.minCgpa != null ? new Prisma.Decimal(s.minCgpa) : null,
        minTenthPercentage:
          s.minTenthPercentage != null ? new Prisma.Decimal(s.minTenthPercentage) : null,
        minTwelfthPercentage:
          s.minTwelfthPercentage != null ? new Prisma.Decimal(s.minTwelfthPercentage) : null,
        eligibleGenders: [],
        applicationDeadline: new Date(s.applicationDeadline),
        status: 'DRAFT',
        createdById: 'system-seed',
      },
    });

    created++;
    console.log(`  Created job: ${s.title}`);
  }

  console.log(`\nDone. Created ${created} job(s), skipped ${skipped}.`);
  console.log('Jobs are in DRAFT. Officers must upload JD PDFs and publish them.');
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
