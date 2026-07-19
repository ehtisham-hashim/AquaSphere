import pkg from '@prisma/client';
const { PrismaClient } = pkg;

export const prisma = new PrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
