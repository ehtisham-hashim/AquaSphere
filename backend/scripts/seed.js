import pkg from '@prisma/client';
const { PrismaClient } = pkg;
import bcrypt from 'bcrypt';
import 'dotenv/config';
import pg from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const passwordHash = await bcrypt.hash('owner123', 10);
  const user = await prisma.aquasphereUser.upsert({
    where: { email: 'owner@aquasphere.local' },
    update: { passwordHash, name: 'Owner', role: 'OWNER' },
    create: {
      name: 'Owner',
      email: 'owner@aquasphere.local',
      passwordHash,
      role: 'OWNER',
    },
  });
  console.log('Seed done: ', user.email);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
