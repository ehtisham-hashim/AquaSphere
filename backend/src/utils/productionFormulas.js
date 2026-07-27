/**
 * Calculates raw material deductions and finished goods additions for a production batch.
 * Implements exact-decimal formulas per §8 PM specs in development.md.
 * 
 * 0.5L Pack (12 bottles):
 * - 0.5L Empty Bottles: 12 pcs
 * - Small Caps: 12 pcs
 * - Labels: 6.72g (0.00672 kg)
 * - Shrink Wrap: 50g (0.050 kg)
 * - Water: 6L (12 * 0.5L)
 * - Mineral Set fraction: 6L / 15,140L = 0.000396301... sets
 * 
 * 1.5L Pack (6 bottles):
 * - 1.5L Empty Bottles: 6 pcs
 * - Small Caps: 6 pcs
 * - Labels: 7.86g (0.00786 kg)
 * - Shrink Wrap: 50g (0.050 kg)
 * - Water: 9L (6 * 1.5L)
 * - Mineral Set fraction: 9L / 15,140L = 0.000594451... sets
 * 
 * Mineral Set composition (15,140L capacity):
 * - Calcium: 2 kg
 * - Magnesium: 1 kg
 * - Sodium: 0.5 kg
 */
function calculateProductionBatch(params, items) {
  const { packs05L = 0, packs15L = 0, brokenBottles05L = 0, brokenBottles15L = 0 } = params;

  const LITRES_PER_05L_PACK = 6;  // 12 bottles * 0.5L
  const LITRES_PER_15L_PACK = 9;  // 6 bottles * 1.5L
  const WATER_PER_MINERAL_SET = 15140; // Litres treated per mineral set

  const decPacks05L = new Prisma.Decimal(packs05L);
  const decPacks15L = new Prisma.Decimal(packs15L);

  const totalLitres05L = decPacks05L.mul(LITRES_PER_05L_PACK);
  const totalLitres15L = decPacks15L.mul(LITRES_PER_15L_PACK);
  const totalLitres = totalLitres05L.add(totalLitres15L);

  // Exact decimal fraction of mineral set used
  const mineralSetFraction = totalLitres.dividedBy(WATER_PER_MINERAL_SET);

  const deductions = [];
  const finishedGoods = [];
  const broken = [];

  // Helper to find raw material item in database
  const findRawItem = (terms) => {
    return items.find(i => 
      i.type === 'RAW_MATERIAL' && 
      terms.some(t => i.name.toLowerCase().includes(t.toLowerCase()))
    );
  };

  // Helper to add or accumulate deductions
  const addDeduction = (item, quantity, unit) => {
    if (!item || quantity.lessThanOrEqualTo(0)) return;
    const existing = deductions.find(d => d.itemId === item.id);
    if (existing) {
      existing.quantityUsed = existing.quantityUsed.add(quantity);
    } else {
      deductions.push({
        itemId: item.id,
        name: item.name,
        quantityUsed: quantity,
        unit: unit || item.unit
      });
    }
  };

  // 1. Mineral Set Chemicals (Calcium 2kg, Magnesium 1kg, Sodium 0.5kg per 15,140L)
  if (totalLitres.greaterThan(0)) {
    const calcium = findRawItem(['calcium']);
    if (calcium) addDeduction(calcium, mineralSetFraction.mul(2), 'kg');

    const magnesium = findRawItem(['magnesium']);
    if (magnesium) addDeduction(magnesium, mineralSetFraction.mul(1), 'kg');

    const sodium = findRawItem(['sodium']);
    if (sodium) addDeduction(sodium, mineralSetFraction.mul(0.5), 'kg');
  }

  // 2. Caps (Shared or specific)
  const capItem = findRawItem(['cap', 'small cap']);

  // 3. Labels & Shrink Wrap
  const labelItem = findRawItem(['label']);
  const shrinkWrapItem = findRawItem(['shrink', 'wrap', 'shrink wrap']);

  // --- 0.5L Pack Deductions ---
  if (packs05L > 0) {
    // 12 Empty Bottles per pack
    const empty05L = findRawItem(['500ml', '0.5l', 'bottle']);
    if (empty05L) addDeduction(empty05L, decPacks05L.mul(12), 'pcs');

    // 12 Caps per pack
    if (capItem) addDeduction(capItem, decPacks05L.mul(12), 'pcs');

    // 6.72g (0.00672 kg) Labels per pack
    if (labelItem) addDeduction(labelItem, decPacks05L.mul(0.00672), 'kg');

    // 50g (0.050 kg) Shrink Wrap per pack
    if (shrinkWrapItem) addDeduction(shrinkWrapItem, decPacks05L.mul(0.050), 'kg');
  }

  // --- 1.5L Pack Deductions ---
  if (packs15L > 0) {
    // 6 Empty Bottles per pack
    const empty15L = findRawItem(['1.5l', '1500ml', 'bottle']);
    if (empty15L) addDeduction(empty15L, decPacks15L.mul(6), 'pcs');

    // 6 Caps per pack
    if (capItem) addDeduction(capItem, decPacks15L.mul(6), 'pcs');

    // 7.86g (0.00786 kg) Labels per pack
    if (labelItem) addDeduction(labelItem, decPacks15L.mul(0.00786), 'kg');

    // 50g (0.050 kg) Shrink Wrap per pack
    if (shrinkWrapItem) addDeduction(shrinkWrapItem, decPacks15L.mul(0.050), 'kg');
  }

  // 4. Finished Goods Additions
  if (packs05L > 0) {
    const fg05L = items.find(i => i.type === 'FINISHED_GOOD' && (i.name.includes('500ml') || i.name.includes('0.5L')));
    if (fg05L) {
      finishedGoods.push({ itemId: fg05L.id, name: fg05L.name, quantityAdded: decPacks05L, unit: 'packs' });
    }
  }

  if (packs15L > 0) {
    const fg15L = items.find(i => i.type === 'FINISHED_GOOD' && (i.name.includes('1.5L') || i.name.includes('1500ml')));
    if (fg15L) {
      finishedGoods.push({ itemId: fg15L.id, name: fg15L.name, quantityAdded: decPacks15L, unit: 'packs' });
    }
  }

  // 5. Broken Bottles Logging
  if (brokenBottles05L > 0) {
    const empty05L = findRawItem(['500ml', '0.5l', 'bottle']);
    if (empty05L) {
      broken.push({ itemId: empty05L.id, name: empty05L.name, quantityBroken: new Prisma.Decimal(brokenBottles05L), unit: 'pcs' });
    }
  }

  if (brokenBottles15L > 0) {
    const empty15L = findRawItem(['1.5l', '1500ml', 'bottle']);
    if (empty15L) {
      broken.push({ itemId: empty15L.id, name: empty15L.name, quantityBroken: new Prisma.Decimal(brokenBottles15L), unit: 'pcs' });
    }
  }

  return { deductions, finishedGoods, broken };
}

export { calculateProductionBatch };
