import { Search, Plus } from 'lucide-react';
import { TimeframeDropdown } from '../ui';

const PURCHASE_TIMEFRAME_OPTIONS = [
  { value: 'ALL', label: 'All Time' },
  { value: 'TODAY', label: 'Today' },
  { value: '1_WEEK', label: '1 Week' },
  { value: '1_MONTH', label: '1 Month' },
  { value: '1_YEAR', label: '1 Year' }
];

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
        <TimeframeDropdown
          value={dateFilter}
          onChange={setDateFilter}
          options={PURCHASE_TIMEFRAME_OPTIONS}
        />
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
