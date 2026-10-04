import { Warehouse, Factory } from 'lucide-react';

export default function FinishedGoodsSummaryCards({ items = [], onEditItem = null }) {
  const fgList = items.filter(i => i.type === 'FINISHED_GOOD' || !i.type);

  const getBadge = (qty, reorder = 20) => {
    if (qty <= 0) return { label: 'Out of Stock', dot: 'bg-rose-500', text: 'text-rose-700' };
    if (qty <= reorder) return { label: 'Low Stock', dot: 'bg-amber-500', text: 'text-amber-700' };
    return { label: 'Normal', dot: 'bg-emerald-500', text: 'text-emerald-700' };
  };

  const formatQty = (qty, packSize, unit) => {
    if (packSize <= 1) return `${Math.round(qty).toLocaleString()} ${unit}`;
    const packs = Math.floor(qty / packSize);
    const loose = Math.round(qty % packSize);
    return `${packs.toLocaleString()}${loose > 0 ? `.${loose}` : ''} Pk`;
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {fgList.map((item, idx) => {
        const total = Number(item.cachedQty || 0);
        const fac = Number(item.factoryQty || 0);
        const wh = Number(item.warehouseQty || 0);
        const reorder = Number(item.reorderLevel || 0);
        const effectiveFac = (fac === 0 && wh === 0) ? total : fac;
        const effectiveWh = (fac === 0 && wh === 0) ? 0 : wh;
        const status = getBadge(total, reorder);

        const packSize = Number(item.packSize) || 1;
        const unit = item.unit || 'units';
        const isPack = packSize > 1;
        const packs = isPack ? Math.floor(total / packSize) : total;
        const loose = isPack ? Math.round(total % packSize) : 0;

        return (
          <div key={item.id || idx} className="card-surface p-4 space-y-2.5">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[11px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider block mb-0.5">
                  {item.name}
                </span>

                <div className="text-2xl font-mono font-black text-slate-900 tracking-tight">
                  {isPack
                    ? `${packs.toLocaleString()}${loose > 0 ? `.${loose}` : ''}`
                    : Math.round(total).toLocaleString()}{' '}
                  <span className="text-xs font-bold uppercase text-brand font-sans">
                    {isPack ? 'Packs' : unit}
                  </span>
                </div>
              </div>

              <div className="flex flex-col items-end gap-1">
                <button
                  type="button"
                  onClick={() => onEditItem && onEditItem(item)}
                  disabled={!onEditItem}
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold uppercase border transition ${
                    onEditItem ? 'hover:scale-105 cursor-pointer' : ''
                  } ${
                    status.label === 'Out of Stock' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                    status.label === 'Low Stock' ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  }`}
                  title={onEditItem ? 'Click to edit item' : undefined}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`}></span>
                  {status.label}
                </button>
                <span className="text-[10px] text-slate-400 font-medium">
                  Alert: {formatQty(reorder, packSize, unit)}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2.5 border-t border-slate-100">
              <div>
                <div className="flex items-center gap-1 text-slate-400 mb-0.5">
                  <Factory size={13} className="text-slate-500" />
                  <span className="text-[11px] font-semibold uppercase text-slate-500">Factory</span>
                </div>
                <div className="text-sm font-mono font-bold text-slate-800">
                  {formatQty(effectiveFac, packSize, unit)}
                </div>
              </div>
              <div className="text-right">
                <div className="flex items-center justify-end gap-1 text-slate-400 mb-0.5">
                  <Warehouse size={13} className="text-brand" />
                  <span className="text-[11px] font-semibold uppercase text-brand">Warehouse</span>
                </div>
                <div className="text-sm font-mono font-bold text-slate-900">
                  {formatQty(effectiveWh, packSize, unit)}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
