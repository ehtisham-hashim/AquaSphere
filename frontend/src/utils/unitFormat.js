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
