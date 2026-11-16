import { Search, Loader2, Calendar, CheckCircle, AlertCircle, UserCheck, Car, Trash2 } from 'lucide-react';
import { EXPENSE_CATEGORIES, getExpenseCategoryColor } from '../../constants/expenses';
import { useTenant } from '../../context/TenantContext';
import { usePagination } from '../../hooks/usePagination';
import TablePagination from '../common/TablePagination';
import TableActionMenu from '../ui/TableActionMenu';

export default function ExpensesTable({
  filteredExpenses = [],
  loading = false,
  selectedCategory = 'ALL',
  setSelectedCategory,
  search = '',
  setSearch,
  userName = '',
  categories = EXPENSE_CATEGORIES,
  onDeleteExpense,
  canDelete = false
}) {
  const { isWadaana } = useTenant();
  const pagination = usePagination(filteredExpenses, 50, search);

  return (
    <div className="space-y-3 min-w-0 max-w-full">
      {/* Category Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
        <button
          onClick={() => setSelectedCategory('ALL')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border shrink-0 ${
            selectedCategory === 'ALL'
              ? 'bg-brand text-white border-transparent shadow-xs'
              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
          }`}
        >
          All
        </button>
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border shrink-0 ${
              selectedCategory === cat
                ? 'bg-brand text-white border-transparent shadow-xs'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Search Input (below category tabs) */}
      <div className="relative w-full sm:max-w-md">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16}/>
        <input 
          type="search" 
          placeholder="Search category or remarks..."
          className="input-base pl-9 text-xs py-2 w-full"
          value={search} 
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* ERP Expense Table */}
      <div className="table-container w-full max-w-full min-w-0">
        <div className="overflow-x-auto w-full max-w-full">
          <table className="w-full text-left text-sm">
            <thead>
              <tr>
                <th className="table-th">Date & Staff</th>
                <th className="table-th">Category & Vehicle</th>
                <th className="table-th">Description</th>
                <th className="table-th">Amount</th>
                <th className="table-th text-right sticky right-0 bg-slate-50 z-10">Receipt & Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="p-10 text-center text-slate-400">
                    <Loader2 className={`w-6 h-6 animate-spin mx-auto mb-2 ${isWadaana ? 'text-[#0ea5e9]' : 'text-emerald-600'}`} />
                    Loading expenses...
                  </td>
                </tr>
              ) : pagination.paginatedItems.map(ex => {
                const categoryLabel = String(ex.category || ex.type || 'MISC');
                const menuItems = [
                  ...(ex.receiptUrl ? [{
                    label: 'View Receipt',
                    icon: CheckCircle,
                    onClick: () => window.open(ex.receiptUrl, '_blank')
                  }] : []),
                  ...(canDelete ? [{
                    label: 'Delete Expense',
                    icon: Trash2,
                    onClick: () => onDeleteExpense(ex),
                    danger: true,
                    divider: !!ex.receiptUrl
                  }] : [])
                ];

                return (
                <tr key={ex.id} className="hover:bg-slate-50/80 transition-colors group">
                  <td className="table-td text-xs">
                    <div className="flex items-center gap-1.5 font-semibold text-slate-800">
                      <Calendar size={13} className="text-slate-400 shrink-0" />
                      {new Date(ex.createdAt).toLocaleDateString()}
                    </div>
                    <div className="flex items-center gap-1 text-[11px] text-slate-400 mt-0.5">
                      <UserCheck size={11} className="text-slate-400 shrink-0" />
                      <span>{ex.createdBy?.name || userName || 'System'}</span>
                    </div>
                  </td>

                  <td className="table-td">
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold inline-block ${getExpenseCategoryColor(categoryLabel)}`}>
                      {categoryLabel}
                    </span>
                    {ex.vehicle && (
                      <div className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded mt-1 border border-slate-200/60 max-w-full">
                        <Car size={11} className="text-brand-primary shrink-0" />
                        <span className="font-semibold text-slate-800 truncate">{ex.vehicle.name}</span>
                        <span className="text-slate-500 shrink-0">({ex.vehicle.plateNumber})</span>
                      </div>
                    )}
                  </td>

                  <td className="table-td text-slate-700 text-xs max-w-[260px]">
                    <div className="line-clamp-2 leading-relaxed" title={ex.remarks}>
                      {ex.remarks || '—'}
                    </div>
                  </td>

                  <td className="table-td font-bold text-slate-900 text-sm tabular-nums whitespace-nowrap">
                    Rs. {Math.round(Number(ex.amount)).toLocaleString()}
                  </td>

                  <td className="table-td text-right sticky right-0 bg-white group-hover:bg-slate-50/90 z-10">
                    <div className="flex items-center justify-end gap-1.5">
                      {ex.receiptUrl ? (
                        <a 
                          href={ex.receiptUrl} 
                          target="_blank" 
                          rel="noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex items-center gap-1 text-xs text-brand-primary hover:underline font-bold bg-brand-light px-2.5 py-1 rounded-lg border border-brand-light shrink-0"
                        >
                          <CheckCircle size={12} className="text-brand-primary" /> Receipt
                        </a>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] text-slate-400 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-200 shrink-0">
                          <AlertCircle size={11} /> No receipt
                        </span>
                      )}
                      {menuItems.length > 0 && (
                        <TableActionMenu items={menuItems} />
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}

              {!loading && filteredExpenses.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-10 text-center text-slate-400 text-sm">
                    No matching expense logs found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <TablePagination pagination={pagination} />
      </div>
    </div>
  );
}
