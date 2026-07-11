/**
 * Delete all jobs that have no PDF attached.
 * Run from repo root:
 *   npx tsx packages/database/scripts/delete-jobs-without-pdf.ts --confirm
 */
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const confirmed = process.argv.includes('--confirm');
  if (!confirmed) {
    console.error('This script deletes every job without a PDF. Run with --confirm to proceed.');
    console.error('  npx tsx packages/database/scripts/delete-jobs-without-pdf.ts --confirm');
    process.exit(1);
  }

  const jobs = await prisma.job.findMany({
    where: { OR: [{ pdfUrl: null }, { pdfUrl: '' }] },
    select: { id: true, title: true, pdfUrl: true },
  });

  if (jobs.length === 0) {
    console.log('No jobs without PDFs found.');
    return;
  }

  console.log(`Deleting ${jobs.length} job(s) without PDFs:`);
  for (const j of jobs) {
    console.log(`  - ${j.title}`);
  }

  const result = await prisma.job.deleteMany({
    where: { OR: [{ pdfUrl: null }, { pdfUrl: '' }] },
  });

  console.log(`\nDeleted ${result.count} job(s).`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
