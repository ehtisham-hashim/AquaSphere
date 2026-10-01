import { Warehouse, Factory } from 'lucide-react';

export default function FinishedGoodsSummaryCards({ items = [], onEditItem = null }) {
  const fgList = items.filter(i => i.type === 'FINISHED_GOOD' || !i.type);

  // Status Helper
  const getBadge = (qty, reorder = 20) => {
    if (qty <= 0) return { label: 'Out of Stock', dot: 'bg-rose-500', text: 'text-rose-700' };
    if (qty <= reorder) return { label: 'Low Stock', dot: 'bg-amber-500', text: 'text-amber-700' };
    return { label: 'Normal', dot: 'bg-emerald-500', text: 'text-emerald-700' };
  };

  const getPackSize = (item) => {
    if (item.packSize && Number(item.packSize) > 1) return Number(item.packSize);
    const name = (item.name || '').toLowerCase();
    if (name.includes('0.5l') || name.includes('0.5 pet') || name.includes('500ml')) return 12;
    if (name.includes('1.5l') || name.includes('1.5 pet') || name.includes('1500ml')) return 6;
    return Number(item.packSize) || 1;
  };

  return (
    <div className="space-y-4">
      {/* Dynamic Finished Goods Cards with Vertical Pack Display & Location Breakdown */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {fgList.map((item, idx) => {
          const total = Number(item.cachedQty || 0);
          const fac = Number(item.factoryQty || 0);
          const wh = Number(item.warehouseQty || 0);
          const reorder = Number(item.reorderLevel || 0);
          const effectiveFactory = (fac === 0 && wh === 0) ? total : fac;
          const effectiveWarehouse = (fac === 0 && wh === 0) ? 0 : wh;
          const status = getBadge(total, reorder);

          const packSize = getPackSize(item);
          const isPackItem = packSize > 1;
          const packs = isPackItem ? Math.floor(total / packSize) : 0;
          const loose = isPackItem ? Math.round(total % packSize) : total;

          return (
            <div key={item.id || idx} className="card-surface p-4 space-y-2.5">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[11px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider block mb-0.5">
                    {item.name}
                  </span>
                  
                  {isPackItem ? (
                    <div className="space-y-0.5 mt-0.5">
                      <div className="text-2xl font-mono font-black text-slate-900 tracking-tight">
                        {packs} <span className="text-sm font-bold uppercase tracking-wider text-brand">PACKS</span>
                      </div>
                      <div className="text-sm font-bold text-slate-600 font-mono">
                        {loose} {loose === 1 ? 'Bottle' : 'Bottles'}
                      </div>
                    </div>
                  ) : (
                    <div className="text-2xl font-mono font-bold text-slate-900 mt-0.5">
                      {Math.round(total).toLocaleString()}{' '}
                      <span className="text-xs font-normal text-slate-400 font-sans">{item.unit || 'Bottles'}</span>
                    </div>
                  )}
                </div>

                <div className="flex flex-col items-end gap-1">
                  <button
                    type="button"
                    onClick={() => onEditItem && onEditItem(item)}
                    disabled={!onEditItem}
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] sm:text-xs font-bold uppercase tracking-wide border transition ${
                      onEditItem ? 'hover:scale-105 hover:shadow-xs cursor-pointer' : ''
                    } ${
                      status.label === 'Out of Stock' ? 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100' :
                      status.label === 'Low Stock' ? 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100' : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                    }`}
                    title={onEditItem ? 'Click to edit reorder level & recipe' : undefined}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`}></span>
                    {status.label}
                  </button>
                  <span className="text-[10px] text-slate-400 font-medium">
                    Alert: {isPackItem ? `${Math.floor(reorder / packSize)} Pks` : `${reorder.toLocaleString()} ${item.unit || 'units'}`}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2.5 border-t border-slate-100">
                <div>
                  <div className="flex items-center gap-1 text-slate-400 mb-0.5">
                    <Factory size={13} className="text-slate-500" />
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Factory</span>
                  </div>
                  <div className="text-sm sm:text-base font-mono font-bold text-slate-800">
                    {isPackItem 
                      ? `${Math.floor(effectiveFactory / packSize)} Pk${effectiveFactory % packSize !== 0 ? ` + ${Math.round(effectiveFactory % packSize)} Btl` : ''}`
                      : Math.round(effectiveFactory).toLocaleString()
                    }
                  </div>
                </div>
                <div className="text-right">
                  <div className="flex items-center justify-end gap-1 text-slate-400 mb-0.5">
                    <Warehouse size={13} className="text-brand" />
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-brand">Warehouse</span>
                  </div>
                  <div className="text-sm sm:text-base font-mono font-bold text-slate-900">
                    {isPackItem 
                      ? `${Math.floor(effectiveWarehouse / packSize)} Pk${effectiveWarehouse % packSize !== 0 ? ` + ${Math.round(effectiveWarehouse % packSize)} Btl` : ''}`
                      : Math.round(effectiveWarehouse).toLocaleString()
                    }
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
