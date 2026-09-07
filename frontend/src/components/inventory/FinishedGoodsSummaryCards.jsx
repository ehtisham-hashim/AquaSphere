import { Warehouse, Factory, ShieldCheck } from 'lucide-react';

export default function FinishedGoodsSummaryCards({ items = [], tenant = 'aquasphere' }) {
  const isWadaana = tenant === 'wadaana';

  if (!isWadaana) {
    const fgList = items.filter(i => i.type === 'FINISHED_GOOD' || !i.type);

    const totalUnits = fgList.reduce((acc, i) => acc + Number(i.cachedQty || 0), 0);

    // Status Helper
    const getBadge = (qty, reorder = 20) => {
      if (qty <= 0) return { label: 'Out of Stock', dot: 'bg-rose-500', text: 'text-rose-700' };
      if (qty <= reorder) return { label: 'Low Stock', dot: 'bg-amber-500', text: 'text-amber-700' };
      return { label: 'Normal', dot: 'bg-emerald-500', text: 'text-emerald-700' };
    };

    return (
      <div className="space-y-4">
        {/* Top Finished Goods Operational Summary Row */}
        <div className="card-surface p-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="space-y-1">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-slate-600" />
              Operational Summary
            </h3>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600">
              {fgList.map((item, idx) => (
                <span key={item.id || idx} className="flex items-center gap-1">
                  {item.name}: <strong className="text-slate-800 font-mono font-bold text-sm">{Math.round(Number(item.cachedQty || 0)).toLocaleString()}</strong>
                </span>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">Total Finished Stock</span>
              <span className="text-xl font-mono font-bold text-brand">{Math.round(totalUnits).toLocaleString()} <span className="text-xs font-normal text-slate-400 font-sans">Units</span></span>
            </div>
          </div>
        </div>

        {/* Dynamic Finished Goods Cards with Location Breakdown */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {fgList.map((item, idx) => {
            const total = Number(item.cachedQty || 0);
            const fac = Number(item.factoryQty || 0);
            const wh = Number(item.warehouseQty || 0);
            const effectiveFactory = (fac === 0 && wh === 0) ? total : fac;
            const effectiveWarehouse = (fac === 0 && wh === 0) ? 0 : wh;
            const status = getBadge(total, Number(item.reorderLevel || 20));

            return (
              <div key={item.id || idx} className="card-surface p-4 space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">
                      {item.name}
                    </span>
                    <div className="text-2xl font-mono font-bold text-slate-800">
                      {Math.round(total).toLocaleString()}{' '}
                      <span className="text-xs font-normal text-slate-400 font-sans">{item.unit || 'units'}</span>
                    </div>
                  </div>
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide border ${
                    status.label === 'Out of Stock' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                    status.label === 'Low Stock' ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`}></span>
                    {status.label}
                  </span>
                </div>

                <div className="flex items-center justify-between pt-2.5 border-t border-slate-100">
                  <div>
                    <div className="flex items-center gap-1 text-slate-400 mb-0.5">
                      <Factory size={12} className="text-slate-500" />
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Factory</span>
                    </div>
                    <div className="text-sm font-mono font-bold text-slate-800">{Math.round(effectiveFactory).toLocaleString()}</div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center justify-end gap-1 text-slate-400 mb-0.5">
                      <Warehouse size={12} className="text-brand" />
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-brand">Warehouse</span>
                    </div>
                    <div className="text-sm font-mono font-bold text-slate-900">{Math.round(effectiveWarehouse).toLocaleString()}</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Wadaana Cards (4 Single Preform Bottle Types with Location Breakdown)
  const pure05 = items.find(i => i.name.toLowerCase().includes('pure') && (i.name.toLowerCase().includes('0.5') || i.name.toLowerCase().includes('500ml')));
  const pure15 = items.find(i => i.name.toLowerCase().includes('pure') && (i.name.toLowerCase().includes('1.5') || i.name.toLowerCase().includes('1500ml')));
  const mix05  = items.find(i => i.name.toLowerCase().includes('mix') && (i.name.toLowerCase().includes('0.5') || i.name.toLowerCase().includes('500ml')));
  const mix15  = items.find(i => i.name.toLowerCase().includes('mix') && (i.name.toLowerCase().includes('1.5') || i.name.toLowerCase().includes('1500ml')));

  const cards = [
    { name: '0.5L Pure Bottle', item: pure05 },
    { name: '1.5L Pure Bottle', item: pure15 },
    { name: '0.5L Mix Bottle', item: mix05 },
    { name: '1.5L Mix Bottle', item: mix15 }
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
      {cards.map((c, idx) => {
        const total = Number(c.item?.cachedQty || 0);
        const fac = Number(c.item?.factoryQty || 0);
        const wh = Number(c.item?.warehouseQty || 0);
        const factoryVal = (fac === 0 && wh === 0) ? total : fac;
        const warehouseVal = (fac === 0 && wh === 0) ? 0 : wh;

        // Low Stock Threshold: Below 100 bottles (< 100)
        const isLowStock = total < 100;

        return (
          <div key={idx} className="card-surface p-4 space-y-3">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">{c.name}</span>
                <div className="text-2xl font-mono font-bold text-slate-900">
                  {total.toLocaleString()} <span className="text-xs font-normal text-slate-400 font-sans">bottles</span>
                </div>
              </div>

              {isLowStock && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-rose-50 text-rose-700 border border-rose-200">
                  LOW STOCK
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2.5 border-t border-slate-100 text-xs">
              <div>
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-0.5">Factory</span>
                <span className="text-sm font-mono font-bold text-slate-800">{factoryVal.toLocaleString()}</span>
              </div>
              <div>
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-0.5">Warehouse</span>
                <span className="text-sm font-mono font-bold text-brand">{warehouseVal.toLocaleString()}</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
