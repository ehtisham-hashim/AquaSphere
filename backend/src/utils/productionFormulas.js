import pkg from '@prisma/client';
const { Prisma } = pkg;

/**
 * Calculates raw material deductions and finished goods additions for an AquaSphere production batch.
 * Implements exact-decimal formulas per owner handwritten specs.
 * 
 * 0.5L Pack (12 bottles):
 * - 0.5L Empty Bottles: 12 pcs
 * - Small Caps: 12 pcs
 * - Labels: 6.72g (0.00672 kg)
 * - Shrink Wrap: 50g (0.050 kg)
 * - Water: 9L (12 * 0.5L + washing/flushing)
 * 
 * 1.5L Pack (6 bottles):
 * - 1.5L Empty Bottles: 6 pcs
 * - Small Caps: 6 pcs
 * - Labels: 7.80g (0.00780 kg)
 * - Shrink Wrap: 50g (0.050 kg)
 * - Water: 12L (6 * 1.5L + washing/flushing)
 * 
 * 19L PC Bottle:
 * - Water: 24L (19L + washing/flushing)
 * 
 * Mineral Set composition (15,141L capacity):
 * - Calcium: 2 kg
 * - Magnesium: 1 kg
 * - Sodium: 0.5 kg
 */
function calculateProductionBatch(params, items) {
  const { 
    packs05L = 0, 
    packs15L = 0, 
    quantity = 0, 
    brokenBottles05L = 0, 
    brokenBottles15L = 0 
  } = params;

  const LITRES_PER_05L_PACK = 9;   // 12 bottles * 0.5L + flush/wash (owner spec)
  const LITRES_PER_15L_PACK = 12;  // 6 bottles * 1.5L + flush/wash (owner spec)
  const LITRES_PER_19L_BOTTLE = 24; // 19L PC bottle + flush/wash (owner spec)
  const WATER_PER_MINERAL_SET = 15141; // Litres treated per mineral set (owner spec)

  const decPacks05L = new Prisma.Decimal(packs05L);
  const decPacks15L = new Prisma.Decimal(packs15L);
  const decQuantity19L = new Prisma.Decimal(quantity);

  const totalLitres05L = decPacks05L.mul(LITRES_PER_05L_PACK);
  const totalLitres15L = decPacks15L.mul(LITRES_PER_15L_PACK);
  const totalLitres19L = decQuantity19L.mul(LITRES_PER_19L_BOTTLE);
  const totalLitres = totalLitres05L.add(totalLitres15L).add(totalLitres19L);

  // Exact decimal fraction of mineral set used
  const mineralSetFraction = totalLitres.dividedBy(WATER_PER_MINERAL_SET);

  const deductions = [];
  const finishedGoods = [];
  const broken = [];

  // Helper to find raw material item in database
  const findRawItem = (terms) => {
    return items.find(i => 
      i.type === 'RAW_MATERIAL' && 
      !i.archivedAt &&
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

  // 1. Mineral Set Chemicals (Calcium 2kg, Magnesium 1kg, Sodium 0.5kg per 15,141L)
  if (totalLitres.greaterThan(0)) {
    const calcium = findRawItem(['calcium']);
    if (calcium) addDeduction(calcium, mineralSetFraction.mul(2), 'kg');

    const magnesium = findRawItem(['magnesium']);
    if (magnesium) addDeduction(magnesium, mineralSetFraction.mul(1), 'kg');

    const sodium = findRawItem(['sodium']);
    if (sodium) addDeduction(sodium, mineralSetFraction.mul(0.5), 'kg');
  }

  // 2. Caps (Small PET caps — explicitly avoid 19L / large / big caps)
  const capItem = items.find(i => 
    i.type === 'RAW_MATERIAL' && 
    !i.archivedAt &&
    (
      i.name.toLowerCase().includes('small cap') ||
      (i.name.toLowerCase().includes('cap') && 
       !i.name.toLowerCase().includes('19l') && 
       !i.name.toLowerCase().includes('large') && 
       !i.name.toLowerCase().includes('big'))
    )
  );

  // 3. Labels & Shrink Wrap
  const shrinkWrapItem = findRawItem(['shrink', 'wrap']);

  const label05LItem = items.find(i => 
    i.type === 'RAW_MATERIAL' && 
    !i.archivedAt && 
    i.name.toLowerCase().includes('label') && 
    (i.name.toLowerCase().includes('500') || i.name.toLowerCase().includes('0.5'))
  ) || findRawItem(['label']);

  const label15LItem = items.find(i => 
    i.type === 'RAW_MATERIAL' && 
    !i.archivedAt && 
    i.name.toLowerCase().includes('label') && 
    (i.name.toLowerCase().includes('1.5') || i.name.toLowerCase().includes('1500'))
  ) || findRawItem(['label']);

  // --- 0.5L Pack Deductions ---
  if (packs05L > 0) {
    // 12 Empty Bottles per pack
    const empty05L = items.find(i => 
      i.type === 'RAW_MATERIAL' && 
      !i.archivedAt && 
      (i.name.toLowerCase().includes('500') || i.name.toLowerCase().includes('0.5')) &&
      (i.name.toLowerCase().includes('bottle') || i.name.toLowerCase().includes('pet'))
    ) || findRawItem(['500ml', '0.5l']);
    
    if (empty05L) addDeduction(empty05L, decPacks05L.mul(12), 'pcs');

    // 12 Caps per pack
    if (capItem) addDeduction(capItem, decPacks05L.mul(12), 'pcs');

    // 6.72g (0.00672 kg) Labels per pack
    if (label05LItem) addDeduction(label05LItem, decPacks05L.mul(0.00672), 'kg');

    // 50g (0.050 kg) Shrink Wrap per pack
    if (shrinkWrapItem) addDeduction(shrinkWrapItem, decPacks05L.mul(0.050), 'kg');
  }

  // --- 1.5L Pack Deductions ---
  if (packs15L > 0) {
    // 6 Empty Bottles per pack
    const empty15L = items.find(i => 
      i.type === 'RAW_MATERIAL' && 
      !i.archivedAt && 
      (i.name.toLowerCase().includes('1.5') || i.name.toLowerCase().includes('1500')) &&
      (i.name.toLowerCase().includes('bottle') || i.name.toLowerCase().includes('pet'))
    ) || findRawItem(['1.5l', '1500ml']);

    if (empty15L) addDeduction(empty15L, decPacks15L.mul(6), 'pcs');

    // 6 Caps per pack
    if (capItem) addDeduction(capItem, decPacks15L.mul(6), 'pcs');

    // 7.80g (0.00780 kg) Labels per pack
    if (label15LItem) addDeduction(label15LItem, decPacks15L.mul(0.00780), 'kg');

    // 50g (0.050 kg) Shrink Wrap per pack
    if (shrinkWrapItem) addDeduction(shrinkWrapItem, decPacks15L.mul(0.050), 'kg');
  }

  // 4. Finished Goods Additions
  if (packs05L > 0) {
    const fg05L = items.find(i => i.type === 'FINISHED_GOOD' && (i.name.toLowerCase().includes('500ml') || i.name.toLowerCase().includes('0.5l')));
    if (fg05L) {
      finishedGoods.push({ itemId: fg05L.id, name: fg05L.name, quantityAdded: decPacks05L, unit: 'packs' });
    }
  }

  if (packs15L > 0) {
    const fg15L = items.find(i => i.type === 'FINISHED_GOOD' && (i.name.toLowerCase().includes('1.5l') || i.name.toLowerCase().includes('1500ml')));
    if (fg15L) {
      finishedGoods.push({ itemId: fg15L.id, name: fg15L.name, quantityAdded: decPacks15L, unit: 'packs' });
    }
  }

  // 5. Broken Bottles Logging
  if (brokenBottles05L > 0) {
    const empty05L = findRawItem(['500ml', '0.5l']);
    if (empty05L) {
      broken.push({ itemId: empty05L.id, name: empty05L.name, quantityBroken: new Prisma.Decimal(brokenBottles05L), unit: 'pcs' });
    }
  }

  if (brokenBottles15L > 0) {
    const empty15L = findRawItem(['1.5l', '1500ml']);
    if (empty15L) {
      broken.push({ itemId: empty15L.id, name: empty15L.name, quantityBroken: new Prisma.Decimal(brokenBottles15L), unit: 'pcs' });
    }
  }

  return { deductions, finishedGoods, broken, totalLitres };
}

export { calculateProductionBatch };
