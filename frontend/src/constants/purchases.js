/**
 * Purchases Module Default Constants
 * Centralized configuration for default values, invoice prefixes, and material unit prices.
 */

export const INVOICE_CONFIG = {
  PREFIX: 'INV',
  GENERATE_INVOICE_NO: () => {
    const today = new Date();
    const dateStr = today.toISOString().split('T')[0].replace(/-/g, '');
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    return `INV-${dateStr}-${randomSuffix}`;
  }
};

export const DEFAULT_DELIVERED_LOCATION = 'FACTORY';

// Default material unit prices (in PKR)
// ORDER MATTERS: Specific compound names MUST come before generic volume strings (e.g., 'labels (500ml)' before '500ml')
export const DEFAULT_MATERIAL_UNIT_PRICES = {
  // 1. Labels
  'labels (500ml)': 1.2,
  'labels (1500ml)': 1.8,
  'label': 1.2,

  // 2. Caps
  'bottle caps': 2.5,
  'cap': 2.5,

  // 3. PET Bottles (Finished / Empty)
  'pet bottles (500ml)': 8.5,
  'pet bottles (1500ml)': 14.0,

  // 4. Preforms
  'preform (0.5l': 320.0, // per kg
  'preform (1.5l': 320.0, // per kg
  'preform': 320.0,

  // 5. Packaging & Consumables
  'shrink wrap': 350.0,
  'minerals': 450.0,
  'salts': 450.0,

  // 6. 19L Bottles
  '19l': 150.0,

  // 7. Generic volume fallbacks
  '0.5l': 8.5,
  '500ml': 8.5,
  '1.5l': 14.0,
  '1500ml': 14.0,

  'default': 10.0
};

/**
 * Helper function to retrieve default unit price for a given material name or material object
 */
export const getDefaultUnitPrice = (material = '') => {
  if (!material) return '';
  const materialName = typeof material === 'string' ? material : (material?.name || '');
  if (!materialName) return '';
  const lower = String(materialName).toLowerCase().trim();

  // Check specific keys first
  for (const [key, price] of Object.entries(DEFAULT_MATERIAL_UNIT_PRICES)) {
    if (key !== 'default' && lower.includes(key)) {
      return price.toString();
    }
  }
  return DEFAULT_MATERIAL_UNIT_PRICES.default.toString();
};

