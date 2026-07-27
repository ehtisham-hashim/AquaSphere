import { prisma } from '../src/config/db.js';
import bcrypt from 'bcrypt';

async function main() {
  const email = 'admin@aquasphere.com';
  const password = 'password123';
  
  const passwordHash = await bcrypt.hash(password, 10);
  
  await prisma.aquasphereUser.upsert({
    where: { email },
    update: {
      passwordHash,
      role: 'OWNER'
    },
    create: {
      name: 'Admin Owner',
      email,
      passwordHash,
      role: 'OWNER',
      phone: '1234567890'
    }
  });

  console.log(`User created! Email: ${email} | Password: ${password}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
