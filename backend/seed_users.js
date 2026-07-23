import { prisma } from './src/config/db.js';
import { hashPassword } from './src/utils/passwordUtils.js';

async function seedAdminUsers() {
  const adminPassword = await hashPassword('admin123');
  const ownerPassword = await hashPassword('owner123');

  // AquaSphere Users
  const aqAdmin = await prisma.aquasphereUser.upsert({
    where: { email: 'admin@aquasphere.com' },
    update: { passwordHash: adminPassword, role: 'ADMIN', isActive: true },
    create: { name: 'AquaSphere Admin', email: 'admin@aquasphere.com', passwordHash: adminPassword, role: 'ADMIN', isActive: true }
  });

  const aqOwner = await prisma.aquasphereUser.upsert({
    where: { email: 'owner@aquasphere.com' },
    update: { passwordHash: ownerPassword, role: 'OWNER', isActive: true },
    create: { name: 'AquaSphere Owner', email: 'owner@aquasphere.com', passwordHash: ownerPassword, role: 'OWNER', isActive: true }
  });

  // Wadaana Users
  const wdAdmin = await prisma.wadaanaUser.upsert({
    where: { email: 'admin@wadaana.com' },
    update: { passwordHash: adminPassword, role: 'ADMIN', isActive: true },
    create: { name: 'Wadaana Admin', email: 'admin@wadaana.com', passwordHash: adminPassword, role: 'ADMIN', isActive: true }
  });

  const wdOwner = await prisma.wadaanaUser.upsert({
    where: { email: 'owner@wadaana.com' },
    update: { passwordHash: ownerPassword, role: 'OWNER', isActive: true },
    create: { name: 'Wadaana Owner', email: 'owner@wadaana.com', passwordHash: ownerPassword, role: 'OWNER', isActive: true }
  });

  console.log('Seeded Users:');
  console.log({ aqAdmin, aqOwner, wdAdmin, wdOwner });
  await prisma.$disconnect();
}

seedAdminUsers();
