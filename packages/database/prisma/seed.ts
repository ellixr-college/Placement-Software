import { PrismaClient, UserRole } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const email = process.env.SEED_ADMIN_EMAIL ?? 'admin@ellixr.app';
  const password = process.env.SEED_ADMIN_PASSWORD ?? 'ChangeMe!123';

  const passwordHash = await bcrypt.hash(password, 12);

  const admin = await prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      email,
      passwordHash,
      fullName: 'Platform Admin',
      role: UserRole.PLATFORM_ADMIN,
      collegeId: null,
      emailVerifiedAt: new Date(),
    },
  });

  console.log(`Seeded Platform Admin: ${admin.email}`);
  if (!process.env.SEED_ADMIN_PASSWORD) {
    console.warn('No SEED_ADMIN_PASSWORD set — used default "ChangeMe!123". Change it immediately.');
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
