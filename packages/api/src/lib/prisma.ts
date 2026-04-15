import pkg from '@prisma/client';

const { PrismaClient } = pkg;

export type { Prisma } from '@prisma/client';

export const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});
