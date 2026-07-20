import 'dotenv/config';
import pg from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const { Pool } = pg;
const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter, log: ['error', 'warn'] });

async function main() {
  const hash = await bcrypt.hash('admin123', 10);
  
  const owner = await prisma.aquasphereUser.upsert({
    where: { email: 'owner@aquasphere.local' },
    update: {},
    create: {
      phone: '03001234567',
      email: 'owner@aquasphere.local',
      name: 'System Owner',
      passwordHash: hash,
      role: 'OWNER'
    },
  });
  
  console.log('Seeded Owner user:', owner.email);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
