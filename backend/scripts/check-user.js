import 'dotenv/config';
import pg from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import pkg from '@prisma/client';
const { PrismaClient } = pkg;

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const user = await prisma.aquasphereUser.findUnique({ where: { email: 'owner@aquasphere.local' } });
console.log('User found:', user ? `yes — id: ${user.id}, isActive: ${user.isActive}` : 'NO USER FOUND');
await prisma.$disconnect();
