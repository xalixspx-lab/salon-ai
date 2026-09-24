import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    // استعلامات SQL لا تُسجَّل إلا عند الطلب صراحةً (PRISMA_LOG_QUERIES=1) حتى لا تتسرب
    // تفاصيل المخطط ولا يتضخم سجل الإنتاج
    log: process.env.PRISMA_LOG_QUERIES === '1' ? ['query', 'warn', 'error'] : ['warn', 'error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;