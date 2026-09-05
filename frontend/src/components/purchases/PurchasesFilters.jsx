import { Search, Filter, Plus } from 'lucide-react';

export default function PurchasesFilters({ searchQuery, setSearchQuery, dateFilter, setDateFilter, onOpenModal, canAddPurchase }) {
  return (
    <div className="card-surface p-3 flex flex-col sm:flex-row gap-3 justify-between items-stretch sm:items-center">
      <div className="flex flex-1 gap-2.5 items-center">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
          <input
            type="text"
            placeholder="Search invoice no or vendor..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input-base pl-9"
          />
        </div>

        {/* Date Filter */}
        <div className="relative w-40 shrink-0">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={15} />
          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="select-base pl-9"
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
          className="btn-primary shrink-0"
        >
          <Plus size={16} />
          <span>Record Purchase</span>
        </button>
      )}
    </div>
  );
}
