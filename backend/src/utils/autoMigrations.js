import { prisma } from '../config/db.js';

/**
 * Ensures 0.5L and 1.5L shrink wrap films are separately registered and linked to recipes.
 * Idempotent: safe to run on every server startup.
 */
export async function ensureShrinkWrapMaterials() {
  try {
    const shrinkItems = await prisma.aquasphereItem.findMany({
      where: {
        type: 'RAW_MATERIAL',
        name: { contains: 'Shrink', mode: 'insensitive' }
      }
    });

    let item05 = shrinkItems.find(i => i.name.toLowerCase().includes('0.5'));
    let item15 = shrinkItems.find(i => i.name.toLowerCase().includes('1.5'));
    const genericShrink = shrinkItems.find(i => !i.name.toLowerCase().includes('0.5') && !i.name.toLowerCase().includes('1.5'));

    // If generic shrink wrap exists and 0.5L does not, rename generic to preserve stock history
    if (!item05 && genericShrink) {
      console.log(`[AutoMigrate] Renaming generic "${genericShrink.name}" (${genericShrink.id}) to "0.5L Shrink Wrap Film"...`);
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
      console.log('[AutoMigrate] ✅ Successfully renamed to 0.5L Shrink Wrap Film');
    } else if (!item05) {
      console.log('[AutoMigrate] Creating "0.5L Shrink Wrap Film"...');
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
          refId: 'AUTO_SEED_05L_SHRINK'
        }
      }).catch(() => {});
      console.log('[AutoMigrate] ✅ Created 0.5L Shrink Wrap Film');
    }

    // Ensure 1.5L exists
    if (!item15) {
      console.log('[AutoMigrate] Creating "1.5L Shrink Wrap Film"...');
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
          refId: 'AUTO_SEED_15L_SHRINK'
        }
      }).catch(() => {});
      console.log('[AutoMigrate] ✅ Created 1.5L Shrink Wrap Film');
    }

    // Archive generic shrink if it exists separately
    if (genericShrink && genericShrink.id !== item05?.id && genericShrink.id !== item15?.id && !genericShrink.archivedAt) {
      console.log(`[AutoMigrate] Archiving redundant "${genericShrink.name}"...`);
      await prisma.aquasphereItem.update({
        where: { id: genericShrink.id },
        data: { archivedAt: new Date() }
      });
    }

    // Ensure finished goods recipes are correctly linked
    const finishedGoods = await prisma.aquasphereItem.findMany({
      where: { type: 'FINISHED_GOOD', archivedAt: null }
    });

    for (const fg of finishedGoods) {
      const fgNameLower = fg.name.toLowerCase();
      if (fgNameLower.includes('0.5') && item05) {
        if (genericShrink && genericShrink.id !== item05.id) {
          await prisma.aquasphereRecipeItem.deleteMany({
            where: { finishedGoodId: fg.id, rawMaterialId: genericShrink.id }
          });
        }
        if (item15) {
          await prisma.aquasphereRecipeItem.deleteMany({
            where: { finishedGoodId: fg.id, rawMaterialId: item15.id }
          });
        }
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
      } else if (fgNameLower.includes('1.5') && item15) {
        if (genericShrink && genericShrink.id !== item15.id) {
          await prisma.aquasphereRecipeItem.deleteMany({
            where: { finishedGoodId: fg.id, rawMaterialId: genericShrink.id }
          });
        }
        if (item05) {
          await prisma.aquasphereRecipeItem.deleteMany({
            where: { finishedGoodId: fg.id, rawMaterialId: item05.id }
          });
        }
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
      }
    }
    console.log('[AutoMigrate] Shrink wrap separation verified.');
  } catch (err) {
    console.error('[AutoMigrate] Error verifying shrink wrap materials:', err);
  }
}
