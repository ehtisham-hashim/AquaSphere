import { prisma, closeDatabaseConnections } from './src/config/db.js';

async function main() {
  console.log('=== AQUASPHERE ITEMS ===');
  const aquaItems = await prisma.aquasphereItem.findMany({
    orderBy: [{ type: 'asc' }, { name: 'asc' }]
  });
  for (const i of aquaItems) {
    const tx = await prisma.aquasphereInventoryTransaction.count({ where: { itemId: i.id } });
    const po = await prisma.aquaspherePurchaseItem.count({ where: { itemId: i.id } });
    const ord = await prisma.aquasphereOrderItem.count({ where: { itemId: i.id } });
    const bc = await prisma.aquasphereProductionBatchConsumption.count({ where: { itemId: i.id } });
    const rec = await prisma.aquasphereRecipeItem.count({ where: { OR: [{ rawMaterialId: i.id }, { finishedGoodId: i.id }] } });
    console.log(`[${i.type}] ${i.name.padEnd(30)} | ${String(i.cachedQty).padStart(12)} ${i.unit.padEnd(8)} | refs: tx=${tx}, po=${po}, ord=${ord}, batch=${bc}, rec=${rec}`);
  }

  console.log('\n=== WADAANA ITEMS ===');
  const wadaanaItems = await prisma.wadaanaItem.findMany({
    orderBy: [{ type: 'asc' }, { name: 'asc' }]
  });
  for (const i of wadaanaItems) {
    const tx = await prisma.wadaanaInventoryTransaction.count({ where: { itemId: i.id } });
    const ord = await prisma.wadaanaOrderItem.count({ where: { itemId: i.id } });
    console.log(`[${i.type}] ${i.name.padEnd(32)} | ${String(i.cachedQty).padStart(12)} ${i.unit.padEnd(8)} | refs: tx=${tx}, ord=${ord}`);
  }

  await closeDatabaseConnections();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
