import { Plus, Download, Fuel } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTenant } from '../../context/TenantContext';

export default function TransportExpensesHeader({
  onOpenModal,
  onExportCSV,
  hasExpenses = false
}) {
  const { user } = useAuth();
  const { isWadaana } = useTenant();
  const canAddExpense = user?.role === 'TRANSPORT_MANAGER';

  return (
    <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
      <div>
        <div className="flex items-center gap-2">
          <span className="badge-brand">
            {isWadaana ? 'WADAANA TRANSPORT' : 'TRANSPORT & LOGISTICS'}
          </span>
        </div>
        <h2 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight mt-1 flex items-center gap-2">
          <Fuel className="text-brand-primary" size={22} />
          Transport Expense Register
        </h2>
        <p className="text-slate-500 text-xs sm:text-sm">Track vehicle fuel, repairs, and recurring operational costs</p>
      </div>

      <div className="flex items-center gap-2.5">
        {onExportCSV && (
          <button
            onClick={onExportCSV}
            disabled={!hasExpenses}
            className="btn-outline flex items-center gap-1.5 text-xs py-2 px-3 disabled:opacity-50"
          >
            <Download size={14} /> Export CSV
          </button>
        )}

        {canAddExpense && (
          <button
            onClick={onOpenModal}
            className="btn-primary flex items-center gap-1.5 text-xs font-bold py-2 px-3.5"
          >
            <Plus size={16} /> Add Transport Expense
          </button>
        )}
      </div>
    </div>
  );
}
