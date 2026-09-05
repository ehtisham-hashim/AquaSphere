import { Link } from 'react-router-dom';
import { Package, ChevronRight } from 'lucide-react';

const formatNum = (val) => {
  const num = Number(val || 0);
  if (Number.isInteger(num)) return num.toLocaleString();
  return num.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 });
};

export default function FinishedGoodsBreakdown({ finishedGoods }) {
  return (
    <div className="card-surface p-4 space-y-3">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Package size={15} className="text-brand-primary" />
          <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider">Finished Goods Stock Locations</h3>
        </div>
        <Link to="/inventory" className="text-xs font-bold text-brand-primary hover:underline flex items-center gap-0.5">
          Manage Stock <ChevronRight size={14} />
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {(finishedGoods || []).map(fg => {
          const isLow = Number(fg.factoryQty || 0) <= 20;
          return (
            <div key={fg.id} className={`border rounded-xl p-3.5 space-y-2 transition shadow-2xs ${
              isLow ? 'bg-amber-50/60 border-amber-200' : 'bg-slate-50/80 border-slate-200 hover:border-slate-300'
            }`}>
              <div className="flex justify-between items-start">
                <div className="font-bold text-slate-900 text-xs">{fg.name}</div>
                {isLow && (
                  <span className="px-1.5 py-0.2 bg-amber-600 text-white font-bold text-[9px] rounded uppercase">
                    LOW
                  </span>
                )}
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-slate-600">
                  <span>Factory Floor:</span>
                  <span className="font-bold text-slate-900 font-mono">{formatNum(fg.factoryQty)} {fg.unit}</span>
                </div>
                <div className="flex justify-between text-xs text-slate-600">
                  <span>Warehouse:</span>
                  <span className="font-semibold text-slate-700 font-mono">{formatNum(fg.warehouseQty)} {fg.unit}</span>
                </div>
              </div>
              <div className="pt-2 border-t border-slate-200 flex justify-between text-xs font-black text-slate-900">
                <span>Total Stock:</span>
                <span className="text-slate-900 font-mono">{formatNum(fg.cachedQty)} {fg.unit}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
