import { Search, Filter, Plus } from 'lucide-react';

export default function PurchasesFilters({ searchQuery, setSearchQuery, dateFilter, setDateFilter, onOpenModal, canAddPurchase }) {
  return (
    <div className="flex flex-col sm:flex-row gap-3 justify-between items-stretch sm:items-center bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
      <div className="flex flex-1 gap-3 items-center">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            type="text"
            placeholder="Search invoice no or vendor..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 outline-none focus:border-indigo-500 focus:bg-white transition-all"
          />
        </div>

        {/* Date Filter */}
        <div className="relative">
          <Filter className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="pl-10 pr-8 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:border-indigo-500 focus:bg-white transition-all cursor-pointer appearance-none"
          >
            <option value="ALL">All Time</option>
            <option value="TODAY">Today</option>
            <option value="WEEK">Last 7 Days</option>
            <option value="MONTH">This Month</option>
          </select>
        </div>
      </div>

      {canAddPurchase && (
        <button
          onClick={onOpenModal}
          className="px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-sm hover:shadow transition-all shrink-0"
        >
          <Plus size={18} />
          Record Purchase
        </button>
      )}
    </div>
  );
}
