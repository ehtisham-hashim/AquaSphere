import { Download } from 'lucide-react';

export default function CounterSalesHeader({ onExportCSV, hasSales }) {
  return (
    <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
      <div>
        <div className="flex items-center gap-2">
          <span className="badge-brand text-[10px] tracking-wider uppercase font-bold">
            Retail & Counter Dispatch
          </span>
        </div>
        <h2 className="text-xl font-bold text-slate-800 mt-1">Retail Spot & Counter Sales</h2>
        <p className="text-slate-500 text-xs">Sell finished goods (packs & loose bottles) with automatic stock deductions</p>
      </div>

      <div className="flex items-center gap-2">
        <button 
          onClick={onExportCSV}
          disabled={!hasSales}
          className="btn-outline text-xs py-2 px-3 disabled:opacity-50"
        >
          <Download size={14} /> Export CSV
        </button>
      </div>
    </div>
  );
}
