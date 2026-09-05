import { AlertTriangle } from 'lucide-react';

export default function LowStockAlertGrid({ count, list }) {
  if (!count || count <= 0) return null;

  return (
    <section className="bg-amber-50/70 border border-amber-200 rounded-2xl p-4 sm:p-5 shadow-xs">
      <div className="flex items-center gap-2.5 mb-3 text-amber-900">
        <AlertTriangle size={20} className="shrink-0 text-amber-600" />
        <div>
          <h3 className="text-sm font-bold">Low Stock Raw Materials Warning</h3>
          <p className="text-[11px] text-amber-800">
            {count} material(s) below reorder threshold. Log purchases to refill inventory.
          </p>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 mt-3">
        {list?.map(mat => (
          <div key={mat.id} className="bg-white p-3 rounded-xl border border-amber-200/60 flex justify-between items-center shadow-2xs">
            <div>
              <div className="font-bold text-slate-800 text-xs">{mat.name}</div>
              <div className="text-[11px] text-slate-500 font-mono">Threshold: {mat.reorderLevel} {mat.unit}</div>
            </div>
            <span className="text-xs font-mono font-black text-rose-600 px-2 py-0.5 bg-rose-50 border border-rose-200 rounded-md">
              {mat.cachedQty} {mat.unit}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
