import React from 'react';

// ponytail: unified status badge mapping without heavy css frameworks
const STATUS_CONFIGS = {
  // Delivery statuses
  DELIVERED: { label: 'Delivered', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  PENDING: { label: 'Pending', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
  CANCELLED: { label: 'Cancelled', bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200' },
  
  // Payment statuses
  PAID: { label: 'Paid', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  UNPAID: { label: 'Unpaid', bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200' },
  PARTIAL: { label: 'Partial', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },

  // General active/inactive
  ACTIVE: { label: 'Active', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  INACTIVE: { label: 'Inactive', bg: 'bg-slate-100', text: 'text-slate-600', border: 'border-slate-200' },
  ARCHIVED: { label: 'Archived', bg: 'bg-slate-100', text: 'text-slate-600', border: 'border-slate-200' },

  // Inventory
  LOW_STOCK: { label: 'Low Stock', bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200' },
  IN_STOCK: { label: 'In Stock', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  OUT_OF_STOCK: { label: 'Out of Stock', bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200' }
};

export default function StatusBadge({ status, label, className = '' }) {
  const normalized = String(status || '').toUpperCase().trim();
  const config = STATUS_CONFIGS[normalized] || {
    label: label || status || 'Unknown',
    bg: 'bg-slate-100',
    text: 'text-slate-700',
    border: 'border-slate-200'
  };

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider border ${config.bg} ${config.text} ${config.border} ${className}`}>
      {label || config.label}
    </span>
  );
}
