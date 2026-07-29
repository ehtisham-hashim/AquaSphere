import { prisma } from './src/config/db.js';

async function fix() {
  await prisma.$executeRawUnsafe(`UPDATE aquasphere.customers SET cached_bottle_balance = 0 WHERE cached_bottle_balance < 0`);
  await prisma.$executeRawUnsafe(`UPDATE wadaana.customers SET cached_bottle_balance = 0 WHERE cached_bottle_balance < 0`);
  console.log("Fixed negative balances");
}

fix().catch(console.error).finally(() => process.exit(0));
