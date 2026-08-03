import { prisma } from './src/config/db.js';

async function testFix() {
  const items = await prisma.aquasphereItem.findMany({
    where: { name: { contains: '0.5L' } },
    include: {
      inventoryTransactions: { select: { quantity: true, direction: true, refType: true } }
    }
  });

  for (const item of items) {
    let netQty = 0;
    for (const t of item.inventoryTransactions) {
      if (t.refType === 'TRANSFER') continue;
      const q = Number(t.quantity || 0);
      if (t.direction === 'IN') netQty += q;
      else if (t.direction === 'OUT') netQty -= q;
    }
    console.log(`Item: ${item.name} | Factory: ${item.factoryQty} | Warehouse: ${item.warehouseQty} | Calculated Total: ${netQty}`);
  }

  await prisma.$disconnect();
  process.exit(0);
}

testFix();
