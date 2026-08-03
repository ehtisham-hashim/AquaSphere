/**
 * Expenses Module Default Constants
 * Centralized configuration for expense categories and visual badge color mappings.
 */

export const EXPENSE_CATEGORIES = [
  'Fuel / Transport',
  'Salaries',
  'Electricity',
  'Plant Rent',
  'Vehicle Repairs',
  'Machine Repairs',
  'Maintenance',
  'Office Supplies',
  'Miscellaneous'
];

export const EXPENSE_CATEGORY_COLORS = {
  'Fuel / Transport': 'bg-orange-100 text-orange-800 border border-orange-200',
  'Fuel': 'bg-orange-100 text-orange-800 border border-orange-200',
  'Salaries': 'bg-blue-100 text-blue-800 border border-blue-200',
  'Electricity': 'bg-yellow-100 text-yellow-800 border border-yellow-200',
  'Plant Rent': 'bg-purple-100 text-purple-800 border border-purple-200',
  'Vehicle Repairs': 'bg-slate-100 text-slate-800 border border-slate-200',
  'Vehicle Repair': 'bg-slate-100 text-slate-800 border border-slate-200',
  'Machine Repairs': 'bg-red-100 text-red-800 border border-red-200',
  'Machine Repair': 'bg-red-100 text-red-800 border border-red-200',
  'Maintenance': 'bg-teal-100 text-teal-800 border border-teal-200',
  'Office Supplies': 'bg-indigo-100 text-indigo-800 border border-indigo-200',
  'Miscellaneous': 'bg-gray-100 text-gray-800 border border-gray-200',
  'Default': 'bg-emerald-100 text-emerald-800 border border-emerald-200'
};

/**
 * Helper function to safely resolve category badge color styling
 */
export const getExpenseCategoryColor = (category) => {
  return EXPENSE_CATEGORY_COLORS[category] || EXPENSE_CATEGORY_COLORS.Default;
};
