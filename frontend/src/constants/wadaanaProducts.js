/**
 * Wadaana & AquaSphere Order Items Catalog Constants
 * Centralized multi-tenant catalog hierarchy for order items and customer preferences.
 */

export const WADAANA_BOTTLE_CATALOG = [
  {
    id: 'PURE_05L',
    name: '0.5L Pure Preform Bottle (15g)',
    category: 'PURE',
    categoryLabel: 'PURE PREFORM BOTTLES',
    grammage: '15g',
    customerBuyField: 'buysPure05L',
    defaultPrice: 15,
    unit: 'Bottles'
  },
  {
    id: 'PURE_15L',
    name: '1.5L Pure Preform Bottle (30g)',
    category: 'PURE',
    categoryLabel: 'PURE PREFORM BOTTLES',
    grammage: '30g',
    customerBuyField: 'buysPure15L',
    defaultPrice: 30,
    unit: 'Bottles'
  },
  {
    id: 'MIX_05L',
    name: '0.5L Mix Preform Bottle (13g)',
    category: 'MIX',
    categoryLabel: 'MIX PREFORM BOTTLES',
    grammage: '13g',
    customerBuyField: 'buysMix05L',
    defaultPrice: 13,
    unit: 'Bottles'
  },
  {
    id: 'MIX_15L',
    name: '1.5L Mix Preform Bottle (27g)',
    category: 'MIX',
    categoryLabel: 'MIX PREFORM BOTTLES',
    grammage: '27g',
    customerBuyField: 'buysMix15L',
    defaultPrice: 27,
    unit: 'Bottles'
  }
];

export const AQUASPHERE_BOTTLE_CATALOG = [
  {
    id: 'BOTTLE_19L',
    name: '19L Refill Bottle',
    category: '19L',
    categoryLabel: '19L WATER BOTTLES',
    customerBuyField: 'buys19L',
    defaultPrice: 200,
    unit: 'Bottles'
  },
  {
    id: 'PACK_05L',
    name: '0.5L PET Pack (12 Bottles)',
    category: '0.5L',
    categoryLabel: '0.5L PET PACKS',
    customerBuyField: 'buys05LPet',
    defaultPrice: 360,
    unit: 'Packs'
  },
  {
    id: 'PACK_15L',
    name: '1.5L PET Pack (6 Bottles)',
    category: '1.5L',
    categoryLabel: '1.5L PET PACKS',
    customerBuyField: 'buys15LPet',
    defaultPrice: 300,
    unit: 'Packs'
  }
];

/**
 * Returns available catalog items for a given tenant and selected customer.
 * If customer preferences are selected, highlights them; otherwise returns full hierarchy catalog.
 */
export const getTenantCatalog = (tenant = 'aquasphere', selectedCustomer = null) => {
  const isWadaana = (tenant || 'aquasphere').toLowerCase() === 'wadaana';
  const baseCatalog = isWadaana ? WADAANA_BOTTLE_CATALOG : AQUASPHERE_BOTTLE_CATALOG;

  if (!selectedCustomer) {
    return baseCatalog.map(item => ({ ...item, isCustomerPreference: false }));
  }

  return baseCatalog.map(item => ({
    ...item,
    isCustomerPreference: Boolean(selectedCustomer[item.customerBuyField])
  }));
};
