import { prisma, closeDatabaseConnections } from '../src/config/db.js';

async function migrateShrinkWrap() {
  console.log('🔄 Starting Shrink Wrap Migration (Separating 0.5L and 1.5L)...');

  // 1. Check for existing shrink wrap items
  const shrinkItems = await prisma.aquasphereItem.findMany({
    where: {
      type: 'RAW_MATERIAL',
      name: { contains: 'Shrink', mode: 'insensitive' }
    }
  });

  console.log('Found existing shrink wrap items:', shrinkItems.map(i => ({ id: i.id, name: i.name, qty: i.cachedQty })));

  let item05 = shrinkItems.find(i => i.name.toLowerCase().includes('0.5'));
  let item15 = shrinkItems.find(i => i.name.toLowerCase().includes('1.5'));
  const genericShrink = shrinkItems.find(i => !i.name.toLowerCase().includes('0.5') && !i.name.toLowerCase().includes('1.5'));

  // If we have generic "Shrink Wrap Film" and no 0.5L, rename generic to 0.5L to preserve inventory history
  if (!item05 && genericShrink) {
    console.log(`Renaming "${genericShrink.name}" (ID: ${genericShrink.id}) to "0.5L Shrink Wrap Film"...`);
    item05 = await prisma.aquasphereItem.update({
      where: { id: genericShrink.id },
      data: {
        name: '0.5L Shrink Wrap Film',
        unit: 'kg',
        packSize: 1,
        reorderLevel: 10,
        archivedAt: null
      }
    });
    console.log('✅ Renamed to 0.5L Shrink Wrap Film');
  } else if (!item05) {
    console.log('Creating "0.5L Shrink Wrap Film"...');
    item05 = await prisma.aquasphereItem.create({
      data: {
        name: '0.5L Shrink Wrap Film',
        type: 'RAW_MATERIAL',
        unit: 'kg',
        packSize: 1,
        reorderLevel: 10,
        cachedQty: 50,
        factoryQty: 50,
        warehouseQty: 0
      }
    });
    await prisma.aquasphereInventoryTransaction.create({
      data: {
        itemId: item05.id,
        quantity: 50,
        direction: 'IN',
        reason: 'INITIAL_STOCK',
        location: 'FACTORY',
        refType: 'MANUAL',
        refId: 'SEED_05L_SHRINK'
      }
    });
    console.log('✅ Created 0.5L Shrink Wrap Film');
  }

  // Ensure 1.5L exists
  if (!item15) {
    console.log('Creating "1.5L Shrink Wrap Film"...');
    item15 = await prisma.aquasphereItem.create({
      data: {
        name: '1.5L Shrink Wrap Film',
        type: 'RAW_MATERIAL',
        unit: 'kg',
        packSize: 1,
        reorderLevel: 15,
        cachedQty: 50,
        factoryQty: 50,
        warehouseQty: 0
      }
    });
    await prisma.aquasphereInventoryTransaction.create({
      data: {
        itemId: item15.id,
        quantity: 50,
        direction: 'IN',
        reason: 'INITIAL_STOCK',
        location: 'FACTORY',
        refType: 'MANUAL',
        refId: 'SEED_15L_SHRINK'
      }
    });
    console.log('✅ Created 1.5L Shrink Wrap Film');
  }

  // If generic shrink still exists and was not renamed to item05, archive it
  if (genericShrink && genericShrink.id !== item05.id && genericShrink.id !== item15.id) {
    console.log(`Archiving old redundant "${genericShrink.name}"...`);
    await prisma.aquasphereItem.update({
      where: { id: genericShrink.id },
      data: { archivedAt: new Date() }
    });
  }

  // 2. Update Recipes
  console.log('\n--- Updating Recipes ---');
  const finishedGoods = await prisma.aquasphereItem.findMany({
    where: { type: 'FINISHED_GOOD', archivedAt: null },
    include: { recipeFinishedGoods: true }
  });

  for (const fg of finishedGoods) {
    const fgNameLower = fg.name.toLowerCase();

    if (fgNameLower.includes('0.5')) {
      console.log(`Configuring recipe for 0.5L product: ${fg.name}`);
      // Remove any recipe links to 1.5L shrink or generic redundant shrink
      if (genericShrink && genericShrink.id !== item05.id) {
        await prisma.aquasphereRecipeItem.deleteMany({
          where: { finishedGoodId: fg.id, rawMaterialId: genericShrink.id }
        });
      }
      await prisma.aquasphereRecipeItem.deleteMany({
        where: { finishedGoodId: fg.id, rawMaterialId: item15.id }
      });

      // Link to 0.5L Shrink Wrap Film @ 0.02273 kg/pack
      const existing = await prisma.aquasphereRecipeItem.findFirst({
        where: { finishedGoodId: fg.id, rawMaterialId: item05.id }
      });
      if (existing) {
        await prisma.aquasphereRecipeItem.update({
          where: { id: existing.id },
          data: { quantityPerUnit: 0.02273 }
        });
      } else {
        await prisma.aquasphereRecipeItem.create({
          data: { finishedGoodId: fg.id, rawMaterialId: item05.id, quantityPerUnit: 0.02273 }
        });
      }
      console.log(`  -> Linked to "${item05.name}" @ 0.02273 kg/pack`);
    } else if (fgNameLower.includes('1.5')) {
      console.log(`Configuring recipe for 1.5L product: ${fg.name}`);
      // Remove any recipe links to 0.5L shrink or generic redundant shrink
      if (genericShrink && genericShrink.id !== item15.id) {
        await prisma.aquasphereRecipeItem.deleteMany({
          where: { finishedGoodId: fg.id, rawMaterialId: genericShrink.id }
        });
      }
      await prisma.aquasphereRecipeItem.deleteMany({
        where: { finishedGoodId: fg.id, rawMaterialId: item05.id }
      });

      // Link to 1.5L Shrink Wrap Film @ 0.02500 kg/pack
      const existing = await prisma.aquasphereRecipeItem.findFirst({
        where: { finishedGoodId: fg.id, rawMaterialId: item15.id }
      });
      if (existing) {
        await prisma.aquasphereRecipeItem.update({
          where: { id: existing.id },
          data: { quantityPerUnit: 0.02500 }
        });
      } else {
        await prisma.aquasphereRecipeItem.create({
          data: { finishedGoodId: fg.id, rawMaterialId: item15.id, quantityPerUnit: 0.02500 }
        });
      }
      console.log(`  -> Linked to "${item15.name}" @ 0.02500 kg/pack`);
    }
  }

  console.log('\n🎉 Shrink wrap migration complete!');
}

migrateShrinkWrap()
  .catch((err) => {
    console.error('❌ Migration failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await closeDatabaseConnections();
  });
