import { Plus, Download } from 'lucide-react';
import { TimeframeDropdown } from '../ui';
import { useAuth } from '../../context/AuthContext';
import { useTenant } from '../../context/TenantContext';

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
  const { user } = useAuth();
  const { isWadaana } = useTenant();
  const canLogExpense = ['OWNER', 'ACCOUNTANT'].includes(user?.role);

  return (
    <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
      <div>
        <div className="flex items-center gap-2">
          <span className="badge-brand">
            {isWadaana ? 'WADAANA EXPENSES' : 'FINANCIAL LOGISTICS'}
          </span>
        </div>
        <h2 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight mt-1">Expenses Register</h2>
        <p className="text-slate-500 text-xs sm:text-sm">Track plant expenses with receipt verification & attribution</p>
      </div>

      <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
        <TimeframeDropdown 
          value={timeRange} 
          onChange={setTimeRange} 
          options={EXPENSE_TIMEFRAME_OPTIONS} 
        />

        <button 
          onClick={onExportCSV}
          disabled={!hasExpenses}
          className="btn-outline flex items-center gap-1.5 text-xs font-semibold py-2 px-3"
        >
          <Download size={14} /> Export CSV
        </button>

        {canLogExpense && (
          <button 
            onClick={onOpenModal}
            className="btn-primary flex items-center gap-1.5 text-xs font-bold py-2 px-3.5"
          >
            <Plus size={16}/> Log Expense
          </button>
        )}
      </div>
    </div>
  );
}
