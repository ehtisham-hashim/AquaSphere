import { ArrowLeftRight, Plus } from 'lucide-react';

export default function InventoryHeader({ 
  tenant = 'aquasphere',
  onOpenTransferModal,
  onOpenAddModal
}) {
  const isWadaana = tenant === 'wadaana';

  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-1">
      <div>
        <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
          {isWadaana ? 'Wadaana Warehouse' : 'Finished Goods Inventory'}
        </h2>
      </div>

      <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
        {onOpenAddModal && (
          <button
            onClick={onOpenAddModal}
            className="btn-secondary"
          >
            <Plus size={17} />
            <span>Add Good</span>
          </button>
        )}

        {onOpenTransferModal && (
          <button
            onClick={onOpenTransferModal}
            className="btn-primary"
          >
            <ArrowLeftRight size={17} /> 
            <span>Transfer Stock</span>
          </button>
        )}
      </div>
    </div>
  );
}
