/**
 * PRODUCT MAPPINGS & UNIT CONVERSIONS
 * Standardized product definitions for AquaSphere and Wadaana
 * Use these constants across all controllers to ensure consistency
 */

// ============================================
// AQUASPHERE PRODUCT MAPPINGS
// ============================================
export const AQUASPHERE_PRODUCTS = {
  // 0.5L PET Bottles
  PACK_05L: {
    bottlesPerPack: 12,
    litresPerBottle: 0.75,   // 750ml treated water per 500ml bottle (owner specs)
    litresPerPack: 9.0,      // 12 bottles × 0.75L
    unit: 'packs'
  },
  SINGLE_05L: {
    bottlesPerPack: 12,      // Used for pack conversion
    litresPerBottle: 0.75,
    unit: 'bottles'
  },

  // 1.5L PET Bottles
  PACK_15L: {
    bottlesPerPack: 6,
    litresPerBottle: 2.0,    // 2000ml treated water per 1500ml bottle (owner specs)
    litresPerPack: 12.0,     // 6 bottles × 2.0L
    unit: 'packs'
  },
  SINGLE_15L: {
    bottlesPerPack: 6,       // Used for pack conversion
    litresPerBottle: 2.0,
    unit: 'bottles'
  },

  // 19L Refill Bottles
  BOTTLE_19L: {
    bottlesPerPack: 1,       // No packing
    litresPerBottle: 24.0,   // 24L treated water per 19L bottle (owner specs)
    unit: 'bottles'
  },

  // Custom Products (manual entry)
  CUSTOM: {
    bottlesPerPack: 1,
    litresPerBottle: 1.0,    // User defines manually
    unit: 'units'
  }
};

// ============================================
// WADAANA PRODUCT MAPPINGS
// ============================================
export const WADAANA_PRODUCTS = {
  // Pure 0.5L
  PURE_05L: {
    bottlesPerPack: 12,
    litresPerBottle: 0.5,
    litresPerPack: 6.0,
    unit: 'bottles'
  },

  // Pure 1.5L
  PURE_15L: {
    bottlesPerPack: 6,
    litresPerBottle: 1.5,
    litresPerPack: 9.0,
    unit: 'bottles'
  },

  // Mix 0.5L
  MIX_05L: {
    bottlesPerPack: 12,
    litresPerBottle: 0.5,
    litresPerPack: 6.0,
    unit: 'bottles'
  },

  // Mix 1.5L
  MIX_15L: {
    bottlesPerPack: 6,
    litresPerBottle: 1.5,
    litresPerPack: 9.0,
    unit: 'bottles'
  }
};

// ============================================
// 19L BOTTLE SPECIFICATIONS
// ============================================
export const BOTTLE_19L_SPECS = {
  // Security Deposit
  SECURITY_RATE: 1000,     // Rs. 1000 per bottle

  // Mineral Consumption (Owner specs)
  WATER_PER_BOTTLE: 24,    // 24L treated water per 19L bottle
  WATER_PER_MINERAL_SET: 15141,  // 15,141L treated water per full mineral set

  // Mineral Set Composition (ratios)
  MINERALS: {
    CALCIUM: { factor: 2, searchKeywords: ['calcium'] },
    MAGNESIUM: { factor: 1, searchKeywords: ['magnesium'] },
    SODIUM: { factor: 0.5, searchKeywords: ['sodium'] }
  },

  // Cap Deduction
  CAPS_PER_BOTTLE: 1,
  CAP_SEARCH_KEYWORDS: ['large cap', 'big cap', '19l cap', 'big 19l']
};

// ============================================
// SHRINK WRAP CONSUMPTION RATES
// ============================================
export const SHRINK_WRAP = {
  // 0.5L Pack: 1 kg = 44 packs (12 bottles each)
  PER_PACK_05L: 1 / 44,      // ≈ 0.02273 kg per pack

  // 1.5L Pack: 1 kg = 40 packs (6 bottles each)
  PER_PACK_15L: 1 / 40,      // = 0.025 kg per pack

  SEARCH_KEYWORDS: ['shrink', 'wrap']
};

/**
 * Get product definition by type for AquaSphere
 * @param {string} productType - Product type enum value
 * @returns {object} Product specs
 */
export const getAquaSphereProduct = (productType) => {
  return AQUASPHERE_PRODUCTS[productType] || AQUASPHERE_PRODUCTS.CUSTOM;
};

/**
 * Get product definition by type for Wadaana
 * @param {string} productType - Product type enum value
 * @returns {object} Product specs
 */
export const getWadaanaProduct = (productType) => {
  return WADAANA_PRODUCTS[productType] || null;
};

/**
 * Calculate litres from product type and quantity
 * @param {string} productType - Product type enum
 * @param {number} quantity - Quantity sold/ordered
 * @param {string} tenant - 'aquasphere' or 'wadaana'
 * @returns {number} Total litres
 */
export const calculateLitres = (productType, quantity, tenant = 'aquasphere') => {
  const product = tenant === 'wadaana' 
    ? getWadaanaProduct(productType)
    : getAquaSphereProduct(productType);

  if (!product) return quantity; // Fallback

  if (productType.includes('PACK')) {
    return product.litresPerPack * quantity;
  } else {
    return product.litresPerBottle * quantity;
  }
};

/**
 * Convert bottles to packs (with remainder)
 * @param {number} bottles - Number of bottles
 * @param {number} bottlesPerPack - Bottles in one pack
 * @returns {object} { packs, looseBottles, openPackLeftover }
 */
export const convertBottlesToPacks = (bottles, bottlesPerPack) => {
  const packs = Math.floor(bottles / bottlesPerPack);
  const looseBottles = bottles % bottlesPerPack;
  const openPackLeftover = (bottlesPerPack - looseBottles) % bottlesPerPack;

  return { packs, looseBottles, openPackLeftover };
};

/**
 * Calculate mineral consumption for 19L bottles
 * @param {number} bottleQty - Number of 19L bottles
 * @returns {object} Mineral quantities { calcium, magnesium, sodium, mineralSetFraction }
 */
export const calculate19LMinerals = (bottleQty) => {
  const totalWater = bottleQty * BOTTLE_19L_SPECS.WATER_PER_BOTTLE;
  const mineralSetFraction = totalWater / BOTTLE_19L_SPECS.WATER_PER_MINERAL_SET;

  return {
    mineralSetFraction,
    calcium: mineralSetFraction * BOTTLE_19L_SPECS.MINERALS.CALCIUM.factor,
    magnesium: mineralSetFraction * BOTTLE_19L_SPECS.MINERALS.MAGNESIUM.factor,
    sodium: mineralSetFraction * BOTTLE_19L_SPECS.MINERALS.SODIUM.factor
  };
};
