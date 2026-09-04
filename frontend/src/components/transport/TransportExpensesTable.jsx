import { Loader2, Calendar, Trash2, Car, Search } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

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
  vehicles = [],
  isWadaana = false
}) {
  const { user } = useAuth();
  const canDelete = user?.role === 'TRANSPORT_MANAGER';

  // Note: if row count exceeds 100, table virtualization (e.g. @tanstack/react-virtual) should be applied.

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
    <div className="space-y-4">
      {/* Filters Row */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        {/* Type Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {expenseTypes.map((type) => (
            <button
              key={type}
              onClick={() => setSelectedType && setSelectedType(type)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all border shrink-0 ${
                selectedType === type
                  ? isWadaana
                    ? 'bg-[#0ea5e9] text-white border-[#0ea5e9] shadow-xs'
                    : 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              {type === 'ALL' ? 'All Types' : type}
            </button>
          ))}
        </div>

        {/* Vehicle filter dropdown */}
        {vehicles.length > 0 && setSelectedVehicleId && (
          <div className="flex items-center gap-2">
            <select
              value={selectedVehicleId}
              onChange={(e) => setSelectedVehicleId(e.target.value)}
              className="border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-semibold bg-white text-slate-700 outline-none focus:border-emerald-500 shadow-xs"
            >
              <option value="ALL">All Vehicles</option>
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name} ({v.plateNumber})
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Search Input */}
      {setSearch && (
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="search"
            placeholder="Search by vehicle name, plate number, or note..."
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium outline-none focus:border-emerald-500 transition-colors shadow-xs"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      )}

      {/* ERP Transport Expense Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-600 uppercase tracking-wider">
              <tr>
                <th className="p-4">Date</th>
                <th className="p-4">Vehicle</th>
                <th className="p-4">Type</th>
                <th className="p-4">Period</th>
                <th className="p-4">Amount</th>
                <th className="p-4">Note</th>
                {canDelete && <th className="p-4 text-center">Actions</th>}
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
                  <td colSpan={canDelete ? 7 : 6} className="p-10 text-center text-slate-400">
                    No transport expenses found.
                  </td>
                </tr>
              ) : (
                expenses.map((ex) => (
                  <tr key={ex.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-4 text-slate-600 text-xs font-medium">
                      <div className="flex items-center gap-1.5">
                        <Calendar size={14} className="text-slate-400" />
                        {new Date(ex.date || ex.createdAt).toLocaleDateString()}
                      </div>
                    </td>

                    <td className="p-4 font-semibold text-slate-800 text-xs">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-lg bg-slate-100 text-slate-600">
                          <Car size={14} />
                        </div>
                        <div>
                          <p>{ex.vehicle?.name || 'Unknown'}</p>
                          <p className="text-[11px] font-mono text-slate-400 font-normal">
                            {ex.vehicle?.plateNumber || '—'}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="p-4">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${getTypeBadge(ex.type)}`}>
                        {ex.type}
                      </span>
                    </td>

                    <td className="p-4 text-xs font-medium text-slate-600">
                      {ex.period || 'MONTHLY'}
                    </td>

                    <td className={`p-4 font-black text-base ${isWadaana ? 'text-[#0ea5e9]' : 'text-emerald-700'}`}>
                      Rs. {Math.round(Number(ex.amount)).toLocaleString()}
                    </td>

                    <td className="p-4 text-slate-700 text-xs max-w-[240px] truncate">
                      {ex.note || '—'}
                    </td>

                    {canDelete && (
                      <td className="p-4 text-center">
                        <button
                          onClick={() => onDeleteExpense && onDeleteExpense(ex)}
                          title="Delete Expense"
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                        >
                          <Trash2 size={16} />
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
