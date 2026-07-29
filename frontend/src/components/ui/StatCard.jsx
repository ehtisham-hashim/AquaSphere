import React from 'react';

export default function StatCard({ title, value, subtitle, subtitleColor = 'text-slate-500', icon: Icon, iconBg = 'bg-blue-50', iconColor = 'text-blue-600' }) {
  return (
    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
      {Icon && (
        <div className={`p-3 rounded-xl ${iconBg} ${iconColor}`}>
          <Icon className="w-6 h-6" />
        </div>
      )}
      <div>
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{title}</p>
        <h3 className="text-2xl font-bold text-slate-900 mt-1">{value}</h3>
        {subtitle && <p className={`text-xs font-medium mt-0.5 ${subtitleColor}`}>{subtitle}</p>}
      </div>
    </div>
  );
}
