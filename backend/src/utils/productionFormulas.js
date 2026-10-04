/**
 * Production Formulas - 100% Database Recipe-Driven
 * Base units added = netGoodPacks * (packSize > 1 ? packSize : 1)
 * Raw materials deducted = producedPacks * recipeItem.quantityPerUnit
 */

/**
 * Calculates raw material deductions and finished good base additions.
 * @param {Array<{ outputItem: object, quantity: number, wasteQuantity: number }>} productionRuns
 * @returns {{ deductions: Array<{ itemId: string, name: string, quantityUsed: number, unit: string }>, finishedGoods: Array<{ itemId: string, name: string, quantityAdded: number, unit: string, is19L: boolean, netGoodPacks: number, wastePacks: number }> }}
 */
export function calculateBatchDeductions(productionRuns = []) {
  const deductionsMap = new Map();
  const finishedGoods = [];

  for (const run of productionRuns) {
    const { outputItem, quantity = 0, wasteQuantity = 0 } = run;
    if (!outputItem || quantity <= 0) continue;

    const packSize = Number(outputItem.packSize) > 1 ? Number(outputItem.packSize) : 1;
    
    // FIX: wasteQuantity is in base units (bottles), quantity is in packs
    // Convert waste from bottles to packs before subtracting
    const wasteInPacks = wasteQuantity / packSize;
    const netGoodPacks = Math.max(0, quantity - wasteInPacks);
    const baseUnitsAdded = Math.round(netGoodPacks * packSize);

    const is19L = (outputItem.name || '').toLowerCase().includes('19l');

    finishedGoods.push({
      itemId: outputItem.id,
      name: outputItem.name,
      quantityAdded: baseUnitsAdded,
      unit: outputItem.unit || 'bottle',
      is19L,
      netGoodPacks,
      wastePacks: wasteInPacks
    });

    const recipes = outputItem.recipeFinishedGoods || [];
    for (const r of recipes) {
      const rm = r.rawMaterial;
      if (!rm) continue;

      // Recipe quantityPerUnit is for 1 produced unit of this finished good
      const qtyUsed = quantity * Number(r.quantityPerUnit);
      const existing = deductionsMap.get(rm.id) || {
        itemId: rm.id,
        name: rm.name,
        quantityUsed: 0,
        unit: rm.unit || 'pcs'
      };
      existing.quantityUsed += qtyUsed;
      deductionsMap.set(rm.id, existing);
    }
  }

  return {
    deductions: Array.from(deductionsMap.values()),
    finishedGoods
  };
}

// Backwards compatibility alias
export const calculateDynamicBatch = (outputItem, quantity, wasteQuantity) => {
  const res = calculateBatchDeductions([{ outputItem, quantity, wasteQuantity }]);
  return {
    deductions: res.deductions,
    finishedGoods: res.finishedGoods,
    broken: []
  };
};

export const calculateProductionBatch = calculateBatchDeductions;
