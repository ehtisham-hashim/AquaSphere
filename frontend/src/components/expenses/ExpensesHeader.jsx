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
            {isWadaana ? 'Wadaana Expenses' : 'Operating Expenses'}
          </span>
        </div>
        <h2 className="text-xl font-bold text-slate-900 tracking-tight mt-1">Expenses Register</h2>
        <p className="text-slate-500 text-xs">Track operational plant expenses with receipt verification & category attribution</p>
      </div>

      <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
        <TimeframeDropdown 
          value={timeRange} 
          onChange={setTimeRange} 
          options={EXPENSE_TIMEFRAME_OPTIONS} 
        />

        <button 
          onClick={onExportCSV}
          disabled={!hasExpenses}
          className="btn-secondary"
        >
          <Download size={13} /> Export CSV
        </button>

        {canLogExpense && (
          <button 
            onClick={onOpenModal}
            className="btn-primary"
          >
            <Plus size={14}/> Log Expense
          </button>
        )}
      </div>
    </div>
  );
}
