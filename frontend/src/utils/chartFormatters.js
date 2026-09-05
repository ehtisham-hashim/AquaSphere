/**
 * Utility number and currency formatters for Recharts and KPI cards.
 */

export const formatCompactCurrency = (val) => {
  const num = Number(val || 0);
  if (Math.abs(num) >= 1_000_000) return `Rs. ${(num / 1_000_000).toFixed(1)}M`;
  if (Math.abs(num) >= 1_000) return `Rs. ${(num / 1_000).toFixed(0)}k`;
  return `Rs. ${num.toLocaleString()}`;
};

export const formatCompactNumber = (val) => {
  const num = Number(val || 0);
  if (Math.abs(num) >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (Math.abs(num) >= 1_000) return `${(num / 1_000).toFixed(1)}k`;
  return num.toLocaleString();
};

export const formatCurrency = (val) => {
  const num = Number(val || 0);
  return `Rs. ${num.toLocaleString('en-PK', { maximumFractionDigits: 0 })}`;
};
