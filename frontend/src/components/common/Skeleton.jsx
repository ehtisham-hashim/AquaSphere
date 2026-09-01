import React from 'react';

/**
 * Reusable table skeleton loader with pulse animation.
 * @param {{ rows?: number, cols?: number }} props
 */
export function TableSkeleton({ rows = 6, cols = 5 }) {
  return (
    <div className="w-full bg-white rounded-xl border border-slate-200 overflow-hidden animate-pulse">
      <div className="bg-slate-50 border-b border-slate-200 px-4 py-3 flex gap-4">
        {Array.from({ length: cols }).map((_, i) => (
          <div key={i} className="h-4 bg-slate-200 rounded flex-1"></div>
        ))}
      </div>
      <div className="divide-y divide-slate-100">
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} className="px-4 py-3.5 flex items-center gap-4">
            {Array.from({ length: cols }).map((_, c) => (
              <div
                key={c}
                className={`h-4 bg-slate-100 rounded ${
                  c === 0 ? 'w-1/4' : c === cols - 1 ? 'w-1/6' : 'flex-1'
                }`}
              ></div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Reusable stats/KPI card skeleton loader with pulse animation.
 * @param {{ count?: number }} props
 */
export function CardSkeleton({ count = 4 }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-pulse">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div className="h-3 bg-slate-200 rounded w-24"></div>
            <div className="w-8 h-8 bg-slate-100 rounded-lg"></div>
          </div>
          <div className="h-7 bg-slate-200 rounded w-32"></div>
          <div className="h-3 bg-slate-100 rounded w-20"></div>
        </div>
      ))}
    </div>
  );
}
