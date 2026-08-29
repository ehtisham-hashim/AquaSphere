import { Search, Loader2, Calendar, CheckCircle, AlertCircle, UserCheck } from 'lucide-react';
import { EXPENSE_CATEGORIES, getExpenseCategoryColor } from '../../constants/expenses';

export default function ExpensesTable({
  filteredExpenses = [],
  loading = false,
  selectedCategory = 'ALL',
  setSelectedCategory,
  search = '',
  setSearch,
  userName = ''
}) {
  return (
    <div className="space-y-4">
      {/* Category Filter Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <button
          onClick={() => setSelectedCategory('ALL')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all border shrink-0 ${
            selectedCategory === 'ALL'
              ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
          }`}
        >
          All Categories
        </button>
        {EXPENSE_CATEGORIES.map(cat => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all border shrink-0 ${
              selectedCategory === cat
                ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18}/>
        <input 
          type="search" 
          placeholder="Search by category or description remarks..."
          className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium outline-none focus:border-emerald-500 transition-colors shadow-xs"
          value={search} 
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* ERP Expense Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-600 uppercase tracking-wider">
              <tr>
                <th className="p-4">Date</th>
                <th className="p-4">Category</th>
                <th className="p-4">Amount</th>
                <th className="p-4">Description</th>
                <th className="p-4 text-center">Receipt Status</th>
                <th className="p-4">Created By</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="6" className="p-10 text-center text-slate-400">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-emerald-600" />
                    Loading expenses...
                  </td>
                </tr>
              ) : filteredExpenses.map(ex => (
                <tr key={ex.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="p-4 text-slate-600 text-xs font-medium">
                    <div className="flex items-center gap-1.5">
                      <Calendar size={14} className="text-slate-400" />
                      {new Date(ex.createdAt).toLocaleDateString()}
                    </div>
                  </td>

                  <td className="p-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${getExpenseCategoryColor(ex.category)}`}>
                      {ex.category}
                    </span>
                  </td>

                  <td className="p-4 font-black text-emerald-700 text-base">
                    Rs. {Math.round(Number(ex.amount)).toLocaleString()}
                  </td>

                  <td className="p-4 text-slate-700 text-xs max-w-[280px] truncate">
                    {ex.remarks || '—'}
                  </td>

                  <td className="p-4 text-center">
                    {ex.receiptUrl ? (
                      <a 
                        href={ex.receiptUrl} 
                        target="_blank" 
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs text-emerald-700 hover:text-emerald-800 font-bold hover:underline bg-emerald-50 px-3 py-1 rounded-lg border border-emerald-200"
                      >
                        <CheckCircle size={14} className="text-emerald-600" /> View Receipt
                      </a>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs text-rose-600 bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-200 font-bold">
                        <AlertCircle size={13} /> Missing
                      </span>
                    )}
                  </td>

                  <td className="p-4 text-xs font-semibold text-slate-700">
                    <div className="flex items-center gap-1.5">
                      <UserCheck size={14} className="text-slate-400" />
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
