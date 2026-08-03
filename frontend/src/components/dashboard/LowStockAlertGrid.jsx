import { AlertTriangle } from 'lucide-react';

export default function LowStockAlertGrid({ count, list }) {
  if (!count || count <= 0) return null;

  return (
    <section className="bg-amber-50 border border-amber-200 rounded-2xl p-6 shadow-sm">
      <div className="flex items-center gap-3 mb-3 text-amber-800">
        <AlertTriangle size={24} className="shrink-0 text-amber-600" />
        <div>
          <h3 className="text-base font-bold">Low Stock Raw Materials Warning</h3>
          <p className="text-xs text-amber-700">
            {count} material(s) below reorder threshold. Log purchases to refill inventory.
          </p>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-4">
        {list?.map(mat => (
          <div key={mat.id} className="bg-white p-3.5 rounded-xl border border-amber-100 flex justify-between items-center shadow-xs">
            <div>
              <div className="font-bold text-slate-800 text-sm">{mat.name}</div>
              <div className="text-xs text-slate-400">Reorder Level: {mat.reorderLevel} {mat.unit}</div>
            </div>
            <span className="text-sm font-black text-rose-600 px-2.5 py-1 bg-rose-50 rounded-lg">
              {mat.cachedQty} {mat.unit}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
