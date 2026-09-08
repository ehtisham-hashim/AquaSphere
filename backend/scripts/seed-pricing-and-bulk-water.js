import { prisma, closeDatabaseConnections } from '../src/config/db.js';

async function main() {
  console.log('--- Initializing / Checking Aquasphere Finished Goods ---');
  
  // 1. Check or create Bulk Water (Per Litre) in Aquasphere
  const existingBulkWater = await prisma.aquasphereItem.findFirst({
    where: {
      name: { equals: 'Bulk Water (Per Litre)', mode: 'insensitive' },
      archivedAt: null
    }
  });

  if (!existingBulkWater) {
    const createdWater = await prisma.aquasphereItem.create({
      data: {
        name: 'Bulk Water (Per Litre)',
        type: 'FINISHED_GOOD',
        unit: 'Litres',
        retailPrice: 10,
        cachedQty: 50000,
        factoryQty: 50000,
        warehouseQty: 0,
        reorderLevel: 1000
      }
    });
    console.log('✅ Created "Bulk Water (Per Litre)" in Aquasphere:', createdWater.id);
  } else {
    console.log('ℹ️ "Bulk Water (Per Litre)" already exists in Aquasphere:', existingBulkWater.id);
  }

  // 2. Baseline prices for Aquasphere finished goods
  const aquaFinishedGoods = await prisma.aquasphereItem.findMany({
    where: { type: 'FINISHED_GOOD', archivedAt: null }
  });

  for (const item of aquaFinishedGoods) {
    let targetPrice = Number(item.retailPrice || 0);
    const n = item.name.toLowerCase();
    if (targetPrice <= 0) {
      if (n.includes('0.5')) targetPrice = 360;
      else if (n.includes('1.5')) targetPrice = 300;
      else if (n.includes('19')) targetPrice = 200;
      else if (n.includes('pivirifine')) targetPrice = 250;
      else if (n.includes('bulk') || n.includes('water')) targetPrice = 10;
      
      await prisma.aquasphereItem.update({
        where: { id: item.id },
        data: { retailPrice: targetPrice }
      });
      console.log(`Updated retailPrice for Aquasphere item "${item.name}" to Rs ${targetPrice}`);
    }
  }

  console.log('--- Initializing / Checking Wadaana Finished Goods ---');

  // 3. Baseline prices for Wadaana finished goods
  const wadaanaFinishedGoods = await prisma.wadaanaItem.findMany({
    where: { type: 'FINISHED_GOOD', archivedAt: null }
  });

  for (const item of wadaanaFinishedGoods) {
    let targetPrice = Number(item.retailPrice || 0);
    const n = item.name.toLowerCase();
    if (targetPrice <= 0) {
      if (n.includes('pure') && n.includes('0.5')) targetPrice = 15;
      else if (n.includes('pure') && n.includes('1.5')) targetPrice = 30;
      else if (n.includes('mix') && n.includes('0.5')) targetPrice = 13;
      else if (n.includes('mix') && n.includes('1.5')) targetPrice = 27;
      else targetPrice = 10;

      await prisma.wadaanaItem.update({
        where: { id: item.id },
        data: { retailPrice: targetPrice }
      });
      console.log(`Updated retailPrice for Wadaana item "${item.name}" to Rs ${targetPrice}`);
    }
  }

  console.log('--- Seed Completed Successfully ---');
}

main()
  .catch((err) => {
    console.error('Error during seeding:', err);
    process.exit(1);
  })
  .finally(async () => {
    await closeDatabaseConnections();
  });
