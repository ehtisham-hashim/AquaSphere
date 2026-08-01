import { prisma } from './src/config/db.js';

async function checkItems() {
  const aquaItems = await prisma.aquasphereItem.findMany();
  console.log('AquaSphere Items:\n', aquaItems.map(i => ({ id: i.id, name: i.name, type: i.type, unit: i.unit, cachedQty: i.cachedQty, reorderLevel: i.reorderLevel })));

  const wadaanaItems = await prisma.wadaanaItem.findMany();
  console.log('Wadaana Items:\n', wadaanaItems.map(i => ({ id: i.id, name: i.name, type: i.type, unit: i.unit, cachedQty: i.cachedQty, reorderLevel: i.reorderLevel })));

  await prisma.$disconnect();
  process.exit(0);
}

checkItems();
