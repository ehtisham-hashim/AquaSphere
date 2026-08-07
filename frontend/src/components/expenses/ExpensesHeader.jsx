import { Plus, Download, Clock } from 'lucide-react';

export default function ExpensesHeader({ 
  timeRange, 
  setTimeRange, 
  onExportCSV, 
  onOpenModal, 
  hasExpenses 
}) {
  return (
    <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
      <div>
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            FINANCIAL LOGISTICS
          </span>
        </div>
        <h2 className="text-2xl font-bold text-slate-800 mt-1">Operational Expense Register</h2>
        <p className="text-slate-500 text-sm">Track plant expenses with receipt verification & user attribution</p>
      </div>

      <div className="flex items-center gap-3">
        {/* Time Horizon Selector */}
        <div className="relative">
          <select
            value={timeRange}
            onChange={e => setTimeRange(e.target.value)}
            className="pl-9 pr-4 py-2 bg-white border border-slate-200 text-slate-800 rounded-xl text-xs font-bold outline-none focus:border-emerald-500 shadow-xs cursor-pointer"
          >
            <option value="MONTHLY">📅 Monthly (This Month)</option>
            <option value="QUARTERLY">📊 Quarterly (This Quarter)</option>
            <option value="YEARLY">🗓️ Yearly (This Year)</option>
            <option value="LIFETIME">♾️ Lifetime (All Time)</option>
            <option value="WEEKLY">📆 Weekly (This Week)</option>
            <option value="DAILY">📌 Daily (Today)</option>
          </select>
          <Clock className="w-4 h-4 text-emerald-600 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>

        <button 
          onClick={onExportCSV}
          disabled={!hasExpenses}
          className="px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition shadow-xs flex items-center gap-1.5 disabled:opacity-50"
        >
          <Download size={15} /> Export CSV
        </button>

        <button 
          onClick={onOpenModal}
          className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm rounded-xl transition shadow-md flex items-center gap-2"
        >
          <Plus size={18}/> Log Expense
        </button>
      </div>
    </div>
  );
}
