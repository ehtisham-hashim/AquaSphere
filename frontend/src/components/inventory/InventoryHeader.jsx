import { Search, Flame, Droplets, ArrowLeftRight } from 'lucide-react';

export default function InventoryHeader({ 
  search, 
  onSearchChange, 
  tenant = 'aquasphere',
  _totalFinishedGoods = 0,
  _totalUnitsCount = 0,
  onOpenTransferModal
}) {
  const isWadaana = tenant === 'wadaana';

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-start gap-4">
          <div className={`p-3 rounded-xl ${isWadaana ? 'bg-sky-50 text-[#0ea5e9]' : 'bg-emerald-50 text-emerald-600'} shadow-inner`}>
            {isWadaana ? <Flame size={28} /> : <Droplets size={28} />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-black text-slate-800 tracking-tight">
                {isWadaana ? 'Wadaana Warehouse' : 'Finished Goods Inventory'}
              </h2>
              <span className={`text-xs px-2.5 py-0.5 rounded-full font-extrabold uppercase tracking-wider ${
                isWadaana ? 'bg-[#0ea5e9]/10 text-[#0ea5e9] border border-[#0ea5e9]/30' : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
              }`}>
                {isWadaana ? 'Bulk Bottles' : 'Stock Ledger'}
              </span>
            </div>
            <p className="text-slate-500 text-sm mt-1 font-medium">
              {isWadaana 
                ? 'Track real-time stock levels of Wadaana bulk single preform bottles across Factory Floor & Warehouse.'
                : 'Track real-time stock levels of AquaSphere 19L refills, 0.5L PET, and 1.5L PET across Factory Floor & Warehouse.'
              }
            </p>
          </div>
        </div>

        {onOpenTransferModal && (
          <button
            onClick={onOpenTransferModal}
            className={`${
              isWadaana 
                ? 'bg-[#0ea5e9] hover:bg-[#0284c7] shadow-sky-500/20' 
                : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20'
            } text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2.5 transition-all shadow-lg hover:shadow-xl active:scale-[0.98] self-start sm:self-auto text-sm`}
          >
            <ArrowLeftRight size={18} className="stroke-[2.5]" /> 
            <span>Transfer Stock</span>
          </button>
        )}
      </div>

      {/* Search Bar */}
      <div className="flex items-center justify-between gap-4 bg-slate-50/80 p-4 rounded-xl border border-slate-200/80">
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="search"
            placeholder="Search finished goods..."
            className={`w-full border border-slate-200 rounded-xl py-2.5 pl-11 pr-4 focus:outline-none focus:ring-2 ${
              isWadaana ? 'focus:ring-[#0ea5e9]/20 focus:border-[#0ea5e9]' : 'focus:ring-emerald-500/20 focus:border-emerald-500'
            } transition-all bg-white text-sm font-medium shadow-sm`}
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>
      </div>
    </div>
  );
}
