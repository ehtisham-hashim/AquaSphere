/**
 * Production Formulas - Database Recipe-Driven
 * Base units added = sealedPacks * (packSize > 1 ? packSize : 1)
 * Raw materials deducted = (goodPacks * recipeQty) + (brokenBottles * perBottleQty)
 */

/**
 * Calculates raw material deductions (good output + breakage) and finished good additions.
 * @param {Array<{ outputItem: object, quantity: number, wasteQuantity: number }>} productionRuns
 * @returns {{ deductions: Array<{ itemId: string, name: string, quantityUsed: number, unit: string, goodQty: number, lossQty: number }>, finishedGoods: Array<{ itemId: string, name: string, quantityAdded: number, unit: string, is19L: boolean, netGoodPacks: number, wasteBottles: number }>, wasteItems: Array<{ itemId: string, name: string, quantityLost: number, unit: string }> }}
 */
export function calculateBatchDeductions(productionRuns = []) {
  const deductionsMap = new Map();
  const wasteMap = new Map();
  const finishedGoods = [];

  for (const run of productionRuns) {
    const { outputItem, quantity = 0, wasteQuantity = 0 } = run;
    if (!outputItem || (quantity <= 0 && wasteQuantity <= 0)) continue;

    const packSize = Number(outputItem.packSize) > 1 ? Number(outputItem.packSize) : 1;
    const isPack = packSize > 1;

    // Full sealed packs added to finished goods (zero loose bottles in inventory)
    const baseUnitsAdded = Math.round(quantity * packSize);
    const is19L = (outputItem.name || '').toLowerCase().includes('19l');

    finishedGoods.push({
      itemId: outputItem.id,
      name: outputItem.name,
      quantityAdded: baseUnitsAdded,
      unit: outputItem.unit || 'bottle',
      is19L,
      netGoodPacks: quantity,
      wasteBottles: wasteQuantity
    });

    const recipes = outputItem.recipeFinishedGoods || [];
    for (const r of recipes) {
      const rm = r.rawMaterial;
      if (!rm) continue;

      const qtyPerUnit = Number(r.quantityPerUnit);
      const rmNameLower = (rm.name || '').toLowerCase();
      const isShrinkFilm = rmNameLower.includes('shrink') || rmNameLower.includes('film') || rmNameLower.includes('wrap');

      // Good output consumes recipe per pack/unit
      const goodQty = quantity * qtyPerUnit;

      // Broken bottles consume preforms/caps/minerals, but NOT shrink packaging film
      let lossQty = 0;
      if (wasteQuantity > 0 && !isShrinkFilm) {
        if (isPack) {
          lossQty = (qtyPerUnit / packSize) * wasteQuantity;
        } else {
          lossQty = qtyPerUnit * wasteQuantity;
        }
      }

      const totalQtyUsed = Number((goodQty + lossQty).toFixed(4));
      const unit = rm.unit || 'pcs';

      const existing = deductionsMap.get(rm.id) || {
        itemId: rm.id,
        name: rm.name,
        quantityUsed: 0,
        goodQty: 0,
        lossQty: 0,
        unit
      };
      existing.quantityUsed = Number((existing.quantityUsed + totalQtyUsed).toFixed(4));
      existing.goodQty = Number((existing.goodQty + goodQty).toFixed(4));
      existing.lossQty = Number((existing.lossQty + lossQty).toFixed(4));
      deductionsMap.set(rm.id, existing);

      if (lossQty > 0) {
        const existingWaste = wasteMap.get(rm.id) || {
          itemId: rm.id,
          name: rm.name,
          quantityLost: 0,
          unit
        };
        existingWaste.quantityLost = Number((existingWaste.quantityLost + lossQty).toFixed(4));
        wasteMap.set(rm.id, existingWaste);
      }
    }
  }

  return {
    deductions: Array.from(deductionsMap.values()),
    finishedGoods,
    wasteItems: Array.from(wasteMap.values())
  };
}

// Backwards compatibility alias
export const calculateDynamicBatch = (outputItem, quantity, wasteQuantity) => {
  const res = calculateBatchDeductions([{ outputItem, quantity, wasteQuantity }]);
  return {
    deductions: res.deductions,
    finishedGoods: res.finishedGoods,
    wasteItems: res.wasteItems,
    broken: []
  };
};

export const calculateProductionBatch = calculateBatchDeductions;
