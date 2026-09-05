import { Package, Flame } from 'lucide-react';

export default function InventoryStatusTab({ rawMaterials = [], productionBatches = [] }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Raw Materials Stock */}
      <div className="card-surface p-4 sm:p-5 space-y-3">
        <h3 className="text-xs font-bold text-slate-900 flex items-center gap-2 uppercase tracking-wider">
          <Package className="w-4 h-4 text-brand-primary" />
          Raw Materials & Stock Levels
        </h3>
        <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto pr-1">
          {rawMaterials.length === 0 ? (
            <p className="text-sm text-slate-400 py-4 text-center">No raw materials recorded yet.</p>
          ) : (
            rawMaterials.map((item) => (
              <div key={item.id} className="py-3 flex items-center justify-between text-sm">
                <div>
                  <span className="font-semibold text-slate-800">{item.name}</span>
                  <span className="text-xs text-slate-400 ml-2">Reorder: {item.reorderLevel} {item.unit}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`font-mono font-bold ${item.isLow ? 'text-rose-600' : 'text-slate-900'}`}>
                    {item.cachedQty} {item.unit}
                  </span>
                  {item.isLow && (
                    <span className="px-2 py-0.5 bg-rose-50 border border-rose-200 text-rose-600 text-xs font-bold rounded-md">
                      LOW
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Today's Production Batches */}
      <div className="card-surface p-4 sm:p-5 space-y-3">
        <h3 className="text-xs font-bold text-slate-900 flex items-center gap-2 uppercase tracking-wider">
          <Flame className="w-4 h-4 text-amber-500" />
          Today&apos;s Production Batches
        </h3>
        <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto pr-1">
          {productionBatches.length === 0 ? (
            <p className="text-sm text-slate-400 py-4 text-center">No production logged today.</p>
          ) : (
            productionBatches.map((b) => (
              <div key={b.id} className="py-3 flex items-center justify-between text-sm">
                <div>
                  <span className="font-semibold text-slate-800">{b.outputItem || 'Production Batch'}</span>
                  <span className="text-xs font-mono text-slate-400 block">{b.shortId || `#${b.id.slice(0, 6).toUpperCase()}`}</span>
                </div>
                <div className="text-right">
                  <span className="font-semibold text-emerald-600 block">{b.goodYield || 0} Good</span>
                  {b.waste > 0 && <span className="text-xs text-rose-500 font-medium">{b.waste} Waste</span>}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
