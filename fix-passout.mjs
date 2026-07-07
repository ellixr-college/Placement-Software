// THROWAWAY one-off — set every student's passout (graduationYear) to 2026.
// Run from the repo root:  node fix-passout.mjs   (delete after.)

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createRequire } from 'module';

const root = dirname(fileURLToPath(import.meta.url));
const env = readFileSync(join(root, '.env'), 'utf8');
for (const line of env.split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
}

const require = createRequire(join(root, 'packages', 'database', 'package.json'));
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const NEW_PASSOUT = 2026;

try {
  const res = await prisma.student.updateMany({
    where: { graduationYear: { not: NEW_PASSOUT } },
    data: { graduationYear: NEW_PASSOUT },
  });
  console.log(`Updated ${res.count} students to passout ${NEW_PASSOUT}.`);
} finally {
  await prisma.$disconnect();
}
