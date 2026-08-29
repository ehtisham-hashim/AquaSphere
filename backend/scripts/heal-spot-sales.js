import { prisma } from '../src/config/db.js';
import { getProductSizeKey } from './consolidate-items.js';

/**
 * Maps a spot sale product type to a normalized product size key ('0.5L', '1.5L', '19L').
 *
 * @param {string} productType - Spot sale product type identifier.
 * @returns {'0.5L' | '1.5L' | '19L' | null} Normalized size key.
 */
export const mapSpotSaleProductTypeToSizeKey = (productType) => {
  if (!productType) return null;
  const upper = productType.toUpperCase();
  if (upper.includes('15L') || upper.includes('1.5') || upper.includes('1500')) return '1.5L';
  if (upper.includes('05L') || upper.includes('0.5') || upper.includes('500')) return '0.5L';
  if (upper.includes('19L') || upper.includes('19')) return '19L';
  return getProductSizeKey(productType);
};

/**
 * Heals missing inventory transactions for recent spot sales atomically within a transaction.
 * Uses the spot sale primary key UUID (sale.id) as a stable, non-null idempotency key to prevent conflicts.
 *
 * @param {'aquasphere' | 'wadaana'} [prefix='aquasphere'] - Target tenant prefix.
 * @returns {Promise<void>}
 */
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
      if (!sale.id) {
        console.warn(`[Migration] Skipping spot sale without valid ID:`, sale);
        continue;
      }

      const sizeKey = mapSpotSaleProductTypeToSizeKey(sale.productType);
      if (!sizeKey) continue;

      let fgItem = allItems.find(i => 
        (i.type === 'FINISHED_GOOD' || !i.type) && 
        getProductSizeKey(i.name) === sizeKey
      );

      if (!fgItem) continue;

      const rawQty = sale.productQty !== undefined && sale.productQty !== null ? Number(sale.productQty) : 1;
      if (isNaN(rawQty) || rawQty <= 0) {
        console.warn(`[Migration] Skipping spot sale with non-positive quantity (${sale.productQty}):`, sale.id);
        continue;
      }

      let qtyToDeduct = rawQty;
      const normalizedType = String(sale.productType || '').toUpperCase();
      if (normalizedType.includes('SINGLE_05L') || (normalizedType.includes('05L') && normalizedType.includes('SINGLE'))) {
        qtyToDeduct = qtyToDeduct / 12;
      } else if (normalizedType.includes('SINGLE_15L') || (normalizedType.includes('15L') && normalizedType.includes('SINGLE'))) {
        qtyToDeduct = qtyToDeduct / 6;
      }

      // Atomic execution: check existence, create transaction record, decrement item stock
      await prisma.$transaction(async (tx) => {
        // Idempotency check: match either stable primary key ID or saleNumber if non-null
        const existingTx = await tx[`${prefix}InventoryTransaction`].findFirst({
          where: {
            refType: 'SPOT_SALE',
            OR: [
              { refId: sale.id },
              ...(sale.saleNumber ? [{ refId: sale.saleNumber }] : [])
            ]
          }
        });

        if (existingTx) return;

        const currentItem = await tx[`${prefix}Item`].findUnique({
          where: { id: fgItem.id }
        });

        if (!currentItem) return;

        const currentFactory = Number(currentItem.factoryQty || 0);
        let factoryDeduct = currentFactory >= qtyToDeduct ? qtyToDeduct : currentFactory;
        let warehouseDeduct = currentFactory >= qtyToDeduct ? 0 : qtyToDeduct - currentFactory;

        // Create transaction record
        await tx[`${prefix}InventoryTransaction`].create({
          data: {
            itemId: currentItem.id,
            quantity: qtyToDeduct,
            direction: 'OUT',
            reason: `SPOT_SALE_${sale.productType || 'PET'}`,
            refType: 'SPOT_SALE',
            refId: sale.id, // Stable non-null unique primary key identifier
            createdAt: sale.createdAt,
            location: factoryDeduct > 0 ? 'FACTORY' : 'WAREHOUSE'
          }
        });

        // Decrement item quantity
        const updateData = { cachedQty: { decrement: qtyToDeduct } };
        if (factoryDeduct > 0) updateData.factoryQty = { decrement: factoryDeduct };
        if (warehouseDeduct > 0) updateData.warehouseQty = { decrement: warehouseDeduct };

        await tx[`${prefix}Item`].update({
          where: { id: currentItem.id },
          data: updateData
        });

        healedCount++;
      });
    }
    console.log(`[Migration] Healed ${healedCount} spot sales for ${prefix}.`);
  } catch (err) {
    console.error('Spot sale heal error:', err);
    throw err;
  }
};

if (process.argv[1] && process.argv[1].endsWith('heal-spot-sales.js')) {
  Promise.all([
    healSpotSalesInventory('aquasphere'),
    healSpotSalesInventory('wadaana')
  ]).then(() => process.exit(0)).catch(() => process.exit(1));
}
