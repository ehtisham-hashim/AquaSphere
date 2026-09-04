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
      <div className="space-y-6">
        {/* Top Finished Goods Operational Summary Banner */}
        <div className="py-6 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-slate-700" />
              Operational Summary
            </h3>
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-slate-600">
              {fgList.map((item, idx) => (
                <span key={item.id || idx} className="flex items-center gap-2">
                  {item.name}: <strong className="text-slate-900 font-bold text-lg">{Math.round(Number(item.cachedQty || 0)).toLocaleString()}</strong>
                </span>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-8">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block mb-0.5">Total Finished Stock</span>
              <span className="text-3xl font-bold text-slate-900">{Math.round(totalUnits).toLocaleString()} <span className="text-sm font-normal text-slate-500">Units</span></span>
            </div>
          </div>
        </div>

        {/* Dynamic Finished Goods Cards with Location Breakdown (Factory vs Warehouse) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {fgList.map((item, idx) => {
            const total = Number(item.cachedQty || 0);
            const fac = Number(item.factoryQty || 0);
            const wh = Number(item.warehouseQty || 0);
            const effectiveFactory = (fac === 0 && wh === 0) ? total : fac;
            const effectiveWarehouse = (fac === 0 && wh === 0) ? 0 : wh;
            const status = getBadge(total, Number(item.reorderLevel || 20));

            return (
              <div key={item.id || idx} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm transition-all hover:shadow-md">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">
                      {item.name}
                    </span>
                    <div className="text-3xl font-black text-slate-800 tracking-tight">
                      {Math.round(total).toLocaleString()}{' '}
                      <span className="text-xs font-normal text-slate-400">{item.unit || 'units'}</span>
                    </div>
                  </div>
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wide border ${
                    status.label === 'Out of Stock' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                    status.label === 'Low Stock' ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`}></span>
                    {status.label}
                  </span>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                  <div>
                    <div className="flex items-center gap-1.5 text-slate-400 mb-1">
                      <Factory size={13} className="text-slate-500" />
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Factory</span>
                    </div>
                    <div className="text-base font-bold text-slate-800">{Math.round(effectiveFactory).toLocaleString()}</div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center justify-end gap-1.5 text-slate-400 mb-1">
                      <Warehouse size={13} className="text-[#0ea5e9]" />
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#0ea5e9]">Warehouse</span>
                    </div>
                    <div className="text-base font-bold text-slate-900">{Math.round(effectiveWarehouse).toLocaleString()}</div>
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
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
      {cards.map((c, idx) => {
        const total = Number(c.item?.cachedQty || 0);
        const fac = Number(c.item?.factoryQty || 0);
        const wh = Number(c.item?.warehouseQty || 0);
        const factoryVal = (fac === 0 && wh === 0) ? total : fac;
        const warehouseVal = (fac === 0 && wh === 0) ? 0 : wh;

        // Low Stock Threshold: Below 100 bottles (< 100)
        const isLowStock = total < 100;

        return (
          <div key={idx} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block mb-1">{c.name}</span>
                <div className="text-3xl font-black text-slate-900 tracking-tight">
                  {total.toLocaleString()} <span className="text-xs font-normal text-slate-400">bottles</span>
                </div>
              </div>

              {isLowStock && (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-100 text-rose-800 border border-rose-200">
                  LOW STOCK
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-100 text-xs">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">Factory</span>
                <span className="text-sm font-bold text-slate-800">{factoryVal.toLocaleString()}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">Warehouse</span>
                <span className="text-sm font-bold text-sky-700">{warehouseVal.toLocaleString()}</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
