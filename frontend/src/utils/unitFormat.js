// frontend/src/utils/unitFormat.js

const CONTINUOUS_UNITS = new Set([
  'kg', 'kgs', 'kilogram', 'kilograms',
  'g', 'gm', 'gram', 'grams',
  'mg', 'l', 'ltr', 'litre', 'litres', 'liter', 'liters', 'ml'
]);

/**
 * Checks if a unit represents continuous measurement (weight / volume)
 */
export const isContinuousUnit = (unit = '') => {
  return CONTINUOUS_UNITS.has(String(unit).trim().toLowerCase());
};

/**
 * Checks if a unit represents discrete countable items (bottles, caps, boxes)
 */
export const isDiscreteUnit = (unit = '') => {
  return !isContinuousUnit(unit);
};

/**
 * Formats Raw Material quantities cleanly:
 * - Discrete units (bottle, cap, pcs): formatted as whole integers (e.g. 1,250)
 * - Continuous units (kg, litres): up to 3 decimal places without trailing zeros (e.g. 14.375 or 0.45)
 */
export const formatRawMaterialQty = (qty, unit = '') => {
  const num = Number(qty || 0);
  if (Number.isNaN(num)) return '0';
  if (isContinuousUnit(unit)) {
    return num.toLocaleString(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 3
    });
  }
  return Math.round(num).toLocaleString('en-PK');
};

/**
 * Returns the customer-facing trading unit for a finished good ("packs"/"pack", "bottles"/"bottle", or "litres"/"litre").
 * Packed SKUs (packSize > 1) are always reported in packs on customer orders.
 */
export const formatTradingUnit = (item, qty = 2) => {
  const nameLower = String(item?.name || '').toLowerCase();
  const rawUnit = String(item?.unit || '').toLowerCase();
  const isSingular = Math.abs(Number(qty)) === 1;

  if (nameLower.includes('bulk') || rawUnit === 'litres' || rawUnit === 'litre') {
    return isSingular ? 'litre' : 'litres';
  }
  const packSize = Math.max(1, Number(item?.packSize || 1));
  if (packSize > 1) {
    return isSingular ? 'pack' : 'packs';
  }
  return isSingular ? 'bottle' : 'bottles';
};

/**
 * Returns concise pack breakdown label e.g. "12/pk" for packed items, or "" for single-unit SKUs.
 */
export const formatPackMeta = (item) => {
  const packSize = Math.max(1, Number(item?.packSize || 1));
  return packSize > 1 ? `${packSize}/pk` : '';
};

/**
 * Returns combined trading unit string e.g. "packs • 12/pk" or "bottles".
 */
export const formatItemUnitTag = (item, qty = 2) => {
  const unit = formatTradingUnit(item, qty);
  const packMeta = formatPackMeta(item);
  return packMeta ? `${unit} • ${packMeta}` : unit;
};

/**
 * Summarizes order line items cleanly by packs vs bottles (e.g. "7 packs + 4 bottles" instead of "11 Pcs Total").
 */
export const formatOrderItemsSummary = (orderItems = []) => {
  let packs = 0;
  let bottles = 0;
  let litres = 0;

  for (const line of orderItems || []) {
    const qty = Number(line?.quantity || 0);
    if (qty <= 0) continue;
    const item = line?.item || line;
    const nameLower = String(item?.name || '').toLowerCase();
    const rawUnit = String(item?.unit || '').toLowerCase();
    if (nameLower.includes('bulk') || rawUnit === 'litres' || rawUnit === 'litre') {
      litres += qty;
    } else if (Number(item?.packSize || 1) > 1) {
      packs += qty;
    } else {
      bottles += qty;
    }
  }

  const parts = [];
  if (packs > 0) parts.push(`${packs.toLocaleString()} ${packs === 1 ? 'pack' : 'packs'}`);
  if (bottles > 0) parts.push(`${bottles.toLocaleString()} ${bottles === 1 ? 'bottle' : 'bottles'}`);
  if (litres > 0) parts.push(`${litres.toLocaleString()} ${litres === 1 ? 'litre' : 'litres'}`);
  return parts.length > 0 ? parts.join(' + ') : '0 items';
};

