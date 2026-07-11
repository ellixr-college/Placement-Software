/**
 * Delete ALL jobs from the database.
 * Run from repo root:
 *   npx tsx packages/database/scripts/delete-all-jobs.ts --confirm
 *
 * WARNING: This permanently deletes every Job row and cascades to:
 *   - Applications
 *   - ApplicationStageHistory
 *   - ApplicationRound / InterviewRound
 *   - JobRound
 *
 * Make sure you ran backup-jobs.ts first.
 */
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const confirmed = process.argv.includes('--confirm');
  if (!confirmed) {
    console.error('This script deletes every job. Run with --confirm to proceed.');
    console.error('  npx tsx packages/database/scripts/delete-all-jobs.ts --confirm');
    process.exit(1);
  }

  const count = await prisma.job.count();
  console.log(`Deleting ${count} job(s)…`);

  // Applications and rounds cascade-delete with the job via Prisma relations.
  const result = await prisma.job.deleteMany({});

  console.log(`Deleted ${result.count} job(s).`);
  console.log('You can now recreate jobs from the backup and re-upload PDFs to job-storage/.');
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
