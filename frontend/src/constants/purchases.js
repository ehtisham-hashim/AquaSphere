/**
 * Purchases Module Constants
 * Clean, lightweight constants tailored for Pakistan water plant operations.
 */

export const DEFAULT_DELIVERED_LOCATION = 'FACTORY';

export const FULFILLMENT_STATUSES = [
  { value: 'RECEIVED', label: 'Received', color: 'emerald' },
  { value: 'PARTIALLY_RECEIVED', label: 'Partially Received', color: 'sky' },
  { value: 'PENDING', label: 'Pending', color: 'amber' },
  { value: 'CANCELLED', label: 'Cancelled', color: 'rose' }
];

export const PAYMENT_STATUSES = [
  { value: 'CREDIT', label: 'Vendor Khata (Credit)', color: 'rose' },
  { value: 'PAID', label: 'Paid in Cash', color: 'emerald' }
];

/** Safe helper to retrieve empty string default price without guessing rates */
export const getDefaultUnitPrice = () => '';
