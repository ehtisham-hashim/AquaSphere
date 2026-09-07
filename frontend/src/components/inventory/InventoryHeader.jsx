import { Search, ArrowLeftRight, Plus } from 'lucide-react';

export default function InventoryHeader({ 
  search, 
  onSearchChange, 
  tenant = 'aquasphere',
  onOpenTransferModal,
  onOpenAddModal
}) {
  const isWadaana = tenant === 'wadaana';

  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
      <div>
        <div className="flex items-center gap-2">
          <span className="badge-brand text-[10px] uppercase font-bold tracking-wider">
            {isWadaana ? 'Bulk Bottles' : 'Stock Ledger'}
          </span>
        </div>
        <h2 className="text-xl font-bold text-slate-800 mt-1">
          {isWadaana ? 'Wadaana Warehouse' : 'Finished Goods Inventory'}
        </h2>
        <p className="text-slate-500 text-xs">
          {isWadaana 
            ? 'Track real-time stock levels of Wadaana bulk single preform bottles across Factory Floor & Warehouse'
            : 'Track real-time stock levels of AquaSphere 19L refills, 0.5L PET, and 1.5L PET across Factory Floor & Warehouse'
          }
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[200px] sm:min-w-[240px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
          <input
            type="search"
            placeholder="Search finished goods..."
            className="input-base pl-9 text-xs py-2"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>

        {onOpenAddModal && (
          <button
            onClick={onOpenAddModal}
            className="btn-outline text-xs py-2 px-3 flex items-center gap-1.5"
          >
            <Plus size={15} />
            <span>Add Good</span>
          </button>
        )}

        {onOpenTransferModal && (
          <button
            onClick={onOpenTransferModal}
            className="btn-primary text-xs py-2 px-3 flex items-center gap-1.5"
          >
            <ArrowLeftRight size={15} /> 
            <span>Transfer Stock</span>
          </button>
        )}
      </div>
    </div>
  );
}
