import bcrypt from 'bcrypt';
import { prisma } from './src/config/db.js';

async function seedAdminUsers() {
  const adminPassword = await bcrypt.hash('admin123', 10);
  const ownerPassword = await bcrypt.hash('owner123', 10);
  const pmPassword = await bcrypt.hash('pm123', 10);
  const mmPassword = await bcrypt.hash('mm123', 10);
  const accountantPassword = await bcrypt.hash('acc123', 10);

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

  const aqPM = await prisma.aquasphereUser.upsert({
    where: { email: 'pm@aquasphere.com' },
    update: { passwordHash: pmPassword, role: 'PRODUCTION_MANAGER', isActive: true },
    create: { name: 'AquaSphere PM', email: 'pm@aquasphere.com', passwordHash: pmPassword, role: 'PRODUCTION_MANAGER', isActive: true }
  });

  const aqMM = await prisma.aquasphereUser.upsert({
    where: { email: 'mm@aquasphere.com' },
    update: { passwordHash: mmPassword, role: 'MARKETING_MANAGER', isActive: true },
    create: { name: 'AquaSphere MM', email: 'mm@aquasphere.com', passwordHash: mmPassword, role: 'MARKETING_MANAGER', isActive: true }
  });

  const aqAccountant = await prisma.aquasphereUser.upsert({
    where: { email: 'accountant@aquasphere.com' },
    update: { passwordHash: accountantPassword, role: 'ACCOUNTANT', isActive: true },
    create: { name: 'AquaSphere Accountant', email: 'accountant@aquasphere.com', passwordHash: accountantPassword, role: 'ACCOUNTANT', isActive: true }
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

  const wdPM = await prisma.wadaanaUser.upsert({
    where: { email: 'pm@wadaana.com' },
    update: { passwordHash: pmPassword, role: 'PRODUCTION_MANAGER', isActive: true },
    create: { name: 'Wadaana PM', email: 'pm@wadaana.com', passwordHash: pmPassword, role: 'PRODUCTION_MANAGER', isActive: true }
  });

  const wdMM = await prisma.wadaanaUser.upsert({
    where: { email: 'mm@wadaana.com' },
    update: { passwordHash: mmPassword, role: 'MARKETING_MANAGER', isActive: true },
    create: { name: 'Wadaana MM', email: 'mm@wadaana.com', passwordHash: mmPassword, role: 'MARKETING_MANAGER', isActive: true }
  });

  const wdAccountant = await prisma.wadaanaUser.upsert({
    where: { email: 'accountant@wadaana.com' },
    update: { passwordHash: accountantPassword, role: 'ACCOUNTANT', isActive: true },
    create: { name: 'Wadaana Accountant', email: 'accountant@wadaana.com', passwordHash: accountantPassword, role: 'ACCOUNTANT', isActive: true }
  });

  console.log('Seeded Users:');
  console.log({ aqAdmin, aqOwner, aqPM, aqMM, aqAccountant, wdAdmin, wdOwner, wdPM, wdMM, wdAccountant });
  await prisma.$disconnect();
}

seedAdminUsers();
