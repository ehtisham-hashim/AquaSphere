/**
 * Wadaana & AquaSphere Order Items Catalog Constants
 * Centralized multi-tenant catalog hierarchy for order items and customer preferences.
 */

export const WADAANA_BOTTLE_CATALOG = [
  {
    id: 'PURE_05L',
    name: '0.5L Pure Preform Bottle (15g)',
    displayName: '0.5L Pure',
    category: 'PURE',
    categoryLabel: 'PURE PREFORM BOTTLES',
    grammage: '15g',
    customerBuyField: 'buysPure05L',
    customerQtyField: 'qtyPure05L',
    defaultPrice: 15,
    unit: 'Bottles'
  },
  {
    id: 'PURE_15L',
    name: '1.5L Pure Preform Bottle (30g)',
    displayName: '1.5L Pure',
    category: 'PURE',
    categoryLabel: 'PURE PREFORM BOTTLES',
    grammage: '30g',
    customerBuyField: 'buysPure15L',
    customerQtyField: 'qtyPure15L',
    defaultPrice: 30,
    unit: 'Bottles'
  },
  {
    id: 'MIX_05L',
    name: '0.5L Mix Preform Bottle (13g)',
    displayName: '0.5L Mix',
    category: 'MIX',
    categoryLabel: 'MIX PREFORM BOTTLES',
    grammage: '13g',
    customerBuyField: 'buysMix05L',
    customerQtyField: 'qtyMix05L',
    defaultPrice: 13,
    unit: 'Bottles'
  },
  {
    id: 'MIX_15L',
    name: '1.5L Mix Preform Bottle (27g)',
    displayName: '1.5L Mix',
    category: 'MIX',
    categoryLabel: 'MIX PREFORM BOTTLES',
    grammage: '27g',
    customerBuyField: 'buysMix15L',
    customerQtyField: 'qtyMix15L',
    defaultPrice: 27,
    unit: 'Bottles'
  }
];

export const AQUASPHERE_BOTTLE_CATALOG = [
  {
    id: 'BOTTLE_19L',
    name: '19L Refill Bottle',
    displayName: '19L Bottle',
    category: '19L',
    categoryLabel: '19L WATER BOTTLES',
    customerBuyField: 'buys19L',
    customerQtyField: 'qty19L',
    defaultPrice: 200,
    unit: 'Bottles'
  },
  {
    id: 'PACK_05L',
    name: '0.5L PET (12 Bottles)',
    displayName: '0.5L PET',
    category: '0.5L',
    categoryLabel: '0.5L PET PACKS',
    customerBuyField: 'buys05LPet',
    customerQtyField: 'qty05LPet',
    defaultPrice: 360,
    unit: 'Packs'
  },
  {
    id: 'PACK_15L',
    name: '1.5L PET (6 Bottles)',
    displayName: '1.5L PET',
    category: '1.5L',
    categoryLabel: '1.5L PET PACKS',
    customerBuyField: 'buys15LPet',
    customerQtyField: 'qty15LPet',
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

/**
 * Returns empty product preference fields for new customers.
 */
export const getInitialCustomerProductFields = () => {
  const fields = {};
  [...AQUASPHERE_BOTTLE_CATALOG, ...WADAANA_BOTTLE_CATALOG].forEach((item) => {
    if (item.customerBuyField) fields[item.customerBuyField] = false;
    if (item.customerQtyField) fields[item.customerQtyField] = 0;
  });
  return fields;
};

/**
 * Extracts product preference fields from customer data for editing.
 */
export const extractCustomerProductFields = (customer = {}) => {
  const fields = {};
  [...AQUASPHERE_BOTTLE_CATALOG, ...WADAANA_BOTTLE_CATALOG].forEach((item) => {
    if (item.customerBuyField) fields[item.customerBuyField] = Boolean(customer[item.customerBuyField]);
    if (item.customerQtyField) fields[item.customerQtyField] = customer[item.customerQtyField] || 0;
  });
  return fields;
};

