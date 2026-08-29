import { prisma } from '../src/config/db.js';

export const healSpotSalesInventory = async (prefix = 'aquasphere') => {
  try {
    console.log(`[Migration] Healing spot sales inventory transactions for ${prefix}...`);
    const recentSales = await prisma[`${prefix}SpotSale`].findMany({
      take: 100,
      orderBy: { createdAt: 'desc' }
    });
    const allItems = await prisma[`${prefix}Item`].findMany({ where: { archivedAt: null } });

    let healedCount = 0;
    for (const sale of recentSales) {
      const existingTx = await prisma[`${prefix}InventoryTransaction`].findFirst({
        where: { refType: 'SPOT_SALE', refId: sale.saleNumber }
      });

      if (!existingTx) {
        let fgItem = null;
        let qtyToDeduct = Number(sale.productQty || 1);

        if (sale.productType === 'PACK_05L' || sale.productType === 'SINGLE_05L') {
          fgItem = allItems.find(i => (i.type === 'FINISHED_GOOD' || !i.type) && ['500ml', '0.5l', '0.5', '500'].some(kw => i.name.toLowerCase().includes(kw)));
          if (sale.productType === 'SINGLE_05L') qtyToDeduct = qtyToDeduct / 12;
        } else if (sale.productType === 'PACK_15L' || sale.productType === 'SINGLE_15L') {
          fgItem = allItems.find(i => (i.type === 'FINISHED_GOOD' || !i.type) && ['1.5l', '1500ml', '1.5', '1500'].some(kw => i.name.toLowerCase().includes(kw)));
          if (sale.productType === 'SINGLE_15L') qtyToDeduct = qtyToDeduct / 6;
        } else if (sale.productType === 'BOTTLE_19L') {
          fgItem = allItems.find(i => (i.type === 'FINISHED_GOOD' || !i.type) && ['19l', '19'].some(kw => i.name.toLowerCase().includes(kw)));
        }

        if (fgItem) {
          const currentFactory = Number(fgItem.factoryQty || 0);
          let factoryDeduct = currentFactory >= qtyToDeduct ? qtyToDeduct : currentFactory;
          let warehouseDeduct = currentFactory >= qtyToDeduct ? 0 : qtyToDeduct - currentFactory;

          await prisma[`${prefix}InventoryTransaction`].create({
            data: {
              itemId: fgItem.id,
              quantity: qtyToDeduct,
              direction: 'OUT',
              reason: `SPOT_SALE_${sale.productType}`,
              refType: 'SPOT_SALE',
              refId: sale.saleNumber,
              createdAt: sale.createdAt,
              location: factoryDeduct > 0 ? 'FACTORY' : 'WAREHOUSE'
            }
          });

          const updateData = { cachedQty: { decrement: qtyToDeduct } };
          if (factoryDeduct > 0) updateData.factoryQty = { decrement: factoryDeduct };
          if (warehouseDeduct > 0) updateData.warehouseQty = { decrement: warehouseDeduct };

          await prisma[`${prefix}Item`].update({
            where: { id: fgItem.id },
            data: updateData
          });
          healedCount++;
        }
      }
    }
    console.log(`[Migration] Healed ${healedCount} spot sales for ${prefix}.`);
  } catch (err) {
    console.error('Spot sale heal error:', err);
  }
};

if (process.argv[1].endsWith('heal-spot-sales.js')) {
  Promise.all([
    healSpotSalesInventory('aquasphere'),
    healSpotSalesInventory('wadaana')
  ]).then(() => process.exit(0)).catch(() => process.exit(1));
}
