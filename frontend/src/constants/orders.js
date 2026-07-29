/**
 * Orders Module Default Constants
 * Centralized configuration for order pricing, clean names, and statuses.
 */

export const DEFAULT_ORDER_PRICES = {
  '19l': 150,
  '0.5l': 250,
  '500ml': 250,
  '1.5l': 300,
  '1500ml': 300,
  'default': 100
};

export const ORDER_CLEAN_NAMES = {
  '0.5l': '0.5L Pack (12 bottles)',
  '500ml': '0.5L Pack (12 bottles)',
  '1.5l': '1.5L Pack (6 bottles)',
  '1500ml': '1.5L Pack (6 bottles)',
  '19l': '19L Refill'
};

export const ORDER_STATUSES = {
  PENDING: 'PENDING',
  PROCESSING: 'PROCESSING',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED'
};

export const PAYMENT_STATUSES = {
  UNPAID: 'UNPAID',
  PAID: 'PAID',
  PARTIAL: 'PARTIAL'
};

/**
 * Helper function to calculate default price for an item and customer
 */
export const getOrderPrice = (item, customer) => {
  if (!item || !item.name) return DEFAULT_ORDER_PRICES.default;
  const name = item.name.toLowerCase();
  if (name.includes('19l')) {
    return parseFloat(customer?.defaultPrice || 0) || DEFAULT_ORDER_PRICES['19l'];
  }
  if (name.includes('500ml') || name.includes('0.5l')) {
    return DEFAULT_ORDER_PRICES['0.5l'];
  }
  if (name.includes('1500ml') || name.includes('1.5l')) {
    return DEFAULT_ORDER_PRICES['1.5l'];
  }
  return DEFAULT_ORDER_PRICES.default;
};

/**
 * Helper function to format clean display name for items
 */
export const getOrderCleanName = (item) => {
  if (!item) return '';
  const itemName = typeof item === 'string' ? item : item.name || '';
  const name = itemName.toLowerCase();
  if (name.includes('500ml') || name.includes('0.5l')) return ORDER_CLEAN_NAMES['0.5l'];
  if (name.includes('1500ml') || name.includes('1.5l')) return ORDER_CLEAN_NAMES['1.5l'];
  if (name.includes('19l')) return ORDER_CLEAN_NAMES['19l'];
  return itemName;
};
