import { PrismaClient } from '@prisma/client';

export * from '@prisma/client';

const RECOMMENDED_CONNECTION_LIMIT = 3;
const MAX_RECOMMENDED_CONNECTION_LIMIT = 5;

function buildDatasourceUrl(): string | undefined {
  const raw = process.env.DATABASE_URL;
  if (!raw) return undefined;

  const fromEnv = process.env.PRISMA_CONNECTION_LIMIT;
  const desiredLimit = fromEnv
    ? Number(fromEnv)
    : (() => {
        try {
          const parsed = new URL(raw);
          const existing = parsed.searchParams.get('connection_limit');
          const numeric = existing ? Number(existing) : NaN;
          return Number.isNaN(numeric) ? RECOMMENDED_CONNECTION_LIMIT : null;
        } catch {
          return null;
        }
      })();

  if (desiredLimit == null) return raw;

  try {
    const parsed = new URL(raw);
    parsed.searchParams.set('connection_limit', String(desiredLimit));
    return parsed.toString();
  } catch {
    return raw;
  }
}

function validateConnectionLimit() {
  const url = process.env.DATABASE_URL ?? '';
  if (!url) return;

  try {
    const parsed = new URL(url);
    const limit = parsed.searchParams.get('connection_limit');
    const numeric = limit ? Number(limit) : null;

    if (numeric == null || Number.isNaN(numeric)) {
      console.warn(
        `[database] DATABASE_URL is missing connection_limit. ` +
          `For serverless / free-tier Postgres (e.g. Supabase), add ` +
          `connection_limit=${RECOMMENDED_CONNECTION_LIMIT} to avoid exhausting the pool.`,
      );
      return;
    }

    if (numeric > MAX_RECOMMENDED_CONNECTION_LIMIT) {
      console.warn(
        `[database] DATABASE_URL connection_limit=${numeric} is higher than recommended ` +
          `(${MAX_RECOMMENDED_CONNECTION_LIMIT}) for serverless Postgres. ` +
          `Consider lowering it to reduce connection pressure.`,
      );
    }
  } catch {
    // Ignore malformed URLs; Prisma will fail later with a clearer error.
  }
}

const datasourceUrl = buildDatasourceUrl();
validateConnectionLimit();

/**
 * Singleton PrismaClient. In dev, reuse across HMR reloads to avoid exhausting
 * the connection pool; in prod a single instance per process.
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma: PrismaClient =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
    datasourceUrl,
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
