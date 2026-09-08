import React from 'react';

// ponytail: unified lightweight empty state, no heavy illustration libraries
export default function EmptyState({
  icon: Icon,
  title = 'No items found',
  description = 'There are currently no records to display.',
  action,
  className = ''
}) {
  return (
    <div className={`flex flex-col items-center justify-center p-8 sm:p-12 text-center bg-white rounded-xl border border-slate-200/80 shadow-2xs ${className}`}>
      {Icon && (
        <div className="w-11 h-11 rounded-xl bg-slate-100/80 text-slate-500 flex items-center justify-center mb-3">
          <Icon className="w-5 h-5" />
        </div>
      )}
      <h3 className="text-sm font-semibold text-slate-900 tracking-tight mb-1">
        {title}
      </h3>
      {description && (
        <p className="text-xs text-slate-500 max-w-sm mb-4 leading-relaxed">
          {description}
        </p>
      )}
      {action && <div>{action}</div>}
    </div>
  );
}
