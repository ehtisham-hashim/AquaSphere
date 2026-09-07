import { Plus, Search } from 'lucide-react';

export default function RawMaterialsHeader({ 
  search, 
  onSearchChange, 
  includeArchived, 
  onToggleArchived, 
  onOpenAdd, 
  tenant = 'aquasphere',
  isReadOnly = false
}) {
  const isWadaana = tenant === 'wadaana';

  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
      <div>
        <div className="flex items-center gap-2">
          <span className="badge-brand text-[10px] uppercase font-bold tracking-wider">
            {isWadaana ? 'Preform / kg' : 'Plant Stock'}
          </span>
        </div>
        <h2 className="text-xl font-bold text-slate-800 mt-1">
          {isWadaana ? 'Wadaana Preform Master' : 'Raw Material Inventory'}
        </h2>
        <p className="text-slate-500 text-xs">
          {isWadaana 
            ? 'Manage Pure & Mix preform stock (in kg) used for blowing 0.5L and 1.5L bottles'
            : 'Pre-defined bottling supplies, caps, labels, and packaging materials for plant operations'
          }
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2.5">
        <div className="relative min-w-[200px] sm:min-w-[240px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
          <input
            type="search"
            placeholder={isWadaana ? "Search preform type..." : "Search material name..."}
            className="input-base pl-9 text-xs py-2"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>

        <label className="flex items-center gap-1.5 text-xs text-slate-600 font-medium cursor-pointer select-none">
          <input
            type="checkbox"
            checked={includeArchived}
            onChange={(e) => onToggleArchived(e.target.checked)}
            className="rounded border-slate-300 accent-brand h-3.5 w-3.5"
          />
          <span>Show Archived</span>
        </label>

        {!isReadOnly && (
          <button
            onClick={onOpenAdd}
            className="btn-primary text-xs py-2 px-3 flex items-center gap-1.5"
          >
            <Plus size={15} /> 
            <span>{isWadaana ? 'Add Preform' : 'Add Material'}</span>
          </button>
        )}
      </div>
    </div>
  );
}
