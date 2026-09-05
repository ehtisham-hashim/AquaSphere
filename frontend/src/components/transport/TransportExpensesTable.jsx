import { Loader2, Calendar, Trash2, Car, Search } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTenant } from '../../context/TenantContext';

export default function TransportExpensesTable({
  expenses = [],
  loading = false,
  onDeleteExpense,
  search = '',
  setSearch,
  selectedType = 'ALL',
  setSelectedType,
  selectedVehicleId = 'ALL',
  setSelectedVehicleId,
  vehicles = []
}) {
  const { user } = useAuth();
  const { isWadaana } = useTenant();
  const canDelete = user?.role === 'TRANSPORT_MANAGER';

  const expenseTypes = ['ALL', 'DAILY', 'REPAIRS', 'OTHER'];

  const getTypeBadge = (type) => {
    switch (type) {
      case 'DAILY':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'REPAIRS':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'OTHER':
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="space-y-3">
      {/* Filters Row */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        {/* Type Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {expenseTypes.map((type) => (
            <button
              key={type}
              onClick={() => setSelectedType && setSelectedType(type)}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all border shrink-0 ${
                selectedType === type
                  ? 'bg-brand-primary text-white border-transparent shadow-xs'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              {type === 'ALL' ? 'All Types' : type}
            </button>
          ))}
        </div>

        {/* Vehicle filter dropdown & search */}
        <div className="flex items-center gap-2">
          {vehicles.length > 0 && setSelectedVehicleId && (
            <select
              value={selectedVehicleId}
              onChange={(e) => setSelectedVehicleId(e.target.value)}
              className="select-base text-xs py-1.5"
            >
              <option value="ALL">All Vehicles</option>
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name} ({v.plateNumber})
                </option>
              ))}
            </select>
          )}

          {setSearch && (
            <div className="relative w-48 sm:w-60">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
              <input
                type="search"
                placeholder="Search note/plate..."
                className="input-base pl-8 text-xs py-1.5 w-full"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          )}
        </div>
      </div>

      {/* ERP Transport Expense Table */}
      <div className="table-container">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead>
              <tr>
                <th className="table-th">Date</th>
                <th className="table-th">Vehicle</th>
                <th className="table-th">Type</th>
                <th className="table-th">Period</th>
                <th className="table-th">Amount</th>
                <th className="table-th">Note</th>
                {canDelete && <th className="table-th text-center">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={canDelete ? 7 : 6} className="p-10 text-center text-slate-400">
                    <Loader2 className={`w-6 h-6 animate-spin mx-auto mb-2 ${isWadaana ? 'text-[#0ea5e9]' : 'text-emerald-600'}`} />
                    Loading transport expenses...
                  </td>
                </tr>
              ) : expenses.length === 0 ? (
                <tr>
                  <td colSpan={canDelete ? 7 : 6} className="p-10 text-center text-slate-400 text-sm">
                    No transport expenses found.
                  </td>
                </tr>
              ) : (
                expenses.map((ex) => (
                  <tr key={ex.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="table-td text-slate-600 text-xs font-medium">
                      <div className="flex items-center gap-1.5">
                        <Calendar size={13} className="text-slate-400" />
                        {new Date(ex.date || ex.createdAt).toLocaleDateString()}
                      </div>
                    </td>

                    <td className="table-td font-semibold text-slate-800 text-xs">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-lg bg-brand-light text-brand-primary">
                          <Car size={13} />
                        </div>
                        <div>
                          <p className="font-bold">{ex.vehicle?.name || 'Unknown'}</p>
                          <p className="text-[11px] font-mono text-slate-400 font-normal">
                            {ex.vehicle?.plateNumber || '—'}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="table-td">
                      <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold border ${getTypeBadge(ex.type)}`}>
                        {ex.type}
                      </span>
                    </td>

                    <td className="table-td text-xs font-medium text-slate-600">
                      {ex.period || 'MONTHLY'}
                    </td>

                    <td className="table-td font-black font-mono text-sm text-brand-primary">
                      Rs. {Math.round(Number(ex.amount)).toLocaleString()}
                    </td>

                    <td className="table-td text-slate-700 text-xs max-w-[240px] truncate">
                      {ex.note || '—'}
                    </td>

                    {canDelete && (
                      <td className="table-td text-center">
                        <button
                          onClick={() => onDeleteExpense && onDeleteExpense(ex)}
                          title="Delete Expense"
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                        >
                          <Trash2 size={15} />
                        </button>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
