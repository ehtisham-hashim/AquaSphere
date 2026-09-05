import React from 'react';

// ponytail: dictionary map for styling variants without heavy styling libraries
const styles = {
  brand: 'bg-brand-muted text-brand-primary border-brand-primary/30',
  emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  sky: 'bg-sky-50 text-sky-700 border-sky-200',
  blue: 'bg-blue-50 text-blue-700 border-blue-200',
  amber: 'bg-amber-50 text-amber-700 border-amber-200',
  red: 'bg-red-50 text-red-700 border-red-200',
  slate: 'bg-slate-100 text-slate-700 border-slate-200',
  cyan: 'bg-cyan-50 text-cyan-700 border-cyan-200',
  orange: 'bg-orange-50 text-orange-700 border-orange-200',
  indigo: 'bg-indigo-50 text-indigo-700 border-indigo-200',
};

export default function Badge({ children, variant = 'slate', className = '' }) {
  const badgeStyle = styles[variant] || styles.slate;
  return (
    <span className={`inline-flex items-center border text-[11px] px-2.5 py-0.5 rounded-full font-semibold ${badgeStyle} ${className}`}>
      {children}
    </span>
  );
}
