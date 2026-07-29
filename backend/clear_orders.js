import { prisma } from './src/config/db.js';

async function main() {
    console.log('Starting order data cleanup...');

    // Clear Aquasphere Schema Data
    await prisma.aquaspherePayment.deleteMany({});
    await prisma.aquasphereDelivery.deleteMany({});
    await prisma.aquasphereBottleTransaction.deleteMany({});
    await prisma.aquasphereOrderItem.deleteMany({});
    await prisma.aquasphereOrder.deleteMany({});
    console.log('Cleared aquasphere orders, deliveries, payments, and bottle transactions.');

    // Clear Wadaana Schema Data
    await prisma.wadaanaPayment.deleteMany({});
    await prisma.wadaanaDelivery.deleteMany({});
    await prisma.wadaanaBottleTransaction.deleteMany({});
    await prisma.wadaanaOrderItem.deleteMany({});
    await prisma.wadaanaOrder.deleteMany({});
    console.log('Cleared wadaana orders, deliveries, payments, and bottle transactions.');

    // Reset balances? We will reset bottle balances to 0 just in case.
    await prisma.$executeRawUnsafe(`UPDATE aquasphere.customers SET cached_bottle_balance = 0`);
    await prisma.$executeRawUnsafe(`UPDATE wadaana.customers SET cached_bottle_balance = 0`);
    console.log('Reset cached bottle balances to 0.');

    console.log('Cleanup complete!');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
