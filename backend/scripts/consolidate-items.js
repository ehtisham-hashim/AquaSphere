import { prisma } from '../src/config/db.js';

export const consolidateDuplicateFinishedGoods = async (prefix = 'aquasphere') => {
  if (prefix === 'wadaana') return;
  try {
    console.log(`[Migration] Consolidating duplicate finished goods for ${prefix}...`);
    const allFG = await prisma[`${prefix}Item`].findMany({
      where: { archivedAt: null }
    });

    const groups = [
      { canonicalName: '0.5L PET Pack (12 Bottles)', unit: 'packs', keywords: ['0.5', '500'] },
      { canonicalName: '1.5L PET Pack (6 Bottles)', unit: 'packs', keywords: ['1.5', '1500'] },
      { canonicalName: '19L Refill Bottle', unit: 'bottles', keywords: ['19'] }
    ];

    for (const g of groups) {
      const matchingItems = allFG.filter(i => 
        (i.type === 'FINISHED_GOOD' || !i.type) && 
        g.keywords.some(kw => i.name.toLowerCase().includes(kw.toLowerCase()))
      );

      if (matchingItems.length === 0) continue;

      let canonicalItem = matchingItems.find(i => i.name === g.canonicalName) || matchingItems[0];

      await prisma[`${prefix}Item`].update({
        where: { id: canonicalItem.id },
        data: { name: g.canonicalName, unit: g.unit, type: 'FINISHED_GOOD' }
      });

      for (const dupe of matchingItems) {
        if (dupe.id === canonicalItem.id) continue;

        await prisma[`${prefix}InventoryTransaction`].updateMany({
          where: { itemId: dupe.id },
          data: { itemId: canonicalItem.id }
        }).catch(() => null);

        await prisma[`${prefix}OrderItem`].updateMany({
          where: { itemId: dupe.id },
          data: { itemId: canonicalItem.id }
        }).catch(() => null);

        await prisma[`${prefix}PurchaseItem`].updateMany({
          where: { itemId: dupe.id },
          data: { itemId: canonicalItem.id }
        }).catch(() => null);

        await prisma[`${prefix}ProductionBatchConsumption`].updateMany({
          where: { itemId: dupe.id },
          data: { itemId: canonicalItem.id }
        }).catch(() => null);

        await prisma[`${prefix}ProductionBatch`].updateMany({
          where: { outputItemId: dupe.id },
          data: { outputItemId: canonicalItem.id }
        }).catch(() => null);

        await prisma[`${prefix}ProductionBatch`].updateMany({
          where: { inputItemId: dupe.id },
          data: { inputItemId: canonicalItem.id }
        }).catch(() => null);

        await prisma[`${prefix}Item`].update({
          where: { id: dupe.id },
          data: { archivedAt: new Date(), name: `${dupe.name} [ARCHIVED_DUPLICATE]` }
        }).catch(() => null);
      }
    }
    console.log(`[Migration] Finished goods consolidation complete for ${prefix}.`);
  } catch (err) {
    console.error('Consolidation error:', err);
  }
};

if (process.argv[1].endsWith('consolidate-items.js')) {
  Promise.all([
    consolidateDuplicateFinishedGoods('aquasphere'),
    consolidateDuplicateFinishedGoods('wadaana')
  ]).then(() => process.exit(0)).catch(() => process.exit(1));
}
