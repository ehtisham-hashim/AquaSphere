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
 * - Shrink Wrap: 0.02273 kg per pack (1 kg = 44 packs of 12 bottles)
 * - Water: 9L (12 * 0.5L + washing/flushing)
 * 
 * 1.5L Pack (6 bottles):
 * - 1.5L Empty Bottles: 6 pcs
 * - Small Caps: 6 pcs
 * - Labels: 7.80g (0.00780 kg)
 * - Shrink Wrap: 0.025 kg per pack (1 kg = 40 packs of 6 bottles)
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

  const is05L = (name = '') => {
    const n = name.toLowerCase();
    return (n.includes('500') && !n.includes('1500')) || n.includes('0.5');
  };

  const is15L = (name = '') => {
    const n = name.toLowerCase();
    return n.includes('1.5') || n.includes('1500');
  };

  // Helper to find best raw material item in database (preferring item with highest stock if duplicates exist)
  const findBestRawItem = (filterFn) => {
    const matches = items.filter(i => i.type === 'RAW_MATERIAL' && !i.archivedAt && filterFn(i));
    if (matches.length === 0) return null;
    if (matches.length === 1) return matches[0];
    return matches.sort((a, b) => Number(b.cachedQty || 0) - Number(a.cachedQty || 0))[0];
  };

  const findRawItem = (terms) => {
    return findBestRawItem(i => terms.some(t => i.name.toLowerCase().includes(t.toLowerCase())));
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
  const capItem = findBestRawItem(i => 
    i.name.toLowerCase().includes('small cap') ||
    (i.name.toLowerCase().includes('cap') && 
     !i.name.toLowerCase().includes('19l') && 
     !i.name.toLowerCase().includes('large') && 
     !i.name.toLowerCase().includes('big'))
  );

  // 3. Labels & Shrink Wrap
  const shrinkWrapItem = findRawItem(['shrink', 'wrap']);

  const label05LItem = findBestRawItem(i => i.name.toLowerCase().includes('label') && is05L(i.name)) || findRawItem(['label']);
  const label15LItem = findBestRawItem(i => i.name.toLowerCase().includes('label') && is15L(i.name)) || findRawItem(['label']);

  // --- 0.5L Pack Deductions ---
  if (packs05L > 0) {
    // 12 Empty Bottles per pack
    const empty05L = findBestRawItem(i => is05L(i.name) && (i.name.toLowerCase().includes('bottle') || i.name.toLowerCase().includes('pet')));
    
    if (empty05L) addDeduction(empty05L, decPacks05L.mul(12), 'pcs');

    // 12 Caps per pack
    if (capItem) addDeduction(capItem, decPacks05L.mul(12), 'pcs');

    // 6.72g (0.00672 kg) Labels per pack
    if (label05LItem) addDeduction(label05LItem, decPacks05L.mul(0.00672), 'kg');

    // 0.02273 kg Shrink Wrap per pack (1 kg = 44 packs of 0.5L / 12 bottles each)
    if (shrinkWrapItem) addDeduction(shrinkWrapItem, decPacks05L.mul(0.02273), 'kg');
  }

  // --- 1.5L Pack Deductions ---
  if (packs15L > 0) {
    // 6 Empty Bottles per pack
    const empty15L = findBestRawItem(i => is15L(i.name) && (i.name.toLowerCase().includes('bottle') || i.name.toLowerCase().includes('pet')));

    if (empty15L) addDeduction(empty15L, decPacks15L.mul(6), 'pcs');

    // 6 Caps per pack
    if (capItem) addDeduction(capItem, decPacks15L.mul(6), 'pcs');

    // 7.80g (0.00780 kg) Labels per pack
    if (label15LItem) addDeduction(label15LItem, decPacks15L.mul(0.00780), 'kg');

    // 0.025 kg Shrink Wrap per pack (1 kg = 40 packs of 1.5L / 6 bottles each)
    if (shrinkWrapItem) addDeduction(shrinkWrapItem, decPacks15L.mul(0.025), 'kg');
  }

  // --- 19L Bottle Deductions ---
  if (quantity > 0) {
    const empty19L = findRawItem(['empty 19l', '19l', '19 l']);
    if (empty19L) addDeduction(empty19L, decQuantity19L, 'pcs');
  }

  // 4. Finished Goods Additions (Net good packs after deducting broken bottles)
  const totalBottles05L = packs05L * 12;
  const netGoodBottles05L = Math.max(0, totalBottles05L - brokenBottles05L);
  const netGoodPacks05L = new Prisma.Decimal(netGoodBottles05L).dividedBy(12);

  if (netGoodPacks05L.greaterThan(0)) {
    const fg05L = items.find(i => i.type === 'FINISHED_GOOD' && (
      i.name.toLowerCase().includes('500ml') || 
      i.name.toLowerCase().includes('0.5l') || 
      i.name.toLowerCase().includes('0.5')
    ));
    if (fg05L) {
      finishedGoods.push({ itemId: fg05L.id, name: fg05L.name, quantityAdded: netGoodPacks05L, unit: 'packs' });
    }
  }

  const totalBottles15L = packs15L * 6;
  const netGoodBottles15L = Math.max(0, totalBottles15L - brokenBottles15L);
  const netGoodPacks15L = new Prisma.Decimal(netGoodBottles15L).dividedBy(6);

  if (netGoodPacks15L.greaterThan(0)) {
    const fg15L = items.find(i => i.type === 'FINISHED_GOOD' && (
      i.name.toLowerCase().includes('1.5l') || 
      i.name.toLowerCase().includes('1500ml') || 
      i.name.toLowerCase().includes('1.5') ||
      i.name.toLowerCase().includes('1500')
    ));
    if (fg15L) {
      finishedGoods.push({ itemId: fg15L.id, name: fg15L.name, quantityAdded: netGoodPacks15L, unit: 'packs' });
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

/**
 * Calculates raw material deductions and finished goods addition for any dynamic recipe-backed batch.
 */
function calculateDynamicBatch(outputItem, quantity, wasteQuantity = 0, allItems = []) {
  const decQty = new Prisma.Decimal(quantity || 0);
  const decWaste = new Prisma.Decimal(wasteQuantity || 0);
  const netGoodQty = Prisma.Decimal.max(0, decQty.sub(decWaste));

  const deductions = [];
  const recipe = outputItem?.recipeFinishedGoods || [];

  for (const r of recipe) {
    const rawItem = r.rawMaterial || allItems.find(i => i.id === r.rawMaterialId);
    if (!rawItem) continue;
    const qtyUsed = decQty.mul(new Prisma.Decimal(r.quantityPerUnit));
    deductions.push({
      itemId: rawItem.id,
      name: rawItem.name,
      quantityUsed: qtyUsed,
      unit: rawItem.unit || 'pcs'
    });
  }

  const finishedGoods = [];
  if (netGoodQty.greaterThan(0) && outputItem) {
    finishedGoods.push({
      itemId: outputItem.id,
      name: outputItem.name,
      quantityAdded: netGoodQty,
      unit: outputItem.unit || 'packs'
    });
  }

  const broken = [];
  if (decWaste.greaterThan(0) && outputItem) {
    broken.push({
      itemId: outputItem.id,
      name: outputItem.name,
      quantityBroken: decWaste,
      unit: outputItem.unit || 'pcs'
    });
  }

  return { deductions, finishedGoods, broken, netGoodQty };
}

export { calculateProductionBatch, calculateDynamicBatch };

