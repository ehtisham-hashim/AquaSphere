import { prisma } from '../src/config/db.js';

/**
 * Normalizes and extracts the canonical product size key from an item name.
 * Disambiguates between 0.5L (500ml), 1.5L (1500ml), and 19L bottles/packs,
 * preventing '500' from matching '1500ml'.
 *
 * @param {string} name - Raw item or product name.
 * @returns {'0.5L' | '1.5L' | '19L' | null} Normalized size key.
 */
export const getProductSizeKey = (name) => {
  if (!name) return null;
  const str = name.toLowerCase();

  // Test 1.5L / 1500ml first to prevent substring collisions
  if (/\b(1\.5l?|1500ml?)\b/i.test(str) || str.includes('1.5') || str.includes('1500')) {
    return '1.5L';
  }
  // Test 0.5L / 500ml (ensuring absence of 1.5/1500)
  if (/\b(0\.5l?|500ml?)\b/i.test(str) || (str.includes('0.5') && !str.includes('1.5')) || (str.includes('500') && !str.includes('1500'))) {
    return '0.5L';
  }
  // Test 19L
  if (/\b(19l?)\b/i.test(str) || str.includes('19')) {
    return '19L';
  }
  return null;
};

/**
 * Consolidates duplicate finished goods items for the specified tenant,
 * migrating all related foreign keys (inventory, orders, purchases, batches, recipes)
 * to the canonical item before archiving duplicates.
 *
 * @param {'aquasphere' | 'wadaana'} [prefix='aquasphere'] - Target tenant prefix.
 * @returns {Promise<void>}
 */
export const consolidateDuplicateFinishedGoods = async (prefix = 'aquasphere') => {
  try {
    console.log(`[Migration] Consolidating duplicate finished goods for ${prefix}...`);
    const allFG = await prisma[`${prefix}Item`].findMany({
      where: { archivedAt: null }
    });

    const groups = [
      { canonicalName: '0.5L PET Pack (12 Bottles)', unit: 'packs', sizeKey: '0.5L' },
      { canonicalName: '1.5L PET Pack (6 Bottles)', unit: 'packs', sizeKey: '1.5L' },
      { canonicalName: '19L Refill Bottle', unit: 'bottles', sizeKey: '19L' }
    ];

    for (const g of groups) {
      const matchingItems = allFG.filter(i => 
        (i.type === 'FINISHED_GOOD' || !i.type) && 
        getProductSizeKey(i.name) === g.sizeKey
      );

      if (matchingItems.length === 0) continue;

      let canonicalItem = matchingItems.find(i => i.name === g.canonicalName) || matchingItems[0];

      await prisma[`${prefix}Item`].update({
        where: { id: canonicalItem.id },
        data: { name: g.canonicalName, unit: g.unit, type: 'FINISHED_GOOD' }
      });

      for (const dupe of matchingItems) {
        if (dupe.id === canonicalItem.id) continue;

        await prisma.$transaction(async (tx) => {
          // 1. Migrate Inventory Transactions
          await tx[`${prefix}InventoryTransaction`].updateMany({
            where: { itemId: dupe.id },
            data: { itemId: canonicalItem.id }
          });

          // 2. Migrate Order Items
          await tx[`${prefix}OrderItem`].updateMany({
            where: { itemId: dupe.id },
            data: { itemId: canonicalItem.id }
          });

          // 3. Migrate Purchase Items
          await tx[`${prefix}PurchaseItem`].updateMany({
            where: { itemId: dupe.id },
            data: { itemId: canonicalItem.id }
          });

          // 4. Migrate Batch Consumptions
          await tx[`${prefix}ProductionBatchConsumption`].updateMany({
            where: { itemId: dupe.id },
            data: { itemId: canonicalItem.id }
          });

          // 5. Migrate Produced & Consumed Batches
          await tx[`${prefix}ProductionBatch`].updateMany({
            where: { outputItemId: dupe.id },
            data: { outputItemId: canonicalItem.id }
          });

          await tx[`${prefix}ProductionBatch`].updateMany({
            where: { inputItemId: dupe.id },
            data: { inputItemId: canonicalItem.id }
          });

          // 6. Migrate Recipe Finished Goods (handling unique compound key)
          const dupeRecipeFGs = await tx[`${prefix}RecipeItem`].findMany({
            where: { finishedGoodId: dupe.id }
          });

          for (const rfg of dupeRecipeFGs) {
            const existing = await tx[`${prefix}RecipeItem`].findUnique({
              where: {
                finishedGoodId_rawMaterialId: {
                  finishedGoodId: canonicalItem.id,
                  rawMaterialId: rfg.rawMaterialId
                }
              }
            });

            if (existing) {
              await tx[`${prefix}RecipeItem`].delete({
                where: { id: rfg.id }
              });
            } else {
              await tx[`${prefix}RecipeItem`].update({
                where: { id: rfg.id },
                data: { finishedGoodId: canonicalItem.id }
              });
            }
          }

          // 7. Migrate Recipe Raw Materials (handling unique compound key)
          const dupeRecipeRMs = await tx[`${prefix}RecipeItem`].findMany({
            where: { rawMaterialId: dupe.id }
          });

          for (const rrm of dupeRecipeRMs) {
            const existing = await tx[`${prefix}RecipeItem`].findUnique({
              where: {
                finishedGoodId_rawMaterialId: {
                  finishedGoodId: rrm.finishedGoodId,
                  rawMaterialId: canonicalItem.id
                }
              }
            });

            if (existing) {
              await tx[`${prefix}RecipeItem`].delete({
                where: { id: rrm.id }
              });
            } else {
              await tx[`${prefix}RecipeItem`].update({
                where: { id: rrm.id },
                data: { rawMaterialId: canonicalItem.id }
              });
            }
          }

          // 8. Safely archive duplicate item now that all FKs are migrated
          await tx[`${prefix}Item`].update({
            where: { id: dupe.id },
            data: { archivedAt: new Date(), name: `${dupe.name} [ARCHIVED_DUPLICATE]` }
          });
        });
      }
    }
    console.log(`[Migration] Finished goods consolidation complete for ${prefix}.`);
  } catch (err) {
    console.error('Consolidation error:', err);
    throw err;
  }
};

if (process.argv[1] && process.argv[1].endsWith('consolidate-items.js')) {
  Promise.all([
    consolidateDuplicateFinishedGoods('aquasphere'),
    consolidateDuplicateFinishedGoods('wadaana')
  ]).then(() => process.exit(0)).catch(() => process.exit(1));
}
