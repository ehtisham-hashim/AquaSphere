import pkg from '@prisma/client';
const { PrismaClient } = pkg;
import bcrypt from 'bcrypt';
import 'dotenv/config';

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash('owner123', 10);
  const user = await prisma.user.upsert({
    where: { email: 'owner@aquasphere.local' },
    update: {},
    create: {
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
