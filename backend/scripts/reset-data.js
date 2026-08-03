import { prisma } from '../src/config/db.js';

async function main() {
  console.log('Resetting all data except Users...');

  // --- AQUASPHERE RESET ---
  console.log('Cleaning Aquasphere data...');
  await prisma.aquasphereDelivery.deleteMany();
  await prisma.aquaspherePayment.deleteMany();
  await prisma.aquasphereOrderItem.deleteMany();
  await prisma.aquasphereOrder.deleteMany();
  await prisma.aquasphereSpotSale.deleteMany();
  await prisma.aquasphereBottleTransaction.deleteMany();
  await prisma.aquasphereProductionBatchConsumption.deleteMany();
  await prisma.aquasphereProductionBatch.deleteMany();
  await prisma.aquasphereInventoryTransaction.deleteMany();
  await prisma.aquaspherePurchaseItem.deleteMany();
  await prisma.aquaspherePurchase.deleteMany();
  await prisma.aquasphereExpense.deleteMany();
  await prisma.aquasphereDailyClose.deleteMany();
  await prisma.aquasphereVendor.deleteMany();
  await prisma.aquasphereCustomer.deleteMany();

  // Reset cachedQty to 0 for all Aquasphere items
  await prisma.aquasphereItem.updateMany({
    data: { cachedQty: 0 }
  });

  // --- WADAANA RESET ---
  console.log('Cleaning Wadaana data...');
  await prisma.wadaanaDelivery.deleteMany();
  await prisma.wadaanaPayment.deleteMany();
  await prisma.wadaanaOrderItem.deleteMany();
  await prisma.wadaanaOrder.deleteMany();
  await prisma.wadaanaSpotSale.deleteMany();
  await prisma.wadaanaBottleTransaction.deleteMany();
  await prisma.wadaanaProductionBatchConsumption.deleteMany();
  await prisma.wadaanaProductionBatch.deleteMany();
  await prisma.wadaanaInventoryTransaction.deleteMany();
  await prisma.wadaanaPurchaseItem.deleteMany();
  await prisma.wadaanaPurchase.deleteMany();
  await prisma.wadaanaExpense.deleteMany();
  await prisma.wadaanaDailyClose.deleteMany();
  await prisma.wadaanaVendor.deleteMany();
  await prisma.wadaanaCustomer.deleteMany();

  // Reset cachedQty to 0 for all Wadaana items
  await prisma.wadaanaItem.updateMany({
    data: { cachedQty: 0 }
  });

  console.log('SUCCESS: All transactional data, customers, and vendors deleted. Item quantities reset to 0. Users kept intact.');
  process.exit(0);
}

main().catch(err => {
  console.error('Data reset error:', err);
  process.exit(1);
});
