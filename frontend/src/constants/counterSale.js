/**
 * Counter Sales Module Constants, Product Definitions & Pricing Rules
 * Centralized multi-tenant configuration for retail counter sales, finished goods products, and permission rules.
 */

export const COUNTER_SALE_DEFAULTS = {
  DEFAULT_PRICE_PER_LITRE: 10,
  DEFAULT_PRICE_PER_CAP: 5,
  SALE_NUMBER_PREFIX: 'CS',
};

/**
 * Retail Finished Goods Product Catalog
 */
export const COUNTER_PRODUCTS = [
  {
    id: 'BOTTLE_19L',
    name: '19L Bottle Refill',
    category: '19L',
    unitLabel: 'Bottles',
    waterLitres: 24.0, // 24L water process per 19L bottle
    capsPerUnit: 0,
    defaultPrice: 200,
    bottlesPerPack: 1,
    isSingleBottle: false,
    description: '19 Litre refill bottle (24L water consumed)'
  },
  {
    id: 'PACK_05L',
    name: '0.5L Full Pack (12 Bottles)',
    category: '0.5L',
    unitLabel: 'Packs',
    waterLitres: 9.0, // 9L water per 0.5L pack
    capsPerUnit: 0,   // Caps were already deducted during factory production
    defaultPrice: 360, // Rs 30 / bottle
    bottlesPerPack: 12,
    isSingleBottle: false,
    description: 'Full sealed pack of 12 x 0.5L bottles'
  },
  {
    id: 'SINGLE_05L',
    name: '0.5L Single Bottle',
    category: '0.5L',
    unitLabel: 'Single Bottles',
    waterLitres: 0.75, // 0.75L water per single bottle
    capsPerUnit: 0,    // Caps were already deducted during factory production
    defaultPrice: 35,
    bottlesPerPack: 12,
    isSingleBottle: true,
    parentPackId: 'PACK_05L',
    description: 'Loose 0.5L bottle (1/12th Pack)'
  },
  {
    id: 'PACK_15L',
    name: '1.5L Full Pack (6 Bottles)',
    category: '1.5L',
    unitLabel: 'Packs',
    waterLitres: 12.0, // 12L water per 1.5L pack
    capsPerUnit: 0,    // Caps were already deducted during factory production
    defaultPrice: 300, // Rs 50 / bottle
    bottlesPerPack: 6,
    isSingleBottle: false,
    description: 'Full sealed pack of 6 x 1.5L bottles'
  },
  {
    id: 'SINGLE_15L',
    name: '1.5L Single Bottle',
    category: '1.5L',
    unitLabel: 'Single Bottles',
    waterLitres: 2.0,  // 2.0L water per single bottle
    capsPerUnit: 0,    // Caps were already deducted during factory production
    defaultPrice: 60,
    bottlesPerPack: 6,
    isSingleBottle: true,
    parentPackId: 'PACK_15L',
    description: 'Loose 1.5L bottle (1/6th Pack)'
  },
  {
    id: 'CUSTOM',
    name: 'Custom Litres / Bulk Water',
    category: 'BULK',
    unitLabel: 'Litres',
    waterLitres: 1.0,
    capsPerUnit: 0,
    defaultPrice: 10,
    isSingleBottle: false,
    description: 'Custom water volume / bulk sale'
  }
];

export const PAYMENT_METHODS = [
  { id: 'CASH', label: 'Cash' },
  { id: 'JAZZCASH', label: 'JazzCash' },
  { id: 'EASYPAISA', label: 'EasyPaisa' },
  { id: 'BANK_TRANSFER', label: 'Bank Transfer' },
  { id: 'CARD', label: 'Debit / Credit Card' },
];

/**
 * Calculates water litres, caps, and suggested price for a selected product and quantity.
 */
export const calculateProductMetrics = (productId, quantity = 1) => {
  const prod = COUNTER_PRODUCTS.find(p => p.id === productId) || COUNTER_PRODUCTS[0];
  const qty = parseFloat(quantity) || 0;

  if (productId === 'CUSTOM') {
    return {
      waterLitres: qty,
      caps: 0,
      suggestedPrice: qty * COUNTER_SALE_DEFAULTS.DEFAULT_PRICE_PER_LITRE,
      product: prod
    };
  }

  const waterLitres = Number((qty * prod.waterLitres).toFixed(2));
  const caps = Math.round(qty * prod.capsPerUnit);
  const suggestedPrice = Math.round(qty * prod.defaultPrice);

  return {
    waterLitres,
    caps,
    suggestedPrice,
    product: prod
  };
};

/**
 * Legacy total calculator
 */
export const calculateDefaultTotal = (litres = 0, caps = 0) => {
  const l = parseFloat(litres) || 0;
  const c = parseInt(caps, 10) || 0;
  return (l * COUNTER_SALE_DEFAULTS.DEFAULT_PRICE_PER_LITRE) + (c * COUNTER_SALE_DEFAULTS.DEFAULT_PRICE_PER_CAP);
};

export const generateSaleNumber = (date = new Date()) => {
  const d = String(date.getDate()).padStart(2, '0');
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const y = String(date.getFullYear()).slice(-2);
  const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${COUNTER_SALE_DEFAULTS.SALE_NUMBER_PREFIX}-${d}${m}${y}-${randomSuffix}`;
};

export const canPerformSaleAction = (userRole, isDailyClosed = false, action = 'edit') => {
  if (!userRole) return false;
  if (userRole === 'OWNER') return true;
  if (action === 'delete') return false;
  if (isDailyClosed) return false;
  return ['MARKETING_MANAGER', 'ACCOUNTANT', 'ADMIN'].includes(userRole);
};
