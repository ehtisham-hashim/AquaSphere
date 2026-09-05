import { Search, Loader2, Calendar, CheckCircle, AlertCircle, UserCheck } from 'lucide-react';
import { EXPENSE_CATEGORIES, getExpenseCategoryColor } from '../../constants/expenses';
import { useTenant } from '../../context/TenantContext';

export default function ExpensesTable({
  filteredExpenses = [],
  loading = false,
  selectedCategory = 'ALL',
  setSelectedCategory,
  search = '',
  setSearch,
  userName = ''
}) {
  const { isWadaana } = useTenant();

  return (
    <div className="space-y-3">
      {/* Category Filter Pills & Search */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
          <button
            onClick={() => setSelectedCategory('ALL')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all border shrink-0 ${
              selectedCategory === 'ALL'
                ? 'bg-brand-primary text-white border-transparent shadow-xs'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
          >
            All
          </button>
          {EXPENSE_CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all border shrink-0 ${
                selectedCategory === cat
                  ? 'bg-brand-primary text-white border-transparent shadow-xs'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative md:w-72 shrink-0">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16}/>
          <input 
            type="search" 
            placeholder="Search category or remarks..."
            className="input-base pl-9 text-xs py-2 w-full"
            value={search} 
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* ERP Expense Table */}
      <div className="table-container">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead>
              <tr>
                <th className="table-th">Date</th>
                <th className="table-th">Category</th>
                <th className="table-th">Amount</th>
                <th className="table-th">Description</th>
                <th className="table-th text-center">Receipt Status</th>
                <th className="table-th">Created By</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="6" className="p-10 text-center text-slate-400">
                    <Loader2 className={`w-6 h-6 animate-spin mx-auto mb-2 ${isWadaana ? 'text-[#0ea5e9]' : 'text-emerald-600'}`} />
                    Loading expenses...
                  </td>
                </tr>
              ) : filteredExpenses.map(ex => (
                <tr key={ex.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="table-td text-slate-600 text-xs font-medium">
                    <div className="flex items-center gap-1.5">
                      <Calendar size={13} className="text-slate-400" />
                      {new Date(ex.createdAt).toLocaleDateString()}
                    </div>
                  </td>

                  <td className="table-td">
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${getExpenseCategoryColor(ex.category)}`}>
                      {ex.category}
                    </span>
                  </td>

                  <td className="table-td font-black font-mono text-brand-primary text-sm">
                    Rs. {Math.round(Number(ex.amount)).toLocaleString()}
                  </td>

                  <td className="table-td text-slate-700 text-xs max-w-[280px] truncate">
                    {ex.remarks || '—'}
                  </td>

                  <td className="table-td text-center">
                    {ex.receiptUrl ? (
                      <a 
                        href={ex.receiptUrl} 
                        target="_blank" 
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs text-brand-primary hover:underline font-bold bg-brand-light px-2.5 py-0.5 rounded-lg border border-brand-light"
                      >
                        <CheckCircle size={13} className="text-brand-primary" /> View Receipt
                      </a>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs text-rose-600 bg-rose-50 px-2 py-0.5 rounded-lg border border-rose-200 font-bold">
                        <AlertCircle size={13} /> Missing
                      </span>
                    )}
                  </td>

                  <td className="table-td text-xs font-semibold text-slate-700">
                    <div className="flex items-center gap-1.5">
                      <UserCheck size={13} className="text-slate-400" />
                      {ex.createdBy?.name || userName || 'System'}
                    </div>
                  </td>
                </tr>
              ))}

              {!loading && filteredExpenses.length === 0 && (
                <tr>
                  <td colSpan="6" className="p-10 text-center text-slate-400 text-sm">
                    No matching expense logs found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
