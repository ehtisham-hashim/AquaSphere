import { Download } from 'lucide-react';

export default function CounterSalesHeader({ onExportCSV, hasSales }) {
  return (
    <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
      <div>
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            RETAIL & COUNTER DISPATCH
          </span>
        </div>
        <h2 className="text-2xl font-bold text-slate-800 mt-1">Retail Spot & Counter Sales</h2>
        <p className="text-slate-500 text-sm">Sell finished goods (Packs & Loose Bottles) with automatic stock deductions & open-pack leftovers</p>
      </div>

      <div className="flex items-center gap-3">
        <button 
          onClick={onExportCSV}
          disabled={!hasSales}
          className="px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition shadow-xs flex items-center gap-1.5 disabled:opacity-50"
        >
          <Download size={15} /> Export CSV
        </button>
      </div>
    </div>
  );
}
