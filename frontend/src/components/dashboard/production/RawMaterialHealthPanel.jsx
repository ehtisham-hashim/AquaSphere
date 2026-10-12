import { Link } from 'react-router-dom';
import { AlertTriangle, ChevronRight } from 'lucide-react';

const formatNum = (val) => {
  const num = Number(val || 0);
  if (Number.isInteger(num)) return num.toLocaleString();
  return num.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 });
};

export default function RawMaterialHealthPanel({ sortedRawMaterials }) {
  return (
    <div className="space-y-4">
      {/* Raw Material Stock Health (Top 5 Closest to Reorder Level) */}
      <div className="card-surface p-4 space-y-3">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <AlertTriangle size={15} className="text-brand-primary" />
            <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider">Top 5 Reorder Alert Materials</h3>
          </div>
          <Link to="/raw-materials" className="text-xs font-bold text-brand-primary hover:underline flex items-center gap-0.5">
            View All <ChevronRight size={14} />
          </Link>
        </div>

        <div className="space-y-2">
          {(!sortedRawMaterials || sortedRawMaterials.length === 0) ? (
            <div className="text-xs text-slate-400 text-center py-6 font-medium">No raw materials configured.</div>
          ) : (
            sortedRawMaterials.map(mat => (
              <div key={mat.id} className="p-2.5 bg-slate-50 border border-slate-200/80 rounded-xl flex items-center justify-between text-xs">
                <div>
                  <div className="font-bold text-slate-800">{mat.name}</div>
                  <div className="text-[10px] text-slate-400">Reorder Level: {formatNum(mat.reorderLevel)} {mat.unit}</div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="font-black text-slate-900 text-xs">
                    {formatNum(mat.cachedQty)} <span className="text-[10px] font-normal text-slate-500">{mat.unit}</span>
                  </span>

                  {mat.status === 'OUT_OF_STOCK' && (
                    <span className="px-2 py-0.5 bg-rose-100 text-rose-800 border border-rose-200 font-bold text-[10px] rounded">
                      OUT
                    </span>
                  )}
                  {mat.status === 'LOW_STOCK' && (
                    <span className="px-2 py-0.5 bg-amber-100 text-amber-800 border border-amber-200 font-bold text-[10px] rounded">
                      LOW
                    </span>
                  )}
                  {mat.status === 'IN_STOCK' && (
                    <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold text-[10px] rounded">
                      OK
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
