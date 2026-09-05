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

export const getOrderPrice = (item, customer) => {
  if (!item) return 0;
  if (typeof item.price === 'number' || !isNaN(parseFloat(item.price))) return parseFloat(item.price);
  if (typeof item.defaultPrice === 'number') return item.defaultPrice;
  const name = String(item.name || '').toLowerCase();
  if (name.includes('19l')) return parseFloat(customer?.defaultPrice || 0) || DEFAULT_ORDER_PRICES['19l'];
  if (name.includes('pure') && name.includes('0.5')) return 15;
  if (name.includes('pure') && name.includes('1.5')) return 30;
  if (name.includes('mix') && name.includes('0.5')) return 13;
  if (name.includes('mix') && name.includes('1.5')) return 27;
  return DEFAULT_ORDER_PRICES.default;
};

/**
 * Helper function to format clean display name for items
 */
export const getOrderCleanName = (item) => {
  if (!item) return '';
  const itemName = typeof item === 'string' ? item : item.name || '';
  if (!itemName) return '';
  const name = itemName.toLowerCase().trim();
  // Keep original detailed product names intact
  if (name.includes('preform') || name.includes('bottle') || name.includes('pack')) return itemName;
  if (name === '0.5l' || name === '500ml') return '0.5L Pack (12 bottles)';
  if (name === '1.5l' || name === '1500ml') return '1.5L Pack (6 bottles)';
  if (name === '19l') return '19L Refill';
  return itemName;
};
