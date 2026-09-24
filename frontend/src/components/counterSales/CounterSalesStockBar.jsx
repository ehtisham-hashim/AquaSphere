import { Package } from 'lucide-react';

export default function CounterSalesStockBar({ 
  items = [],
  loading = false
}) {
  // Ghost / Skeleton UI loader
  if (loading) {
    return (
      <div className="overflow-x-auto pb-1 scrollbar-thin">
        <div className="flex items-center gap-3">
          {[1, 2, 3, 4].map(idx => (
            <div 
              key={idx} 
              className="card-surface p-3 space-y-2 min-w-[200px] sm:min-w-[220px] shrink-0 animate-pulse border border-slate-200"
            >
              <div className="flex justify-between items-center">
                <div className="h-3 bg-slate-200 rounded w-24"></div>
                <div className="h-3 bg-slate-200 rounded w-10"></div>
              </div>
              <div className="h-6 bg-slate-200 rounded w-20"></div>
              <div className="h-2.5 bg-slate-200 rounded w-32"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // If no items available, return nothing (no hardcoded old data flash)
  if (!Array.isArray(items) || items.length === 0) {
    return null;
  }

  // Horizontal scrollable wrapper for all finished goods
  return (
    <div className="overflow-x-auto pb-1 scrollbar-thin">
      <div className="flex items-center gap-3">
        {items.map(item => {
          const total = Number(item.cachedQty || 0);
          const fac = Number(item.factoryQty || 0);
          const wh = Number(item.warehouseQty || 0);
          const factory = (fac === 0 && wh === 0) ? total : fac;
          const warehouse = (fac === 0 && wh === 0) ? 0 : wh;
          const price = Number(item.retailPrice || 0);

          return (
            <div 
              key={item.id} 
              className="card-surface p-3 space-y-1 min-w-[200px] sm:min-w-[220px] shrink-0 border border-slate-200 hover:border-slate-300 transition shadow-2xs"
            >
              <div className="flex items-center justify-between gap-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-brand flex items-center gap-1.5 truncate">
                  <Package size={13} className="shrink-0 text-brand" /> {item.name}
                </span>
                {price > 0 && (
                  <span className="text-[10px] font-mono font-bold text-slate-500 shrink-0">
                    Rs {price}
                  </span>
                )}
              </div>
              <div className="text-base sm:text-lg font-mono font-bold text-slate-800">
                {total.toLocaleString()} <span className="text-xs font-sans text-slate-500 font-semibold">{item.unit || 'units'}</span>
              </div>
              <span className="text-[10px] text-slate-400 font-medium block truncate">
                Factory: {factory} • Warehouse: {warehouse}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
