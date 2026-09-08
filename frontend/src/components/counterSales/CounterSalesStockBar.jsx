import { Package } from 'lucide-react';

export default function CounterSalesStockBar({ 
  items = [],
  full05L = 0, 
  loose05L = 0, 
  totalBottles05L = 0, 
  full15L = 0, 
  loose15L = 0, 
  totalBottles15L = 0, 
  available19LBottles = 0 
}) {
  // If dynamic items array is provided, render each finished good card dynamically
  if (Array.isArray(items) && items.length > 0) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {items.map(item => {
          const total = Number(item.cachedQty || 0);
          const factory = Number(item.factoryQty || 0);
          const warehouse = Number(item.warehouseQty || 0);
          const price = Number(item.retailPrice || 0);

          return (
            <div key={item.id} className="card-surface p-3 space-y-1">
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
              <span className="text-[10px] text-slate-400 font-medium block">
                Factory: {factory} • Warehouse: {warehouse}
              </span>
            </div>
          );
        })}
      </div>
    );
  }

  // Fallback layout
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      <div className="card-surface p-3.5 space-y-1">
        <span className="text-[11px] font-bold uppercase tracking-wider text-brand flex items-center gap-1.5">
          <Package size={13}/> 0.5L Finished Packs
        </span>
        <div className="text-base sm:text-lg font-mono font-bold text-slate-800">
          {full05L.toLocaleString()} Packs {loose05L > 0 && <span className="text-xs text-brand font-semibold font-sans">+ {loose05L} loose</span>}
        </div>
        <span className="text-[10px] text-slate-400 font-medium block">Total: {totalBottles05L.toLocaleString()} bottles</span>
      </div>

      <div className="card-surface p-3.5 space-y-1">
        <span className="text-[11px] font-bold uppercase tracking-wider text-sky-600 flex items-center gap-1.5">
          <Package size={13}/> 1.5L Finished Packs
        </span>
        <div className="text-base sm:text-lg font-mono font-bold text-slate-800">
          {full15L.toLocaleString()} Packs {loose15L > 0 && <span className="text-xs text-sky-600 font-semibold font-sans">+ {loose15L} loose</span>}
        </div>
        <span className="text-[10px] text-slate-400 font-medium block">Total: {totalBottles15L.toLocaleString()} bottles</span>
      </div>

      <div className="card-surface p-3.5 space-y-1">
        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
          <Package size={13}/> 19L Refill Bottles
        </span>
        <div className="text-base sm:text-lg font-mono font-bold text-slate-800">{available19LBottles.toLocaleString()} Bottles</div>
        <span className="text-[10px] text-slate-400 font-medium block">Finished Goods Stock</span>
      </div>
    </div>
  );
}
