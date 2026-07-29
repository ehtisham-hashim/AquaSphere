import React from 'react';

// ponytail: reusable surface card with clean structure, avoids redundant div scaffolding across views
export default function Card({ title, icon: Icon, iconColor = 'text-emerald-600', children, className = '', action }) {
  return (
    <div className={`bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden p-5 ${className}`}>
      {(title || Icon || action) && (
        <div className="flex items-center justify-between border-b border-slate-100 pb-3.5 mb-4">
          <div className="flex items-center gap-2.5 font-bold text-slate-800 text-base">
            {Icon && <Icon className={`w-5 h-5 ${iconColor}`} />}
            <span>{title}</span>
          </div>
          {action && <div>{action}</div>}
        </div>
      )}
      {children}
    </div>
  );
}
