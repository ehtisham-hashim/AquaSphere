import { Plus, Download } from 'lucide-react';
import { TimeframeDropdown } from '../ui';

const EXPENSE_TIMEFRAME_OPTIONS = [
  { value: 'MONTHLY', label: 'Monthly' },
  { value: 'QUARTERLY', label: 'Quarterly' },
  { value: 'YEARLY', label: 'Yearly' },
  { value: 'LIFETIME', label: 'Lifetime' },
  { value: 'WEEKLY', label: 'Weekly' },
  { value: 'DAILY', label: 'Daily' }
];

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
        <TimeframeDropdown 
          value={timeRange} 
          onChange={setTimeRange} 
          options={EXPENSE_TIMEFRAME_OPTIONS} 
        />

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
