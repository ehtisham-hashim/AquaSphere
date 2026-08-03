import { prisma } from './src/config/db.js';

async function testQuery() {
  const tx = await prisma.aquasphereInventoryTransaction.findMany({
    where: {
      item: { type: 'FINISHED_GOOD' }
    },
    include: {
      item: {
        select: {
          id: true,
          name: true,
          type: true,
          unit: true,
          cachedQty: true,
          factoryQty: true,
          warehouseQty: true
        }
      }
    },
    take: 5
  });
  console.log('Query success! Items returned:', tx.length);
  await prisma.$disconnect();
  process.exit(0);
}

testQuery();
