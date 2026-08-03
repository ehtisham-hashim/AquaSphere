import { prisma } from './src/config/db.js';

async function add19LRawMaterial() {
  const existing = await prisma.aquasphereItem.findFirst({
    where: {
      type: 'RAW_MATERIAL',
      name: { contains: '19L' }
    }
  });

  if (!existing) {
    const newItem = await prisma.aquasphereItem.create({
      data: {
        name: 'Empty 19L Bottles',
        type: 'RAW_MATERIAL',
        unit: 'pcs',
        cachedQty: 50,
        factoryQty: 50,
        reorderLevel: 20
      }
    });
    console.log('Created Empty 19L Bottles RAW_MATERIAL:', newItem);
  } else {
    console.log('Empty 19L Bottles RAW_MATERIAL already exists:', existing);
  }

  await prisma.$disconnect();
  process.exit(0);
}

add19LRawMaterial();
