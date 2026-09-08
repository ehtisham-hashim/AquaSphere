import { prisma } from '../src/config/db.js';

async function main() {
  console.log('🚀 Starting complete database reset (preserving Users & Recipes)...');

  // ==========================================
  // 1. AQUASPHERE DATA CLEANUP
  // ==========================================
  console.log('🧹 Cleaning AquaSphere transactions, orders, ledgers, and customers...');
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
  await prisma.aquasphereVendorPayment.deleteMany();
  await prisma.aquasphereVendorLedgerEntry.deleteMany();
  await prisma.aquaspherePurchase.deleteMany();
  await prisma.aquasphereTransportExpense.deleteMany();
  await prisma.aquasphereExpense.deleteMany();
  await prisma.aquasphereDailyClose.deleteMany();
  await prisma.aquasphereAuditLog.deleteMany();
  await prisma.aquasphereVendor.deleteMany();
  await prisma.aquasphereCustomer.deleteMany();

  // Delete any temporary/test items created during curl tests
  const aqTestItems = await prisma.aquasphereItem.findMany({
    where: {
      OR: [
        { name: { startsWith: 'TEST' } },
        { name: { startsWith: 'CURL' } }
      ]
    }
  });
  for (const item of aqTestItems) {
    await prisma.aquasphereRecipeItem.deleteMany({
      where: { OR: [{ finishedGoodId: item.id }, { rawMaterialId: item.id }] }
    });
    await prisma.aquasphereItem.delete({ where: { id: item.id } });
  }

  // Reset all remaining active items to 0 stock
  await prisma.aquasphereItem.updateMany({
    data: {
      cachedQty: 0,
      factoryQty: 0,
      warehouseQty: 0
    }
  });

  // ==========================================
  // 2. WADAANA DATA CLEANUP
  // ==========================================
  console.log('🧹 Cleaning Wadaana transactions, orders, ledgers, and customers...');
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
  await prisma.wadaanaVendorPayment.deleteMany();
  await prisma.wadaanaVendorLedgerEntry.deleteMany();
  await prisma.wadaanaPurchase.deleteMany();
  await prisma.wadaanaTransportExpense.deleteMany();
  await prisma.wadaanaExpense.deleteMany();
  await prisma.wadaanaDailyClose.deleteMany();
  await prisma.wadaanaAuditLog.deleteMany();
  await prisma.wadaanaVendor.deleteMany();
  await prisma.wadaanaCustomer.deleteMany();

  // Delete any temporary/test items created during tests in Wadaana
  const wdTestItems = await prisma.wadaanaItem.findMany({
    where: {
      OR: [
        { name: { startsWith: 'TEST' } },
        { name: { startsWith: 'CURL' } },
        { name: { contains: 'Pure Blue' } }
      ]
    }
  });
  for (const item of wdTestItems) {
    await prisma.wadaanaRecipeItem.deleteMany({
      where: { OR: [{ finishedGoodId: item.id }, { rawMaterialId: item.id }] }
    });
    await prisma.wadaanaItem.delete({ where: { id: item.id } });
  }

  // Reset all remaining active items to 0 stock
  await prisma.wadaanaItem.updateMany({
    data: {
      cachedQty: 0,
      factoryQty: 0,
      warehouseQty: 0
    }
  });

  console.log('✅ SUCCESS: All orders, customers, vendors, ledgers, batches, and expenses purged.');
  console.log('✅ All item stock levels reset to 0.');
  console.log('✅ Users, recipes, and vehicles kept intact.');
}

main()
  .catch((err) => {
    console.error('❌ Data reset error:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
