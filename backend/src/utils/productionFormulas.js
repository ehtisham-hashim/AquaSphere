import { Prisma } from '@prisma/client';

/**
 * Calculates raw material deductions and finished goods additions for a production batch.
 *
 * @param {Object} params
 * @param {number} params.packs05L - Number of 0.5L packs produced
 * @param {number} params.packs15L - Number of 1.5L packs produced
 * @param {number} params.brokenBottles05L - Number of broken 0.5L bottles
 * @param {number} params.brokenBottles15L - Number of broken 1.5L bottles
 * @param {Array} items - All items from the database to map deductions to actual item IDs
 * @returns {Object} { deductions, finishedGoods, broken }
 */
function calculateProductionBatch(params, items) {
  const { packs05L = 0, packs15L = 0, brokenBottles05L = 0, brokenBottles15L = 0 } = params;

  // Constants
  const LITRES_PER_05L_PACK = 6; // 12 bottles * 0.5L
  const LITRES_PER_15L_PACK = 9; // 6 bottles * 1.5L
  const WATER_PER_MINERAL_SET = 15140; // Litres treated by 1 mineral set

  const totalLitres05L = new Prisma.Decimal(packs05L).mul(LITRES_PER_05L_PACK);
  const totalLitres15L = new Prisma.Decimal(packs15L).mul(LITRES_PER_15L_PACK);
  const totalLitres = totalLitres05L.add(totalLitres15L);

  // 1 mineral set = 2kg Calcium + 1kg Magnesium + 0.5kg Sodium
  const mineralSetFraction = totalLitres.dividedBy(WATER_PER_MINERAL_SET);

  const deductions = [];
  const finishedGoods = [];
  const broken = [];

  // Helper to find item ID by name (case-insensitive fuzzy match)
  const findItemId = (searchNames) => {
    const item = items.find(i => searchNames.some(name => i.name.toLowerCase().includes(name.toLowerCase())));
    return item ? item.id : null;
  };

  // 1. Minerals
  const calciumId = findItemId(['calcium']);
  if (calciumId && mineralSetFraction.greaterThan(0)) {
    deductions.push({ itemId: calciumId, name: 'Calcium', quantityUsed: mineralSetFraction.mul(2), unit: 'kg' });
  }

  const magnesiumId = findItemId(['magnesium']);
  if (magnesiumId && mineralSetFraction.greaterThan(0)) {
    deductions.push({ itemId: magnesiumId, name: 'Magnesium', quantityUsed: mineralSetFraction.mul(1), unit: 'kg' });
  }

  const sodiumId = findItemId(['sodium']);
  if (sodiumId && mineralSetFraction.greaterThan(0)) {
    deductions.push({ itemId: sodiumId, name: 'Sodium', quantityUsed: mineralSetFraction.mul(0.5), unit: 'kg' });
  }

  // 2. 0.5L Specific Materials
  if (packs05L > 0) {
    const bottle05LId = findItemId(['500ml', '0.5L', 'bottle', 'empty']); // Make sure to get RAW_MATERIAL
    const rawBottle05L = items.find(i => i.type === 'RAW_MATERIAL' && (i.name.includes('500ml') || i.name.includes('0.5L')));
    if (rawBottle05L) {
      deductions.push({ itemId: rawBottle05L.id, name: rawBottle05L.name, quantityUsed: new Prisma.Decimal(packs05L * 12), unit: 'pcs' });
    }

    const capsId = findItemId(['cap', 'small cap']);
    const rawCaps = items.find(i => i.type === 'RAW_MATERIAL' && i.name.toLowerCase().includes('cap'));
    if (rawCaps) {
      deductions.push({ itemId: rawCaps.id, name: rawCaps.name, quantityUsed: new Prisma.Decimal(packs05L * 12), unit: 'pcs' });
    }

    const labelsId = findItemId(['label']);
    const rawLabels = items.find(i => i.type === 'RAW_MATERIAL' && i.name.toLowerCase().includes('label'));
    if (rawLabels) {
      // 6.72g per pack
      deductions.push({ itemId: rawLabels.id, name: rawLabels.name, quantityUsed: new Prisma.Decimal(packs05L).mul(0.00672), unit: 'kg' });
    }

    // Shrink wrap skipped for now as per plan
  }

  // 3. 1.5L Specific Materials
  if (packs15L > 0) {
    const rawBottle15L = items.find(i => i.type === 'RAW_MATERIAL' && (i.name.includes('1.5L') || i.name.includes('1500ml')));
    if (rawBottle15L) {
      deductions.push({ itemId: rawBottle15L.id, name: rawBottle15L.name, quantityUsed: new Prisma.Decimal(packs15L * 6), unit: 'pcs' });
    }

    const rawCaps = items.find(i => i.type === 'RAW_MATERIAL' && i.name.toLowerCase().includes('cap'));
    if (rawCaps) {
      const existingCapDeduction = deductions.find(d => d.itemId === rawCaps.id);
      if (existingCapDeduction) {
        existingCapDeduction.quantityUsed = existingCapDeduction.quantityUsed.add(packs15L * 6);
      } else {
        deductions.push({ itemId: rawCaps.id, name: rawCaps.name, quantityUsed: new Prisma.Decimal(packs15L * 6), unit: 'pcs' });
      }
    }

    const rawLabels = items.find(i => i.type === 'RAW_MATERIAL' && i.name.toLowerCase().includes('label'));
    if (rawLabels) {
      // 7.86g per pack
      const existingLabelDeduction = deductions.find(d => d.itemId === rawLabels.id);
      if (existingLabelDeduction) {
         existingLabelDeduction.quantityUsed = existingLabelDeduction.quantityUsed.add(new Prisma.Decimal(packs15L).mul(0.00786));
      } else {
         deductions.push({ itemId: rawLabels.id, name: rawLabels.name, quantityUsed: new Prisma.Decimal(packs15L).mul(0.00786), unit: 'kg' });
      }
    }
  }

  // 4. Finished Goods Additions
  if (packs05L > 0) {
    const fg05L = items.find(i => i.type === 'FINISHED_GOOD' && (i.name.includes('500ml') || i.name.includes('0.5L')));
    if (fg05L) {
      finishedGoods.push({ itemId: fg05L.id, name: fg05L.name, quantityAdded: new Prisma.Decimal(packs05L), unit: 'packs' });
    }
  }

  if (packs15L > 0) {
    const fg15L = items.find(i => i.type === 'FINISHED_GOOD' && (i.name.includes('1.5L') || i.name.includes('1500ml')));
    if (fg15L) {
      finishedGoods.push({ itemId: fg15L.id, name: fg15L.name, quantityAdded: new Prisma.Decimal(packs15L), unit: 'packs' });
    }
  }

  // 5. Broken Bottles
  if (brokenBottles05L > 0) {
    const rawBottle05L = items.find(i => i.type === 'RAW_MATERIAL' && (i.name.includes('500ml') || i.name.includes('0.5L')));
    if (rawBottle05L) {
      broken.push({ itemId: rawBottle05L.id, name: rawBottle05L.name, quantityBroken: new Prisma.Decimal(brokenBottles05L), unit: 'pcs' });
    }
  }

  if (brokenBottles15L > 0) {
    const rawBottle15L = items.find(i => i.type === 'RAW_MATERIAL' && (i.name.includes('1.5L') || i.name.includes('1500ml')));
    if (rawBottle15L) {
      broken.push({ itemId: rawBottle15L.id, name: rawBottle15L.name, quantityBroken: new Prisma.Decimal(brokenBottles15L), unit: 'pcs' });
    }
  }

  return { deductions, finishedGoods, broken };
}

export { calculateProductionBatch };
