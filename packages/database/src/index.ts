import { PrismaClient } from '@prisma/client';

export * from '@prisma/client';

/**
 * Singleton PrismaClient. In dev, reuse across HMR reloads to avoid exhausting
 * the connection pool; in prod a single instance per process.
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma: PrismaClient =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
