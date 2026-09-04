import { Plus, Download, Fuel } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function TransportExpensesHeader({
  onOpenModal,
  onExportCSV,
  hasExpenses = false,
  tenant = 'aquasphere'
}) {
  const { user } = useAuth();
  const isWadaana = tenant === 'wadaana';
  const canAddExpense = user?.role === 'TRANSPORT_MANAGER';

  return (
    <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
      <div>
        <div className="flex items-center gap-2">
          <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
            isWadaana ? 'bg-sky-50 text-sky-700 border border-sky-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
          }`}>
            {isWadaana ? 'WADAANA TRANSPORT' : 'TRANSPORT & LOGISTICS'}
          </span>
        </div>
        <h2 className="text-2xl font-bold text-slate-800 mt-1 flex items-center gap-2">
          <Fuel className={isWadaana ? 'text-[#0ea5e9]' : 'text-emerald-600'} size={24} />
          Transport Expense Register
        </h2>
        <p className="text-slate-500 text-sm">Track vehicle fuel, repairs, and recurring operational costs</p>
      </div>

      <div className="flex items-center gap-3">
        {onExportCSV && (
          <button
            onClick={onExportCSV}
            disabled={!hasExpenses}
            className="px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition shadow-xs flex items-center gap-1.5 disabled:opacity-50"
          >
            <Download size={15} /> Export CSV
          </button>
        )}

        {canAddExpense && (
          <button
            onClick={onOpenModal}
            className={`px-4 py-2.5 ${
              isWadaana ? 'bg-[#0ea5e9] hover:bg-sky-500 shadow-sky-500/20' : 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/20'
            } text-white font-bold text-sm rounded-xl transition shadow-md flex items-center gap-2`}
          >
            <Plus size={18} /> Add Transport Expense
          </button>
        )}
      </div>
    </div>
  );
}
